import sys, os, json, traceback, time, csv
from PyQt6 import QtWidgets, QtCore
from PyQt6.QtWidgets import QFileDialog, QMessageBox, QInputDialog
from PyQt6.QtCore import QObject, pyqtSignal, QThread
from datetime import datetime
from docai_utils import get_docai_client, process_file
from parse_utils import parse_ocr_text
from file_utils import file_hash, load_state, save_state, compress_image_if_needed, ensure_dir
from sheets_utils import get_sheets_service, append_row
from fx_utils import get_rate_fallback
from local_llm import load_local_model, clean_with_local_llm

CONFIG_PATH = "config.json"

def safe_load_config():
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            return cfg
    except Exception:
        return None

def prompt_config():
    app = QtWidgets.QApplication.instance() or QtWidgets.QApplication(sys.argv)
    cfg = {
        "service_account_file": "",
        "project_id": "",
        "location": "us",
        "processor_id": "",
        "google_sheet_id": "",
        "sheet_tab_name": "Receipts",
        "openai_api_key": "",
        "use_local_llm": True,
        "local_model_path": "models/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
        "max_image_mb": 10,
        "remember_last_folder": True,
        "state_file": "processed.json",
        "log_file": "run.log",
        "output_csv": "output.csv",
        "skip_compressed": True
    }
    QMessageBox.information(None, "Setup", "Enter required values. You can cancel but config will not be saved.")
    for key, label in [
        ("service_account_file", "Path to service account JSON (place in app folder)"),
        ("project_id", "GCP Project ID"),
        ("location", "Document AI Location (us)"),
        ("processor_id", "Processor ID"),
        ("google_sheet_id", "Google Sheet ID"),
        ("openai_api_key", "OpenAI API Key (optional)")
    ]:
        val, ok = QInputDialog.getText(None, label, label + ":", text=cfg.get(key, ""))
        if ok and val:
            cfg[key] = val
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)
    return cfg

cfg = safe_load_config() or prompt_config()
if not cfg:
    print("No config available. Exiting.")
    sys.exit(0)

CONFIG = cfg
STATE_FILE = CONFIG.get("state_file", "processed.json")
ensure_dir("archive")

# Load LLM at startup (before GUI)
_local_llm = None
if CONFIG.get("use_local_llm") and os.path.exists(CONFIG.get("local_model_path", "")):
    _local_llm = load_local_model(CONFIG.get("local_model_path"), lambda m: print("[LLM] " + m))


