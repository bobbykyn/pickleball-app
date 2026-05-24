import requests
from datetime import datetime
import time

def get_historical_rate(base, target, date_str):
    """
    Get historical exchange rate from multiple free APIs.
    Tries multiple sources for reliability.
    """
    # Normalize currency codes
    base = base.upper().strip()
    target = target.upper().strip()
    
    # If same currency, rate is 1.0
    if base == target:
        return 1.0
    
    # Try multiple free API sources
    apis = [
        {
            "name": "exchangerate-api.com",
            "url": f"https://api.exchangerate-api.com/v4/historical/{date_str}",
            "parser": lambda js: js.get("rates", {}).get(target)
        },
        {
            "name": "frankfurter.app",
            "url": f"https://api.frankfurter.app/{date_str}",
            "params": {"from": base, "to": target},
            "parser": lambda js: js.get("rates", {}).get(target)
        },
        {
            "name": "fixer.io (free tier)",
            "url": f"https://data.fixer.io/api/{date_str}",
            "params": {"access_key": "YOUR_KEY_HERE", "base": base, "symbols": target},
            "parser": lambda js: js.get("rates", {}).get(target),
            "skip": True  # Skip fixer.io as it requires API key
        }
    ]
    
    for api in apis:
        if api.get("skip"):
            continue
        
        try:
            response = requests.get(
                api["url"],
                params=api.get("params"),
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                rate = api["parser"](data)
                
                if rate and isinstance(rate, (int, float)) and rate > 0:
                    return float(rate)
        
        except Exception as e:
            # Silent fail, try next API
            continue
    
    return None

def get_rate_fallback(base, target, date_str=None):
    """
    Get exchange rate with fallback to current date if historical fails.
    
    Args:
        base: Base currency (e.g., "USD")
        target: Target currency (e.g., "HKD")
        date_str: Date in YYYY-MM-DD format (optional)
    
    Returns:
        float: Exchange rate, or None if all attempts fail
    """
    # Normalize currencies
    base = base.upper().strip()
    target = target.upper().strip()
    
    # Same currency = 1.0
    if base == target:
        return 1.0
    
    # If no date provided, use today
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Try with provided date
    try:
        rate = get_historical_rate(base, target, date_str)
        if rate:
            return rate
    except Exception as e:
        pass
    
    # Fallback: Try today's rate
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if today != date_str:
        try:
            rate = get_historical_rate(base, target, today)
            if rate:
                return rate
        except Exception as e:
            pass
    
    # Fallback: Use hardcoded common rates (updated periodically)
    # These are approximate rates as of late 2024
    hardcoded_rates = {
        ("USD", "HKD"): 7.8,
        ("HKD", "USD"): 1 / 7.8,
        ("EUR", "HKD"): 8.5,
        ("HKD", "EUR"): 1 / 8.5,
        ("GBP", "HKD"): 10.0,
        ("HKD", "GBP"): 1 / 10.0,
        ("JPY", "HKD"): 0.052,
        ("HKD", "JPY"): 1 / 0.052,
        ("CNY", "HKD"): 1.1,
        ("HKD", "CNY"): 1 / 1.1,
        ("USD", "EUR"): 0.92,
        ("EUR", "USD"): 1 / 0.92,
        ("USD", "GBP"): 0.79,
        ("GBP", "USD"): 1 / 0.79,
    }
    
    # Check hardcoded rates
    rate = hardcoded_rates.get((base, target))
    if rate:
        return rate
    
    # Try reverse rate and invert
    reverse_rate = hardcoded_rates.get((target, base))
    if reverse_rate:
        return 1 / reverse_rate
    
    # All methods failed
    return None

def get_current_rate(base, target):
    """Get current exchange rate (convenience function)"""
    return get_rate_fallback(base, target, datetime.utcnow().strftime("%Y-%m-%d"))
