from datetime import datetime
import pytz

COLOMBO_TZ = pytz.timezone("Asia/Colombo")


def now_colombo() -> datetime:
    """Return the current datetime in Asia/Colombo timezone."""
    return datetime.now(COLOMBO_TZ)


def today_str() -> str:
    """Return today's date as 'YYYY-MM-DD' in Colombo time."""
    return now_colombo().strftime("%Y-%m-%d")


def current_time_str() -> str:
    """Return the current time as 'HH:MM:SS' in Colombo time."""
    return now_colombo().strftime("%H:%M:%S")


def current_day_name() -> str:
    """Return the full day name (e.g. 'Monday') in Colombo time."""
    return now_colombo().strftime("%A")