class Worker(QObject):
    """Worker that runs in a separate thread - communicates via signals ONLY"""
    log_signal = pyqtSignal(str)
    finished_signal = pyqtSignal()
    progress_signal = pyqtSignal(int, int)  # current, total
    
    def __init__(self, folder, config, processed_set, docai_client, local_llm):
        super().__init__()
        self.folder = folder
        self.config = config
        self.processed = processed_set.copy()  # Work with a copy
        self.docai_client = docai_client
        self.local_llm = local_llm
        self.sheets_service = None
        self.new_processed = set()  # Track newly processed files
        self._stop_requested = False
    
    def log(self, msg):
        """Thread-safe logging via signal"""
        self.log_signal.emit(str(msg))
    
    def stop(self):
        self._stop_requested = True
    
    def run(self):
        """Main processing - runs in worker thread"""
        try:
            self.log(f"Starting scan in: {self.folder}")
            new_count = 0
            out_csv = self.config.get("output_csv", "output.csv")
            
            # Initialize CSV with headers if it doesn't exist
            if not os.path.exists(out_csv):
                with open(out_csv, 'w', newline='', encoding='utf-8-sig') as f:
                    w = csv.writer(f)
                    w.writerow(["date", "vendor", "category", "currency", "amount", "amount_hkd", "file_name", "confidence", "notes"])
            
            # Get all files and sort
            files = []
            for fname in os.listdir(self.folder):
                if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
                    continue
                if self.config.get("skip_compressed", True) and ".compressed." in fname.lower():
                    continue
                path = os.path.join(self.folder, fname)
                if os.path.isfile(path):
                    files.append((fname, path))
            
            files.sort()
            total_files = len(files)
            self.log(f"Found {total_files} files to process")
            
            for idx, (fname, path) in enumerate(files):
                if self._stop_requested:
                    self.log("Scan cancelled by user")
                    break
                
                self.progress_signal.emit(idx + 1, total_files)
                
                h = file_hash(path)
                if h in self.processed:
                    self.log(f"Skipping already processed: {fname}")
                    continue
                
                self.log(f"Processing ({idx+1}/{total_files}): {fname}")
                
                # Process with Document AI
                try:
                    self.log(f"  Calling Document AI...")
                    doc = process_file(
                        self.docai_client,
                        self.config["project_id"],
                        self.config["location"],
                        self.config["processor_id"],
                        path
                    )
                    self.log(f"  Document AI completed")
                except Exception as e:
                    self.log(f"  [ERROR] Document AI: {e}")
                    continue
                
                # Initial parsing
                raw_text = getattr(doc, 'text', '') or ''
                self.log(f"  Extracted {len(raw_text)} chars")
                parsed = parse_ocr_text(raw_text)
                
                # LLM cleanup if available
                if self.config.get("use_local_llm") and self.local_llm and raw_text:
                    try:
                        self.log(f"  Running LLM cleanup...")
                        cleaned = clean_with_local_llm(self.local_llm, raw_text, parsed, self.log)
                        if isinstance(cleaned, dict):
                            for key in ["date", "vendor", "category", "total", "currency"]:
                                if cleaned.get(key):
                                    parsed[key] = cleaned[key]
                        self.log(f"  LLM cleanup done")
                    except Exception as e:
                        self.log(f"  [ERROR] LLM: {e}")
                
                # Currency and FX conversion
                currency = parsed.get("currency") or "USD"
                date_for_fx = parsed.get("date") or datetime.now().strftime("%Y-%m-%d")
                
                rate = None
                try:
                    if currency.upper() != "HKD":
                        rate = get_rate_fallback(currency.upper(), "HKD", date_for_fx)
                except Exception as e:
                    self.log(f"  [WARN] FX lookup failed: {e}")
                
                # Amount parsing
                amount_local = parsed.get("total") or parsed.get("amount") or ""
                amount_val = None
                try:
                    amount_str = str(amount_local).replace(',', '').replace('$', '').strip()
                    amount_val = float(amount_str)
                except:
                    pass
                
                # Convert to HKD
                amount_hkd = None
                if amount_val:
                    if currency.upper() == "HKD":
                        amount_hkd = round(amount_val, 2)
                    elif rate:
                        amount_hkd = round(amount_val * rate, 2)
                
                # Prepare row data
                row = [
                    str(parsed.get("date", "")).strip(),
                    str(parsed.get("vendor", "")).strip(),
                    str(parsed.get("category", "")).strip(),
                    str(currency).strip(),
                    str(amount_local).strip() if amount_local else "",
                    str(amount_hkd) if amount_hkd is not None else "",
                    fname,
                    str(parsed.get("confidence", "")).strip(),
                    str(raw_text)[:500].strip()
                ]
                
                # Write to CSV
                try:
                    with open(out_csv, 'a', newline='', encoding='utf-8-sig') as f:
                        csv.writer(f).writerow(row)
                    self.log(f"  Saved to CSV")
                except Exception as e:
                    self.log(f"  [ERROR] CSV write: {e}")
                
                # Append to Google Sheets
                if self.config.get("google_sheet_id") and os.path.exists(self.config.get("service_account_file", "")):
                    if not self.sheets_service:
                        try:
                            self.sheets_service = get_sheets_service(self.config.get("service_account_file"))
                            self.log("  Connected to Google Sheets")
                        except Exception as e:
                            self.log(f"  [ERROR] Sheets init: {e}")
                    
                    if self.sheets_service:
                        try:
                            append_row(
                                self.sheets_service,
                                self.config.get("google_sheet_id"),
                                self.config.get("sheet_tab_name", "Receipts"),
                                row
                            )
                            self.log(f"  Appended to Google Sheet")
                        except Exception as e:
                            self.log(f"  [ERROR] Sheets append: {e}")
                
                # Mark as processed
                self.new_processed.add(h)
                new_count += 1
                self.log(f"  Done: {fname}")
                
                # Small delay to avoid rate limiting
                time.sleep(0.3)
            
            self.log(f"Scan complete. {new_count} new items processed.")
        
        except Exception as e:
            self.log(f"[FATAL ERROR] {str(e)}")
            self.log(traceback.format_exc())
        
        finally:
            self.finished_signal.emit()


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Receipt Scanner - Document AI")
        self.resize(1280, 720)
        self.setMinimumSize(800, 480)
        
        self.worker = None
        self.worker_thread = None

        try:
            self.docai_client = get_docai_client(CONFIG["service_account_file"])
        except Exception as e:
            QMessageBox.critical(None, "GCP Error", f"Failed to init Document AI client: {e}")
            raise
        
        try:
            self.processed = load_state(STATE_FILE)
        except:
            self.processed = set()

        central = QtWidgets.QWidget()
        self.setCentralWidget(central)
        layout = QtWidgets.QVBoxLayout(central)

        # Folder selection row
        h = QtWidgets.QHBoxLayout()
        self.folder_edit = QtWidgets.QLineEdit()
        if CONFIG.get("remember_last_folder") and os.path.exists("last_folder.txt"):
            with open("last_folder.txt", "r") as f:
                self.folder_edit.setText(f.read().strip())
        btn = QtWidgets.QPushButton("Select Folder")
        btn.clicked.connect(self.browse)
        h.addWidget(self.folder_edit)
        h.addWidget(btn)
        layout.addLayout(h)

        # Progress bar
        self.progress_bar = QtWidgets.QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)

        # Buttons row
        h2 = QtWidgets.QHBoxLayout()
        self.scan_btn = QtWidgets.QPushButton("Scan Folder")
        self.scan_btn.clicked.connect(self.start_scan)
        self.stop_btn = QtWidgets.QPushButton("Stop")
        self.stop_btn.clicked.connect(self.stop_scan)
        self.stop_btn.setEnabled(False)
        self.reset_btn = QtWidgets.QPushButton("Reset scanned list")
        self.reset_btn.clicked.connect(self.reset_state)
        self.reset_cfg_btn = QtWidgets.QPushButton("Reset Configuration")
        self.reset_cfg_btn.clicked.connect(self.reset_config)
        h2.addWidget(self.scan_btn)
        h2.addWidget(self.stop_btn)
        h2.addWidget(self.reset_btn)
        h2.addWidget(self.reset_cfg_btn)
        layout.addLayout(h2)

        # Log area
        self.log_area = QtWidgets.QPlainTextEdit()
        self.log_area.setReadOnly(True)
        layout.addWidget(self.log_area)

    def append_log(self, msg):
        """Called from main thread only (via signal)"""
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.log_area.appendPlainText(f"[{ts}] {msg}")
        # Force UI update
        QtWidgets.QApplication.processEvents()
        try:
            with open(CONFIG.get("log_file", "run.log"), "a", encoding='utf-8') as f:
                f.write(f"[{ts}] {msg}\n")
        except:
            pass

    def browse(self):
        d = QFileDialog.getExistingDirectory(self, "Select folder", os.path.expanduser("~"))
        if d:
            self.folder_edit.setText(d)
            if CONFIG.get("remember_last_folder"):
                with open("last_folder.txt", "w") as f:
                    f.write(d)

    def reset_state(self):
        if QMessageBox.question(self, "Confirm", "Reset processed list? This will allow reprocessing.") == QtWidgets.QMessageBox.StandardButton.Yes:
            self.processed = set()
            save_state(STATE_FILE, self.processed)
            self.append_log("Processed state reset.")

    def reset_config(self):
        if QMessageBox.question(self, "Confirm", "Reset configuration and re-run setup?") == QtWidgets.QMessageBox.StandardButton.Yes:
            try:
                if os.path.exists("config.json"):
                    os.remove("config.json")
                QMessageBox.information(None, "Reset", "Config removed. Restart the app to reconfigure.")
                sys.exit(0)
            except Exception as e:
                self.append_log(f"Failed to remove config: {e}")

    def update_progress(self, current, total):
        """Called from main thread via signal"""
        self.progress_bar.setMaximum(total)
        self.progress_bar.setValue(current)

    def start_scan(self):
        folder = self.folder_edit.text().strip()
        if not folder or not os.path.isdir(folder):
            QMessageBox.critical(self, "Error", "Invalid folder.")
            return
        
        # Disable UI during scan
        self.scan_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)
        self.reset_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        # Create worker and thread
        self.worker_thread = QThread()
        self.worker = Worker(
            folder=folder,
            config=CONFIG,
            processed_set=self.processed,
            docai_client=self.docai_client,
            local_llm=_local_llm
        )
        
        # Move worker to thread
        self.worker.moveToThread(self.worker_thread)
        
        # Connect signals (thread-safe communication)
        self.worker_thread.started.connect(self.worker.run)
        self.worker.log_signal.connect(self.append_log)
        self.worker.progress_signal.connect(self.update_progress)
        self.worker.finished_signal.connect(self.on_scan_finished)
        
        # Start the thread
        self.worker_thread.start()

    def stop_scan(self):
        if self.worker:
            self.worker.stop()
            self.append_log("Stopping scan...")

    def on_scan_finished(self):
        """Called when worker finishes"""
        # Update processed set with new items
        if self.worker and self.worker.new_processed:
            self.processed.update(self.worker.new_processed)
            save_state(STATE_FILE, self.processed)
        
        # Clean up thread
        if self.worker_thread:
            self.worker_thread.quit()
            self.worker_thread.wait(5000)  # Wait up to 5 seconds
            self.worker_thread = None
        self.worker = None
        
        # Re-enable UI
        self.scan_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.reset_btn.setEnabled(True)
        self.progress_bar.setVisible(False)


def main():
    app = QtWidgets.QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
