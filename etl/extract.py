"""
etl/extract.py
==============
Extraction layer — reads raw CSV files, validates schemas, and returns
clean DataFrames ready for the transformation stage.

Features:
  • Schema validation (required columns check)
  • File-not-found / permission error handling
  • Row-count & column-count logging
  • Returns a dict of DataFrames keyed by source name
"""

import logging
from pathlib import Path
from typing import Dict, Optional

import pandas as pd

from config import RAW_CUSTOMERS_PATH, RAW_ORDERS_PATH, RAW_TRANSACTIONS_PATH

logger = logging.getLogger(__name__)

# ── Expected schemas (minimum required columns) ────────────────────────────────
SCHEMAS: Dict[str, list] = {
    "customers": [
        "CustomerID", "FirstName", "LastName", "Email",
        "Country", "RegistrationDate", "Segment",
    ],
    "orders": [
        "OrderID", "CustomerID", "InvoiceDate",
        "Quantity", "UnitPrice", "OrderStatus",
    ],
    "transactions": [
        "TransactionID", "OrderID", "CustomerID",
        "TransactionDate", "Amount", "Status",
    ],
}


def _validate_schema(df: pd.DataFrame, source: str) -> None:
    """Raise ValueError if a required column is missing."""
    required = SCHEMAS.get(source, [])
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(
            f"[{source}] Missing required columns: {missing}. "
            f"Found: {df.columns.tolist()}"
        )
    logger.debug("[%s] Schema validation passed — all required columns present.", source)


def _read_csv(
    path: Path,
    source: str,
    parse_dates: Optional[list] = None,
    dtype: Optional[dict] = None,
) -> pd.DataFrame:
    """
    Read a single CSV file with error handling and structured logging.

    Parameters
    ----------
    path        : Absolute path to the CSV file.
    source      : Logical name for logging (e.g., 'customers').
    parse_dates : Column names to parse as datetime.
    dtype       : Column dtype overrides.

    Returns
    -------
    pd.DataFrame
    """
    logger.info("[%s] Reading CSV: %s", source, path)

    if not path.exists():
        raise FileNotFoundError(
            f"[{source}] Data file not found: {path}. "
            "Run `python data/generate_sample_data.py` to create it."
        )

    try:
        df = pd.read_csv(
            path,
            parse_dates=parse_dates or [],
            dtype=dtype or {},
            low_memory=False,
        )
    except PermissionError as exc:
        raise PermissionError(f"[{source}] Cannot read {path}: {exc}") from exc
    except pd.errors.ParserError as exc:
        raise ValueError(f"[{source}] CSV parsing error in {path}: {exc}") from exc

    _validate_schema(df, source)

    logger.info(
        "[%s] Loaded %d rows × %d columns.",
        source, len(df), len(df.columns),
    )
    return df


# ── Public API ─────────────────────────────────────────────────────────────────

def extract_customers() -> pd.DataFrame:
    """Extract raw customers CSV."""
    return _read_csv(
        RAW_CUSTOMERS_PATH,
        source="customers",
        parse_dates=["RegistrationDate"],
        dtype={"CustomerID": str},
    )


def extract_orders() -> pd.DataFrame:
    """Extract raw orders CSV."""
    return _read_csv(
        RAW_ORDERS_PATH,
        source="orders",
        parse_dates=["InvoiceDate"],
        dtype={"OrderID": str, "CustomerID": str},
    )


def extract_transactions() -> pd.DataFrame:
    """Extract raw transactions CSV."""
    return _read_csv(
        RAW_TRANSACTIONS_PATH,
        source="transactions",
        parse_dates=["TransactionDate"],
        dtype={"TransactionID": str, "OrderID": str, "CustomerID": str},
    )


def extract_all() -> Dict[str, pd.DataFrame]:
    """
    Extract all data sources.

    Returns
    -------
    dict with keys: 'customers', 'orders', 'transactions'
    """
    logger.info("=== EXTRACT PHASE ===")
    result = {
        "customers": extract_customers(),
        "orders": extract_orders(),
        "transactions": extract_transactions(),
    }
    total_rows = sum(len(v) for v in result.values())
    logger.info("Extraction complete — %d total rows across %d sources.", total_rows, len(result))
    return result
