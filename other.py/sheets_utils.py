from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

def get_sheets_service(service_account_file):
    """
    Create Google Sheets API service with service account credentials.
    
    Args:
        service_account_file: Path to service account JSON file
    
    Returns:
        Google Sheets API service object
    """
    try:
        creds = service_account.Credentials.from_service_account_file(
            service_account_file,
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        service = build("sheets", "v4", credentials=creds)
        return service
    except Exception as e:
        raise Exception(f"Failed to initialize Sheets service: {e}")

def append_row(service, spreadsheet_id, sheet_name, row_values):
    """
    Append a row to a Google Sheet.
    
    Args:
        service: Google Sheets API service object
        spreadsheet_id: ID of the spreadsheet
        sheet_name: Name of the sheet tab (e.g., "Receipts")
        row_values: List of values to append as a row
    
    Raises:
        HttpError: If the API request fails
    """
    try:
        # Ensure all values are strings and properly encoded
        clean_values = []
        for val in row_values:
            if val is None:
                clean_values.append("")
            else:
                # Convert to string and strip whitespace
                clean_values.append(str(val).strip())
        
        body = {"values": [clean_values]}
        
        # Range format: SheetName!A:Z (append to columns A through Z)
        range_name = f"{sheet_name}!A:Z"
        
        result = service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body
        ).execute()
        
        return result
    
    except HttpError as e:
        error_msg = str(e)
        
        # Provide helpful error messages
        if "403" in error_msg:
            if "SERVICE_DISABLED" in error_msg:
                raise Exception(
                    "Google Sheets API is not enabled. "
                    "Enable it at: https://console.developers.google.com/apis/api/sheets.googleapis.com"
                )
            else:
                raise Exception(
                    "Permission denied. Make sure the service account has edit access to the sheet. "
                    f"Service account email: receiptscanner@receipt-scanner-478421.iam.gserviceaccount.com"
                )
        
        elif "400" in error_msg and "Unable to parse range" in error_msg:
            raise Exception(
                f"Sheet tab '{sheet_name}' not found. "
                "Check that the tab name in your Google Sheet matches config.json exactly (case-sensitive)."
            )
        
        elif "404" in error_msg:
            raise Exception(
                f"Spreadsheet not found. Check that spreadsheet_id is correct: {spreadsheet_id}"
            )
        
        else:
            raise Exception(f"Sheets API error: {error_msg}")
    
    except Exception as e:
        raise Exception(f"Failed to append row: {e}")

def create_sheet_if_not_exists(service, spreadsheet_id, sheet_name):
    """
    Create a new sheet tab if it doesn't exist.
    
    Args:
        service: Google Sheets API service object
        spreadsheet_id: ID of the spreadsheet
        sheet_name: Name of the sheet tab to create
    
    Returns:
        True if created, False if already exists
    """
    try:
        # Get existing sheets
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        
        # Check if sheet already exists
        for sheet in sheets:
            if sheet['properties']['title'] == sheet_name:
                return False
        
        # Create new sheet
        requests = [{
            'addSheet': {
                'properties': {
                    'title': sheet_name
                }
            }
        }]
        
        body = {'requests': requests}
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body=body
        ).execute()
        
        return True
    
    except Exception as e:
        raise Exception(f"Failed to create sheet: {e}")

def write_headers(service, spreadsheet_id, sheet_name):
    """
    Write header row to sheet if it's empty.
    
    Args:
        service: Google Sheets API service object
        spreadsheet_id: ID of the spreadsheet
        sheet_name: Name of the sheet tab
    """
    try:
        # Check if sheet has data
        range_name = f"{sheet_name}!A1:Z1"
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=range_name
        ).execute()
        
        values = result.get('values', [])
        
        # If no data, write headers
        if not values:
            headers = [
                "date", "vendor", "category", "currency", 
                "amount", "amount_hkd", "file_name", "confidence", "notes"
            ]
            
            body = {"values": [headers]}
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1:I1",
                valueInputOption="USER_ENTERED",
                body=body
            ).execute()
            
            return True
        
        return False
    
    except Exception as e:
        raise Exception(f"Failed to write headers: {e}")
