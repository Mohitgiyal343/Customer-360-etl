"""
main.py
=======
Customer 360 ETL Pipeline — Orchestration Entry Point

Runs the complete pipeline:
  1. Generate sample data (if not already present)
  2. Extract raw CSVs
  3. Transform and feature-engineer
  4. Apply RFM segmentation
  5. Run churn prediction model
  6. Load into PostgreSQL (or CSV-only if DB unavailable)
  7. Export dashboard-ready file

Usage:
    python main.py                   # Full pipeline run
    python main.py --skip-db         # Skip PostgreSQL load
    python main.py --incremental     # Incremental load mode
    python main.py --generate-data   # Regenerate sample data and run

Environment:
    Copy .env.example → .env and set DB credentials.
"""

import argparse
import io
import logging
import subprocess
import sys
import time
from pathlib import Path

# ── Force UTF-8 on stdout to avoid UnicodeEncodeError on Windows (cp1252) ─────
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)

from config import (
    LOG_FORMAT,
    LOG_DATE_FORMAT,
    LOG_LEVEL,
    PROCESSED_DIR,
    RAW_CUSTOMERS_PATH,
    RFM_SEGMENTS_PATH,
)

# ── Logging setup (must happen before imports that log) ───────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format=LOG_FORMAT,
    datefmt=LOG_DATE_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(PROCESSED_DIR.parent / "pipeline.log", mode="a", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Customer 360 ETL Pipeline")
    parser.add_argument(
        "--skip-db",
        action="store_true",
        help="Skip PostgreSQL load; output CSV files only.",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Use watermark-based incremental loading.",
    )
    parser.add_argument(
        "--generate-data",
        action="store_true",
        help="Regenerate synthetic sample data before running.",
    )
    parser.add_argument(
        "--skip-ml",
        action="store_true",
        help="Skip the machine learning phase.",
    )
    return parser.parse_args()


def ensure_data(generate: bool = False) -> None:
    """Generate sample data if it doesn't exist or if forced."""
    if generate or not RAW_CUSTOMERS_PATH.exists():
        logger.info("Generating synthetic sample data ...")
        result = subprocess.run(
            [sys.executable, "Data/generate_sample_data.py"],
            capture_output=False,
        )
        if result.returncode != 0:
            raise RuntimeError("Data generation script failed.")
    else:
        logger.info("Sample data found — skipping generation.")


def run_pipeline(skip_db: bool = False, incremental: bool = False, skip_ml: bool = False) -> dict:
    """
    Execute the full ETL + ML pipeline.

    Returns
    -------
    dict of pipeline run summary
    """
    pipeline_start = time.perf_counter()
    summary = {}

    # ── EXTRACT ────────────────────────────────────────────────────────────────
    from etl.extract import extract_all
    raw = extract_all()
    summary["extracted_rows"] = {k: len(v) for k, v in raw.items()}

    # ── INCREMENTAL FILTER ─────────────────────────────────────────────────────
    if incremental:
        from etl.incremental import IncrementalLoader
        loader = IncrementalLoader()
        raw["orders"] = loader.filter_new_records(raw["orders"], "orders", "InvoiceDate")
        raw["transactions"] = loader.filter_new_records(raw["transactions"], "transactions", "TransactionDate")
        summary["incremental_mode"] = True

    # ── TRANSFORM ─────────────────────────────────────────────────────────────
    from etl.transform import transform_all
    customers, orders, customer_360 = transform_all(raw)
    summary["transformed_rows"] = {
        "dim_customers": len(customers),
        "fact_orders": len(orders),
        "customer_360": len(customer_360),
    }

    # ── RFM SEGMENTATION ───────────────────────────────────────────────────────
    logger.info("=== RFM SEGMENTATION ===")
    from ml.rfm import RFMSegmenter
    segmenter = RFMSegmenter()
    customer_360 = segmenter.compute(customer_360)
    customer_360.to_csv(RFM_SEGMENTS_PATH, index=False)
    logger.info("RFM segments saved → %s", RFM_SEGMENTS_PATH)
    summary["rfm_segments"] = customer_360["RFM_Segment"].value_counts().to_dict()

    # ── ML CHURN PREDICTION ────────────────────────────────────────────────────
    if not skip_ml:
        from ml.ml_model import ChurnPredictor
        predictor = ChurnPredictor()
        predictions, metrics = predictor.run(customer_360)
        summary["ml_metrics"] = metrics

        # Merge predictions back into customer_360
        customer_360 = customer_360.merge(
            predictions[["CustomerID", "ChurnProbability", "ChurnPrediction", "ChurnRiskBand"]],
            on="CustomerID",
            how="left",
        )

    # ── LOAD ───────────────────────────────────────────────────────────────────
    from etl.load import load_all
    load_all(customers, orders, customer_360, skip_db=skip_db)
    summary["load_skip_db"] = skip_db

    # ── DASHBOARD EXPORT ───────────────────────────────────────────────────────
    from dashboard.export_powerbi import export_powerbi_dataset
    export_powerbi_dataset(customer_360)
    summary["dashboard_export"] = True

    # ── WATERMARK UPDATE ───────────────────────────────────────────────────────
    if incremental:
        loader.update_watermark("orders", raw["orders"]["InvoiceDate"])
        loader.update_watermark("transactions", raw["transactions"]["TransactionDate"])

    elapsed = time.perf_counter() - pipeline_start
    summary["elapsed_seconds"] = round(elapsed, 2)

    return summary


def main() -> None:
    args = parse_args()

    logger.info("=" * 60)
    logger.info("  Customer 360 ETL Pipeline — Starting")
    logger.info("  skip_db=%s | incremental=%s | skip_ml=%s", args.skip_db, args.incremental, args.skip_ml)
    logger.info("=" * 60)

    try:
        ensure_data(generate=args.generate_data)
        summary = run_pipeline(
            skip_db=args.skip_db,
            incremental=args.incremental,
            skip_ml=args.skip_ml,
        )

        logger.info("=" * 60)
        logger.info("  Pipeline completed in %.2fs", summary["elapsed_seconds"])
        logger.info("  Extracted: %s", summary.get("extracted_rows", {}))
        logger.info("  Transformed: %s", summary.get("transformed_rows", {}))
        if "ml_metrics" in summary:
            logger.info("  ML Metrics: %s", summary["ml_metrics"])
        logger.info("  Outputs → %s", PROCESSED_DIR)
        logger.info("=" * 60)

    except FileNotFoundError as exc:
        logger.error("Missing file: %s", exc)
        logger.info("Tip: run with --generate-data to create sample data.")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.warning("Pipeline interrupted by user.")
        sys.exit(0)
    except Exception as exc:
        logger.exception("Pipeline failed with unexpected error: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
