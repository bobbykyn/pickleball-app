import re
from datetime import datetime

def parse_ocr_text(text):
    """Enhanced OCR text parsing with better regex and normalization"""
    out = {
        "date": None,
        "vendor": None,
        "total": None,
        "currency": None,
        "category": None,
        "confidence": None,
        "raw_text": text
    }
    
    if not text:
        return out
    
    # Normalize text - remove extra whitespace and normalize encoding
    text = ' '.join(text.split())
    
    # Date extraction - try multiple formats
    date_patterns = [
        r'\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b',  # YYYY-MM-DD or YYYY/MM/DD
        r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b',  # DD-MM-YYYY or MM-DD-YYYY
        r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2})\b',  # DD-MM-YY or MM-DD-YY
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text)
        if date_match:
            date_str = date_match.group(1)
            # Try to normalize to YYYY-MM-DD
            try:
                for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y', '%m-%d-%Y', '%m/%d/%Y', '%d-%m-%y', '%d/%m/%y']:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        out["date"] = dt.strftime('%Y-%m-%d')
                        break
                    except ValueError:
                        continue
            except:
                out["date"] = date_str
            if out["date"]:
                break
    
    # Currency detection
    if "HK$" in text or "HKD" in text or "港幣" in text or "港币" in text:
        out["currency"] = "HKD"
    elif "USD" in text or "US$" in text:
        out["currency"] = "USD"
    elif "$" in text:
        # Default to USD if just $ symbol
        out["currency"] = "USD"
    elif "€" in text or "EUR" in text:
        out["currency"] = "EUR"
    elif "£" in text or "GBP" in text:
        out["currency"] = "GBP"
    else:
        out["currency"] = "USD"  # Default fallback
    
    # Total amount extraction - look for various patterns
    amount_patterns = [
        r'Total[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})',  # Total: $XX.XX
        r'Amount[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})',  # Amount: XX.XX
        r'Payment[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})',  # Payment: XX.XX
        r'\$\s*(\d+[,.]?\d*\.?\d{2})\s*(?:USD|HKD|EUR|GBP)?',  # $XX.XX
        r'(\d+[,.]?\d{3,}\.?\d{2})',  # Any number with comma separator
        r'(\d+\.\d{2})',  # Any decimal number
    ]
    
    amounts_found = []
    for pattern in amount_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            # Clean up the match
            clean_amount = match.replace(',', '').replace('$', '').strip()
            try:
                val = float(clean_amount)
                if 0.01 <= val <= 1000000:  # Reasonable range
                    amounts_found.append(val)
            except ValueError:
                continue
    
    # Take the largest amount found (usually the total)
    if amounts_found:
        out["total"] = str(max(amounts_found))
    
    # Vendor extraction - improved logic
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # Common receipt indicators to skip
    skip_patterns = [
        r'^\d{4}[-/]\d{2}[-/]\d{2}',  # Dates
        r'^Receipt',
        r'^Tax',
        r'^Total',
        r'^Amount',
        r'^Payment',
        r'^\d+$',  # Just numbers
        r'^[\d\s\-\(\)]+$',  # Phone numbers
    ]
    
    vendor_candidates = []
    for line in lines[:10]:  # Check first 10 lines
        if len(line) < 3 or len(line) > 100:
            continue
        
        skip = False
        for pattern in skip_patterns:
            if re.match(pattern, line, re.IGNORECASE):
                skip = True
                break
        
        if not skip:
            vendor_candidates.append(line)
    
    if vendor_candidates:
        out["vendor"] = vendor_candidates[0]
    
    # Category detection based on keywords
    text_lower = text.lower()
    categories = {
        "Food & Dining": ["restaurant", "cafe", "coffee", "food", "dining", "meal", "lunch", "dinner"],
        "Transportation": ["taxi", "uber", "lyft", "parking", "transit", "metro", "octopus", "mtr"],
        "Shopping": ["store", "shop", "retail", "purchase"],
        "Entertainment": ["cinema", "movie", "theater", "game"],
        "Utilities": ["electric", "water", "gas", "utility"],
        "Healthcare": ["clinic", "hospital", "pharmacy", "medical"],
    }
    
    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in text_lower:
                out["category"] = category
                break
        if out["category"]:
            break
    
    return out
