"""
config.py
=========
Central configuration for the Customer 360 ETL pipeline.
All sensitive values are loaded from environment variables via python-dotenv.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env if present (development) ────────────────────────────────────────
load_dotenv()

# ── Base Paths ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
DASHBOARD_DIR = BASE_DIR / "dashboard"

# Create directories if they don't exist
for _dir in [RAW_DIR, PROCESSED_DIR, DASHBOARD_DIR]:
    _dir.mkdir(parents=True, exist_ok=True)

# ── Database Configuration ─────────────────────────────────────────────────────
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "customer360"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
}

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
    f"@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
)

# ── Raw Data File Paths ────────────────────────────────────────────────────────
RAW_CUSTOMERS_PATH = RAW_DIR / "customers.csv"
RAW_ORDERS_PATH = RAW_DIR / "orders.csv"
RAW_TRANSACTIONS_PATH = RAW_DIR / "transactions.csv"

# ── Processed Output Paths ─────────────────────────────────────────────────────
CUSTOMER_360_PATH = PROCESSED_DIR / "customer_360.csv"
CHURN_PREDICTIONS_PATH = PROCESSED_DIR / "churn_predictions.csv"
RFM_SEGMENTS_PATH = PROCESSED_DIR / "rfm_segments.csv"
MODEL_PATH = PROCESSED_DIR / "churn_model.pkl"
WATERMARK_PATH = PROCESSED_DIR / "watermark.json"

# ── ML Configuration ───────────────────────────────────────────────────────────
ML_CONFIG = {
    "test_size": 0.2,
    "random_state": 42,
    "n_estimators": 200,
    "max_depth": 10,
    "churn_threshold_days": 90,   # Customer inactive for 90+ days = churned
    "min_orders_active": 2,       # Fewer than 2 orders = at-risk
}

# ── Churn Definition ───────────────────────────────────────────────────────────
CHURN_DAYS_THRESHOLD = int(os.getenv("CHURN_DAYS_THRESHOLD", 90))

# ── Logging ────────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ── Table Names ────────────────────────────────────────────────────────────────
TABLE_DIM_CUSTOMERS = "dim_customers"
TABLE_FACT_ORDERS = "fact_orders"
TABLE_CUSTOMER_360 = "customer_360"

# ── Airflow ────────────────────────────────────────────────────────────────────
AIRFLOW_SCHEDULE = "@daily"
AIRFLOW_START_DATE = "2024-01-01"
