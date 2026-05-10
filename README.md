<<<<<<< HEAD
# Customer 360 ETL Pipeline with Churn Prediction

> Production-quality end-to-end data pipeline: **Extract → Transform → Load → ML → Dashboard**

---

## Architecture Overview

```
data/raw/ (CSV)
      │
      ▼
etl/extract.py     ─── Schema validation, logging
      │
      ▼
etl/transform.py   ─── Cleaning, feature engineering, churn label
      │
      ├──► ml/rfm.py        ─── RFM segmentation (R/F/M scores, segments)
      │
      ├──► ml/ml_model.py   ─── Churn prediction (RandomForest + LogisticRegression)
      │
      ▼
etl/load.py        ─── PostgreSQL upsert (dim_customers, fact_orders, customer_360)
      │
      ├──► data/processed/  ─── CSV backups
      │
      └──► dashboard/       ─── Power BI export CSV

airflow/dags/      ─── Daily automation DAG (Apache Airflow)
sql/               ─── DDL schema + analytical queries
tests/             ─── pytest unit tests
```

---

## Project Structure

```
customer-360-etl/
├── config.py                       # Central config (DB, paths, ML params)
├── main.py                         # Pipeline orchestration entry point
├── requirements.txt
├── .env.example                    # Environment variable template
│
├── data/
│   ├── generate_sample_data.py     # Synthetic data generator
│   ├── raw/                        # Input CSVs (customers, orders, transactions)
│   └── processed/                  # ETL output CSVs
│
├── etl/
│   ├── extract.py                  # CSV extraction + schema validation
│   ├── transform.py                # Cleaning, feature engineering, merging
│   ├── load.py                     # PostgreSQL upsert via SQLAlchemy
│   └── incremental.py              # Watermark-based incremental loading
│
├── ml/
│   ├── features.py                 # Feature selection + label encoding
│   ├── ml_model.py                 # RandomForest churn predictor + LR comparison
│   └── rfm.py                      # RFM Recency/Frequency/Monetary segmentation
│
├── airflow/
│   ├── dags/
│   │   └── customer_360_dag.py     # Airflow DAG (daily @ 02:00 UTC)
│   └── requirements_airflow.txt
│
├── dashboard/
│   ├── export_powerbi.py           # Power BI export (CSV + KPIs)
│   └── powerbi_schema.md           # Data model guide + DAX measures
│
├── sql/
│   ├── schema.sql                  # PostgreSQL DDL (tables, indexes, views)
│   └── queries.sql                 # 10 analytical queries
│
└── tests/
    ├── test_transform.py           # ETL unit tests
    └── test_ml.py                  # ML + RFM unit tests
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 14+ (optional — pipeline works CSV-only with `--skip-db`)
- pip

### 1. Clone & install

```bash
cd customer-360-etl
pip install -r requirements.txt
```

### 2. Configure environment

```bash
copy .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Set up PostgreSQL (optional)

```bash
# Create database
psql -U postgres -c "CREATE DATABASE customer360;"

# Run schema
psql -U postgres -d customer360 -f sql/schema.sql
```

### 4. Generate sample data

```bash
python data/generate_sample_data.py
```

This creates:
- `data/raw/customers.csv` — 500 customers
- `data/raw/orders.csv` — 2,500 orders
- `data/raw/transactions.csv` — 6,000 transactions

### 5. Run the full pipeline

```bash
# With PostgreSQL
python main.py

# Without PostgreSQL (CSV output only)
python main.py --skip-db

# Regenerate data + run
python main.py --generate-data

# Incremental mode (uses watermark)
python main.py --incremental
```

### 6. Run tests

```bash
pytest tests/ -v --tb=short
```

---

## Pipeline Outputs

| File | Description |
|------|-------------|
| `data/processed/dim_customers.csv` | Cleaned customer master |
| `data/processed/fact_orders.csv` | Cleaned orders |
| `data/processed/customer_360.csv` | Full Customer 360 view with all KPIs |
| `data/processed/rfm_segments.csv` | RFM scores + segments |
| `data/processed/churn_predictions.csv` | Churn probability + risk band per customer |
| `data/processed/churn_model.pkl` | Trained RandomForest model artefact |
| `dashboard/customer_360_powerbi.csv` | Power BI-ready export |
| `pipeline.log` | Full run logs |

---

## PostgreSQL Tables

| Table | Description |
|-------|-------------|
| `dim_customers` | Customer dimension (one row per customer) |
| `fact_orders` | Order fact table (one row per order) |
| `customer_360` | Denormalised Customer 360 view with all KPIs |
| `v_at_risk_customers` | View: active customers flagged as high churn risk |

---

## Feature Engineering

| Feature | Formula |
|---------|---------|
| Revenue | `Quantity × UnitPrice × (1 − DiscountPct)` |
| CLV | `(TotalRevenue / DaysActive) × 365 × 3` |
| OrderFrequencyPerMonth | `TotalOrders / (DaysActive / 30.44)` |
| IsChurned | `1 if DaysSinceLastPurchase ≥ 90 or TotalOrders = 0` |
| RevenueTier | No Revenue / Low / Medium / High / VIP |

---

## RFM Segments

| Segment | Description |
|---------|-------------|
| Champion | High R, F, M — best customers |
| Loyal | Frequent buyers, good value |
| Potential Loyal | Recent, moderate frequency |
| New Customer | Just joined, not yet frequent |
| At Risk | Used to buy but going quiet |
| Can't Lose Them | Big spenders, now inactive |
| Need Attention | Average across all dimensions |
| Promising | Recent, low spend |
| Lost | Low R, F, M — disengaged |

---

## ML Model

- **Algorithm**: RandomForestClassifier (200 trees, balanced class weights)
- **Comparison**: LogisticRegression (for interpretability baseline)
- **Churn definition**: No purchase in the last 90 days OR 0 orders
- **Imbalance handling**: SMOTE oversampling + `class_weight="balanced"`
- **Validation**: Stratified 80/20 split + 5-fold cross-validation
- **Metrics logged**: Accuracy, ROC-AUC, Precision, Recall, F1, Confusion Matrix

---

## Airflow Setup

```bash
pip install apache-airflow==2.9.1
airflow db init
airflow users create --username admin --role Admin --firstname Admin --lastname User --email admin@example.com --password admin

# Copy DAG
copy airflow\dags\customer_360_dag.py %AIRFLOW_HOME%\dags\

# Start
airflow webserver --port 8080
airflow scheduler
```

Open http://localhost:8080 → enable DAG `customer_360_etl_pipeline`

---

## Power BI

1. Open `dashboard/powerbi_schema.md` for full setup guide
2. Connect to `dashboard/customer_360_powerbi.csv`
3. Use the provided DAX measures for KPIs

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | customer360 | Database name |
| `DB_USER` | postgres | DB username |
| `DB_PASSWORD` | — | DB password (required) |
| `CHURN_DAYS_THRESHOLD` | 90 | Days inactive = churned |
| `LOG_LEVEL` | INFO | Logging verbosity |

---

## Development

```bash
# Add a new feature to transform.py, then test
pytest tests/test_transform.py -v

# Check coverage
pytest tests/ --cov=etl --cov=ml --cov-report=term-missing

# Reset watermark (force full reload)
python -c "from etl.incremental import IncrementalLoader; IncrementalLoader().reset_all()"
```

---

## License

MIT — see LICENSE file.
=======
# Customer-360-etl
Customer 360 ETL pipeline with automated data ingestion, cleaning, transformation, and interactive analytics dashboard.
>>>>>>> f222003862bdbf554c3a693bd42640577451d59c
