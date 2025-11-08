import os
import json
from datetime import datetime, date
import pandas as pd
from flask import Flask, render_template, jsonify
from fredapi import Fred
import yfinance as yf
import requests

app = Flask(__name__)

# --- Configuration ---
FRED_API_KEY = os.environ.get('FRED_API_KEY', 'YOUR_FRED_API_KEY') # Replace with your FRED API key or set as environment variable
START_DATE = '2015-01-01'

# --- Data Fetching Functions ---
def fetch_interest_rates():
    """Fetches US Interest Rate data."""
    print("Fetching new Interest Rate data...")
    try:
        fred = Fred(api_key=FRED_API_KEY)
        series = fred.get_series('EFFR', start_date=START_DATE)
        series = series[series.index >= pd.to_datetime(START_DATE)]
        series.dropna(inplace=True)
        data = {ts.strftime('%Y-%m'): value for ts, value in series.resample('MS').first().to_dict().items()}
        return {"data": data}
    except Exception as e:
        print(f"Error fetching FRED data: {e}")
        return {"data": {}}

def fetch_kospi_data():
    """Fetches KOSPI (^KS11) data."""
    print("Fetching new KOSPI (^KS11) data...")
    try:
        ticker = yf.Ticker("^KS11")
        history = ticker.history(start=START_DATE, interval="1mo")
        if not history.empty and history.index.tz is not None:
            history.index = history.index.tz_localize(None) # Make timezone-naive
        history = history[history.index >= pd.to_datetime(START_DATE)]
        history = history[history['Close'] > 1] # Filter out abnormally low values
        history.dropna(subset=['Close'], inplace=True)
        data = {ts.strftime('%Y-%m'): value for ts, value in history['Close'].to_dict().items()}
        return {"data": data}
    except Exception as e:
        print(f"Error fetching KOSPI data: {e}")
        import traceback
        traceback.print_exc() # Print full traceback
        return {"data": {}}

def fetch_exchange_rates():
    """Fetches USD/KRW exchange rate data."""
    print("Fetching new USD/KRW data...")
    try:
        ticker = yf.Ticker("KRW=X")
        history = ticker.history(start=START_DATE, interval="1mo")
        if not history.empty and history.index.tz is not None:
            history.index = history.index.tz_localize(None) # Make timezone-naive
        history = history[history.index >= pd.to_datetime(START_DATE)]
        history = history[history['Close'] > 100] # Filter out abnormally low values
        history.dropna(subset=['Close'], inplace=True)
        data = {ts.strftime('%Y-%m'): value for ts, value in history['Close'].to_dict().items()}
        return {"data": data}
    except Exception as e:
        print(f"Error fetching Exchange Rate data: {e}")
        import traceback
        traceback.print_exc() # Print full traceback
        return {"data": {}}

def fetch_bok_interest_rate():
    """Fetches South Korea Interest Rate data from BOK ECOS API."""
    print("Fetching new South Korea Interest Rate data from BOK...")
    try:
        bok_api_key = os.environ.get('BOK_API_KEY', 'YOUR_BOK_API_KEY') # Replace with your BOK API key or set as environment variable
        stat_code = '722Y001' # 기준금리 (Base Rate)
        item_code = '0101000' # 기준금리 (Base Rate)
        period = 'M' # Monthly
        start_date_str = datetime.strptime(START_DATE, '%Y-%m-%d').strftime('%Y%m')
        end_date_str = date.today().strftime('%Y%m')
        
        url = f"https://ecos.bok.or.kr/api/StatisticSearch/{bok_api_key}/json/kr/1/1000/{stat_code}/{period}/{start_date_str}/{end_date_str}/{item_code}/"
        print(f"DEBUGGING URL: {url}")

        response = requests.get(url)
        response.raise_for_status()
        raw_data = response.json()

        # Check for API-level errors
        if "RESULT" in raw_data:
            error_code = raw_data["RESULT"]["CODE"]
            if error_code != "INFO-000":
                error_message = raw_data["RESULT"]["MESSAGE"]
                print(f"Error from BOK API: {error_code} - {error_message}")
                return {"data": {}}
        
        data = {}
        if "StatisticSearch" in raw_data and "row" in raw_data["StatisticSearch"]:
            print("DEBUGGING: Successfully fetched data from BOK API.")
            for item in raw_data["StatisticSearch"]["row"]:
                # TIME is in 'YYYYMM' format, convert to 'YYYY-MM'
                year = item["TIME"][:4]
                month = item["TIME"][4:]
                date_key = f"{year}-{month}"
                data[date_key] = float(item["DATA_VALUE"])
        
        return {"data": data}
    except Exception as e:
        print(f"Error fetching BOK Interest Rate data: {e}")
        import traceback
        traceback.print_exc()
        return {"data": {}}

# --- Flask Routes ---
@app.route('/')
def index():
    """Renders the main chart page."""
    return render_template('index.html')

@app.route('/data')
def get_data():
    """Serves the chart data by fetching directly from APIs."""
    
    # Fetch all data
    us_interest_rates_data = fetch_interest_rates()
    kospi_prices_data = fetch_kospi_data()
    exchange_rates_data = fetch_exchange_rates()
    korea_interest_rates_data = fetch_bok_interest_rate()
            
    # Prepare data for the frontend
    frontend_data = {
        'interest_rates': us_interest_rates_data['data'],
        'kospi_prices': kospi_prices_data['data'],
        'exchange_rates': exchange_rates_data['data'],
        'korea_interest_rates': korea_interest_rates_data['data'],
    }

    # Calculate the difference between US and Korea interest rates
    us_rates = frontend_data['interest_rates']
    kr_rates = frontend_data['korea_interest_rates']
    
    interest_rate_difference = {}
    common_dates = sorted(list(set(us_rates.keys()) & set(kr_rates.keys())))
    
    for date_key in common_dates:
        us_val = us_rates.get(date_key)
        kr_val = kr_rates.get(date_key)
        if us_val is not None and kr_val is not None:
            interest_rate_difference[date_key] = us_val - kr_val
            
    frontend_data['interest_rate_difference'] = interest_rate_difference
    
    return jsonify(frontend_data)