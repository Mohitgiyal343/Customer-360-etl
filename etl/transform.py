"""
etl/transform.py
================
Transformation layer — cleans, enriches, and merges raw DataFrames
into the canonical Customer 360 view.

Transformations applied:
  1. Deduplication
  2. Missing-value imputation / dropping
  3. Type casting (dates, numeric)
  4. Feature engineering:
       • Revenue = Quantity × UnitPrice × (1 − DiscountPct)
       • Total orders per customer
       • Last purchase date
       • Days since last purchase
       • Customer Lifetime Value (CLV)
       • Average order value
       • Order frequency (orders per month)
  5. Churn label derivation
  6. Merge into customer_360
"""

import logging
from datetime import datetime
from typing import Dict, Tuple

import numpy as np
import pandas as pd

from config import CHURN_DAYS_THRESHOLD

logger = logging.getLogger(__name__)

# ── Reference date for recency calculations ────────────────────────────────────
# Uses now() for production; overridden per-run to the max order date in test/historical data
REFERENCE_DATE = datetime.now()


# ── Step 1: Clean customers ────────────────────────────────────────────────────

def clean_customers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the raw customers DataFrame.

    Operations:
      - Drop exact duplicate rows
      - Deduplicate on CustomerID (keep first)
      - Fill missing Age with median
      - Fill missing City with 'Unknown'
      - Fill missing Phone with 'N/A'
      - Strip whitespace from string fields
    """
    logger.info("[transform] Cleaning customers — initial rows: %d", len(df))

    # Exact duplicate rows
    before = len(df)
    df = df.drop_duplicates()
    logger.debug("  Removed %d exact duplicate rows.", before - len(df))

    # CustomerID-level deduplication (keep first occurrence)
    before = len(df)
    df = df.drop_duplicates(subset=["CustomerID"], keep="first")
    logger.debug("  Removed %d CustomerID duplicates.", before - len(df))

    # String cleanup
    str_cols = ["FirstName", "LastName", "Email", "Country", "City", "Segment"]
    for col in str_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # Missing value imputation
    if "Age" in df.columns:
        median_age = df["Age"].median()
        df["Age"] = pd.to_numeric(df["Age"], errors="coerce").fillna(median_age).astype(int)

    df["City"] = df["City"].replace("nan", "Unknown").fillna("Unknown")
    df["Phone"] = df["Phone"].replace("nan", "N/A").fillna("N/A")

    # Ensure RegistrationDate is datetime
    df["RegistrationDate"] = pd.to_datetime(df["RegistrationDate"], errors="coerce")

    # Derived: customer tenure in days
    df["TenureDays"] = (REFERENCE_DATE - df["RegistrationDate"]).dt.days.clip(lower=0)

    logger.info("[transform] Customers cleaned — rows: %d", len(df))
    return df.reset_index(drop=True)


# ── Step 2: Clean orders ───────────────────────────────────────────────────────

def clean_orders(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the raw orders DataFrame.

    Operations:
      - Drop duplicate OrderIDs
      - Drop rows with missing Quantity or UnitPrice (cannot compute Revenue)
      - Fill missing OrderStatus with 'Unknown'
      - Ensure numeric types for Quantity, UnitPrice, DiscountPct
      - Calculate / recalculate Revenue
    """
    logger.info("[transform] Cleaning orders — initial rows: %d", len(df))

    # Deduplicate
    before = len(df)
    df = df.drop_duplicates(subset=["OrderID"], keep="first")
    logger.debug("  Removed %d duplicate OrderIDs.", before - len(df))

    # Numeric coercion
    for col in ["Quantity", "UnitPrice", "ShippingCost", "DiscountPct"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop uncalculable rows
    before = len(df)
    df = df.dropna(subset=["Quantity", "UnitPrice"])
    logger.debug("  Dropped %d rows with null Quantity/UnitPrice.", before - len(df))

    # Fill optional fields
    df["OrderStatus"] = df["OrderStatus"].fillna("Unknown")
    df["DiscountPct"] = df["DiscountPct"].fillna(0.0).clip(0, 1)
    df["ShippingCost"] = df["ShippingCost"].fillna(0.0)

    # Ensure InvoiceDate is datetime
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    df = df.dropna(subset=["InvoiceDate"])  # Cannot use orders without dates

    # Recalculate Revenue
    df["Revenue"] = np.round(
        df["Quantity"] * df["UnitPrice"] * (1 - df["DiscountPct"]), 2
    )
    df["NetRevenue"] = df["Revenue"] - df["ShippingCost"].clip(lower=0)

    logger.info("[transform] Orders cleaned — rows: %d", len(df))
    return df.reset_index(drop=True)


# ── Step 3: Clean transactions ────────────────────────────────────────────────

def clean_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the raw transactions DataFrame.

    Operations:
      - Drop duplicate TransactionIDs
      - Drop rows with missing Amount
      - Filter to successful transactions only (for CLV calc)
    """
    logger.info("[transform] Cleaning transactions — initial rows: %d", len(df))

    before = len(df)
    df = df.drop_duplicates(subset=["TransactionID"], keep="first")
    logger.debug("  Removed %d duplicate TransactionIDs.", before - len(df))

    df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")
    before = len(df)
    df = df.dropna(subset=["Amount"])
    logger.debug("  Dropped %d rows with null Amount.", before - len(df))

    df["TransactionDate"] = pd.to_datetime(df["TransactionDate"], errors="coerce")

    logger.info("[transform] Transactions cleaned — rows: %d", len(df))
    return df.reset_index(drop=True)


# ── Step 4: Feature Engineering ───────────────────────────────────────────────

def engineer_customer_features(
    customers: pd.DataFrame,
    orders: pd.DataFrame,
    transactions: pd.DataFrame,
) -> pd.DataFrame:
    """
    Aggregate order and transaction data to derive per-customer features.

    Returns a DataFrame keyed by CustomerID with engineered features.
    """
    logger.info("[transform] Engineering customer features ...")

    # ── Order aggregations ─────────────────────────────────────────────────────
    completed_orders = orders[orders["OrderStatus"] != "Cancelled"].copy()

    order_agg = completed_orders.groupby("CustomerID").agg(
        TotalOrders=("OrderID", "count"),
        TotalRevenue=("Revenue", "sum"),
        TotalNetRevenue=("NetRevenue", "sum"),
        AvgOrderValue=("Revenue", "mean"),
        MaxOrderValue=("Revenue", "max"),
        TotalQuantity=("Quantity", "sum"),
        FirstPurchaseDate=("InvoiceDate", "min"),
        LastPurchaseDate=("InvoiceDate", "max"),
        UniqueCategories=("ProductCategory", "nunique"),
    ).reset_index()

    order_agg["TotalRevenue"] = order_agg["TotalRevenue"].round(2)
    order_agg["AvgOrderValue"] = order_agg["AvgOrderValue"].round(2)

    # Days since last purchase (recency)
    order_agg["DaysSinceLastPurchase"] = (
        REFERENCE_DATE - order_agg["LastPurchaseDate"]
    ).dt.days.clip(lower=0)

    # Tenure from first purchase
    order_agg["DaysSinceFirstPurchase"] = (
        REFERENCE_DATE - order_agg["FirstPurchaseDate"]
    ).dt.days.clip(lower=1)

    # Order frequency: orders per month of active period
    order_agg["OrderFrequencyPerMonth"] = np.round(
        order_agg["TotalOrders"] / (order_agg["DaysSinceFirstPurchase"] / 30.44), 4
    )

    # ── Transaction aggregations ───────────────────────────────────────────────
    success_txn = transactions[transactions["Status"] == "Success"].copy()
    txn_agg = success_txn.groupby("CustomerID").agg(
        TotalTransactions=("TransactionID", "count"),
        TotalTransactionAmount=("Amount", "sum"),
        AvgTransactionAmount=("Amount", "mean"),
    ).reset_index()
    txn_agg["TotalTransactionAmount"] = txn_agg["TotalTransactionAmount"].round(2)
    txn_agg["AvgTransactionAmount"] = txn_agg["AvgTransactionAmount"].round(2)

    # ── Customer Lifetime Value (simplified CLV) ─────────────────────────────
    # CLV = AvgOrderValue × OrderFrequency(per year) × AvgLifespan(years)
    # We use a simplified heuristic: TotalRevenue projected over 3-year lifespan
    order_agg["CLV"] = np.round(
        (order_agg["TotalRevenue"] / order_agg["DaysSinceFirstPurchase"].clip(lower=1))
        * 365 * 3,
        2,
    )

    # ── Merge all aggs onto customer base ──────────────────────────────────────
    df = (
        customers
        .merge(order_agg, on="CustomerID", how="left")
        .merge(txn_agg, on="CustomerID", how="left")
    )

    # ── Fill new customers with zeroes ─────────────────────────────────────────
    numeric_fills = {
        "TotalOrders": 0,
        "TotalRevenue": 0.0,
        "TotalNetRevenue": 0.0,
        "AvgOrderValue": 0.0,
        "MaxOrderValue": 0.0,
        "TotalQuantity": 0,
        "UniqueCategories": 0,
        "DaysSinceLastPurchase": 9999,
        "DaysSinceFirstPurchase": 0,
        "OrderFrequencyPerMonth": 0.0,
        "CLV": 0.0,
        "TotalTransactions": 0,
        "TotalTransactionAmount": 0.0,
        "AvgTransactionAmount": 0.0,
    }
    for col, fill in numeric_fills.items():
        if col in df.columns:
            df[col] = df[col].fillna(fill)

    logger.info("[transform] Feature engineering complete — %d customers.", len(df))
    return df


# ── Step 5: Churn Label ────────────────────────────────────────────────────────

def add_churn_label(df: pd.DataFrame, threshold_days: int = CHURN_DAYS_THRESHOLD) -> pd.DataFrame:
    """
    Binary churn label:
      1 = churned  (no purchase in `threshold_days` days OR 0 orders)
      0 = active
    """
    df["IsChurned"] = (
        (df["DaysSinceLastPurchase"] >= threshold_days) | (df["TotalOrders"] == 0)
    ).astype(int)

    churn_rate = df["IsChurned"].mean()
    logger.info(
        "[transform] Churn label applied — threshold=%d days | churn_rate=%.1f%%",
        threshold_days, churn_rate * 100,
    )
    return df


# ── Step 6: Revenue bands / segmentation helper ───────────────────────────────

def add_revenue_bands(df: pd.DataFrame) -> pd.DataFrame:
    """Categorise customers into revenue tiers for reporting."""
    bins = [-1, 0, 500, 2000, 10_000, float("inf")]
    labels = ["No Revenue", "Low", "Medium", "High", "VIP"]
    df["RevenueTier"] = pd.cut(df["TotalRevenue"], bins=bins, labels=labels)
    df["RevenueTier"] = df["RevenueTier"].astype(str)
    return df


# ── Public API ─────────────────────────────────────────────────────────────────

def transform_all(
    raw: Dict[str, pd.DataFrame],
    reference_date: datetime = None,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Full transformation pipeline.

    Parameters
    ----------
    raw : dict returned by extract.extract_all()

    Returns
    -------
    customers_clean  : pd.DataFrame  (dim_customers)
    orders_clean     : pd.DataFrame  (fact_orders)
    customer_360     : pd.DataFrame  (merged, feature-rich customer view)
    """
    logger.info("=== TRANSFORM PHASE ===")

    # Derive reference date from data if not supplied
    # This ensures churn labels are meaningful relative to the dataset period
    orders_tmp = pd.to_datetime(raw["orders"]["InvoiceDate"], errors="coerce")
    data_max_date = orders_tmp.max()
    if reference_date is None and not pd.isna(data_max_date):
        reference_date = data_max_date.to_pydatetime()
        logger.info("[transform] Reference date set to data max: %s", reference_date.date())

    # Override module-level REFERENCE_DATE for this run
    import etl.transform as _self_mod
    _self_mod.REFERENCE_DATE = reference_date or datetime.now()

    customers_clean = clean_customers(raw["customers"])
    orders_clean = clean_orders(raw["orders"])
    txn_clean = clean_transactions(raw["transactions"])

    customer_360 = engineer_customer_features(customers_clean, orders_clean, txn_clean)
    customer_360 = add_churn_label(customer_360)
    customer_360 = add_revenue_bands(customer_360)

    # Timestamp the run
    customer_360["ETLTimestamp"] = datetime.now()

    logger.info(
        "Transformation complete — dim_customers=%d | fact_orders=%d | customer_360=%d",
        len(customers_clean), len(orders_clean), len(customer_360),
    )
    return customers_clean, orders_clean, customer_360
