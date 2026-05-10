"""
airflow/dags/customer_360_dag.py
=================================
Apache Airflow DAG — Customer 360 ETL Pipeline

Schedule: Daily at 02:00 UTC
Retries: 2 (with 5-minute delay)

Task Graph:
    start
      └─> generate_data    (BashOperator — ensures raw CSVs exist)
      └─> extract_validate (PythonOperator — extract + schema validation)
      └─> transform        (PythonOperator — clean + feature engineer)
      └─> rfm_segment      (PythonOperator — RFM scoring)
      └─> ml_churn         (PythonOperator — train/predict churn model)
      └─> load_db          (PythonOperator — PostgreSQL load)
      └─> export_dashboard (PythonOperator — Power BI CSV export)
      └─> update_watermark (PythonOperator — persist watermark)
      └─> end

Setup:
    1. Copy this file to your Airflow DAGs folder (~/airflow/dags/)
    2. Set Airflow Variables:
          customer360_db_host
          customer360_db_name
          customer360_db_user
          customer360_db_password
       OR configure via environment variables in your Airflow deployment.
    3. Set Airflow Connection: postgres_customer360 (type: Postgres)
    4. pip install -r airflow/requirements_airflow.txt in the Airflow environment
"""

import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Allow importing project modules from the Airflow worker
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

logger = logging.getLogger(__name__)

# ── Default DAG Arguments ──────────────────────────────────────────────────────
DEFAULT_ARGS = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "start_date": days_ago(1),
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=2),
}


# ── Task Functions ─────────────────────────────────────────────────────────────

def task_extract_validate(**context) -> dict:
    """Extract all raw CSV sources and validate schemas."""
    from etl.extract import extract_all
    raw = extract_all()
    row_counts = {k: len(v) for k, v in raw.items()}
    logger.info("Extracted row counts: %s", row_counts)
    # Push to XCom for downstream tasks
    context["ti"].xcom_push(key="row_counts", value=row_counts)
    return row_counts


def task_transform(**context) -> None:
    """Run full transform phase; persist CSVs to data/processed/."""
    from etl.extract import extract_all
    from etl.transform import transform_all
    from config import PROCESSED_DIR

    raw = extract_all()
    customers, orders, customer_360 = transform_all(raw)

    customers.to_csv(PROCESSED_DIR / "dim_customers.csv", index=False)
    orders.to_csv(PROCESSED_DIR / "fact_orders.csv", index=False)
    customer_360.to_csv(PROCESSED_DIR / "customer_360.csv", index=False)

    logger.info("Transform complete — %d customers.", len(customers))


def task_rfm_segment(**context) -> None:
    """Apply RFM segmentation to the transformed customer_360 file."""
    import pandas as pd
    from ml.rfm import RFMSegmenter
    from config import PROCESSED_DIR, RFM_SEGMENTS_PATH

    c360 = pd.read_csv(PROCESSED_DIR / "customer_360.csv")
    segmenter = RFMSegmenter()
    c360_rfm = segmenter.compute(c360)
    c360_rfm.to_csv(PROCESSED_DIR / "customer_360.csv", index=False)
    c360_rfm.to_csv(RFM_SEGMENTS_PATH, index=False)
    logger.info("RFM segmentation applied.")


def task_ml_churn(**context) -> None:
    """Train churn model and append predictions to customer_360 CSV."""
    import pandas as pd
    from ml.ml_model import ChurnPredictor
    from config import PROCESSED_DIR

    c360 = pd.read_csv(PROCESSED_DIR / "customer_360.csv")
    predictor = ChurnPredictor()
    predictions, metrics = predictor.run(c360)

    # Merge predictions back
    c360 = c360.merge(
        predictions[["CustomerID", "ChurnProbability", "ChurnPrediction", "ChurnRiskBand"]],
        on="CustomerID",
        how="left",
    )
    c360.to_csv(PROCESSED_DIR / "customer_360.csv", index=False)
    logger.info("ML churn phase complete. Metrics: %s", metrics)
    context["ti"].xcom_push(key="ml_metrics", value=metrics)


def task_load_db(**context) -> None:
    """Load CSVs into PostgreSQL."""
    import pandas as pd
    from etl.load import get_engine, create_schema, load_dim_customers, load_fact_orders, load_customer_360
    from config import PROCESSED_DIR

    customers = pd.read_csv(PROCESSED_DIR / "dim_customers.csv")
    orders = pd.read_csv(PROCESSED_DIR / "fact_orders.csv")
    c360 = pd.read_csv(PROCESSED_DIR / "customer_360.csv")

    engine = get_engine()
    create_schema(engine)
    load_dim_customers(customers, engine)
    load_fact_orders(orders, engine)
    load_customer_360(c360, engine)
    logger.info("Database load complete.")


def task_export_dashboard(**context) -> None:
    """Export Power BI CSV."""
    import pandas as pd
    from dashboard.export_powerbi import export_powerbi_dataset
    from config import PROCESSED_DIR

    c360 = pd.read_csv(PROCESSED_DIR / "customer_360.csv")
    output = export_powerbi_dataset(c360)
    logger.info("Dashboard export: %s", output)


def task_update_watermark(**context) -> None:
    """Update incremental watermarks after successful run."""
    import pandas as pd
    from etl.incremental import IncrementalLoader
    from config import PROCESSED_DIR

    loader = IncrementalLoader()
    orders = pd.read_csv(PROCESSED_DIR / "fact_orders.csv", parse_dates=["InvoiceDate"])
    loader.update_watermark("orders", orders["InvoiceDate"])
    logger.info("Watermark updated.")


# ── DAG Definition ─────────────────────────────────────────────────────────────
with DAG(
    dag_id="customer_360_etl_pipeline",
    description="Daily ETL pipeline: ingest customer data → Customer 360 → Churn ML → PostgreSQL",
    schedule_interval="0 2 * * *",   # 02:00 UTC daily
    default_args=DEFAULT_ARGS,
    catchup=False,
    max_active_runs=1,
    tags=["etl", "customer360", "ml", "churn"],
    doc_md=__doc__,
) as dag:

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    # Optional: regenerate data only in dev
    generate_data = BashOperator(
        task_id="check_data",
        bash_command=(
            f"python {PROJECT_ROOT}/data/generate_sample_data.py "
            f"|| echo 'Data already exists, skipping'"
        ),
    )

    extract_validate = PythonOperator(
        task_id="extract_validate",
        python_callable=task_extract_validate,
    )

    transform = PythonOperator(
        task_id="transform",
        python_callable=task_transform,
    )

    rfm_segment = PythonOperator(
        task_id="rfm_segment",
        python_callable=task_rfm_segment,
    )

    ml_churn = PythonOperator(
        task_id="ml_churn",
        python_callable=task_ml_churn,
    )

    load_db = PythonOperator(
        task_id="load_db",
        python_callable=task_load_db,
    )

    export_dashboard = PythonOperator(
        task_id="export_dashboard",
        python_callable=task_export_dashboard,
    )

    update_watermark = PythonOperator(
        task_id="update_watermark",
        python_callable=task_update_watermark,
    )

    # ── Dependency Chain ───────────────────────────────────────────────────────
    (
        start
        >> generate_data
        >> extract_validate
        >> transform
        >> rfm_segment
        >> ml_churn
        >> [load_db, export_dashboard]
        >> update_watermark
        >> end
    )
