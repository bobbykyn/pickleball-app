import os
import hashlib
import json
from PIL import Image

def ensure_dir(path):
    """Create directory if it doesn't exist"""
    os.makedirs(path, exist_ok=True)

def load_state(path):
    """Load processed file hashes from state file"""
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data) if isinstance(data, list) else set()
        except Exception as e:
            print(f"Warning: Could not load state file: {e}")
            return set()
    return set()

def save_state(path, s):
    """Save processed file hashes to state file"""
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(list(s), f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save state file: {e}")

def file_hash(path):
    """Generate SHA256 hash of file contents"""
    h = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()
    except Exception as e:
        print(f"Error hashing file {path}: {e}")
        # Return a unique hash based on path and mtime as fallback
        return hashlib.sha256(f"{path}-{os.path.getmtime(path)}".encode()).hexdigest()

def compress_image_if_needed(path, max_mb=10, target_path=None):
    """
    Compress image if it exceeds max_mb size.
    Returns path to compressed image or original if no compression needed.
    
    NOTE: This function is currently DISABLED to prevent duplicate processing.
    It always returns the original path without compression.
    """
    # Return original path - compression disabled
    return path
    
    # The code below is disabled but kept for reference
    # Uncomment if you want to enable compression (but fix duplicate detection first!)
    
    # try:
    #     file_size_mb = os.path.getsize(path) / (1024 * 1024)
    #     
    #     # If file is already small enough, return original
    #     if file_size_mb <= max_mb:
    #         return path
    #     
    #     # Generate target path if not provided
    #     if not target_path:
    #         base, ext = os.path.splitext(path)
    #         target_path = f"{base}.compressed.jpg"
    #     
    #     # Open and convert image
    #     img = Image.open(path)
    #     if img.mode in ("RGBA", "P", "LA"):
    #         img = img.convert("RGB")
    #     
    #     # Start with high quality
    #     quality = 85
    #     img.save(target_path, format="JPEG", quality=quality, optimize=True)
    #     
    #     # Reduce quality until size is acceptable
    #     while os.path.getsize(target_path) / (1024 * 1024) > max_mb and quality > 30:
    #         quality -= 10
    #         img.save(target_path, format="JPEG", quality=quality, optimize=True)
    #     
    #     print(f"Compressed {path} from {file_size_mb:.2f}MB to {os.path.getsize(target_path)/(1024*1024):.2f}MB")
    #     return target_path
    # 
    # except Exception as e:
    #     print(f"Compression failed for {path}: {e}")
    #     return path  # Return original on error
