"""
dashboard/export_powerbi.py
============================
Prepares and exports the final Customer 360 dataset for Power BI consumption.

Output file: dashboard/customer_360_powerbi.csv

Fields included:
  - Customer demographics
  - Revenue metrics (Total, Average, CLV)
  - RFM Scores and Segment
  - Churn Probability and Risk Band
  - Purchase trend fields
  - Customer Segmentation
"""

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

DASHBOARD_DIR = Path(__file__).resolve().parent
POWERBI_OUTPUT = DASHBOARD_DIR / "customer_360_powerbi.csv"

# Columns to include in the Power BI export (ordered for readability)
POWERBI_COLUMNS = [
    # Identity
    "CustomerID", "FirstName", "LastName", "Email",
    # Demographics
    "Age", "Gender", "Country", "City", "Segment",
    "RegistrationDate", "TenureDays", "IsActive",
    # Purchase behaviour
    "TotalOrders", "TotalRevenue", "TotalNetRevenue",
    "AvgOrderValue", "MaxOrderValue", "TotalQuantity",
    "UniqueCategories", "FirstPurchaseDate", "LastPurchaseDate",
    "DaysSinceLastPurchase", "OrderFrequencyPerMonth",
    # CLV & Transactions
    "CLV", "TotalTransactions", "TotalTransactionAmount", "AvgTransactionAmount",
    # Segmentation
    "RevenueTier", "R_Score", "F_Score", "M_Score", "RFM_Score", "RFM_Segment",
    # Churn
    "IsChurned", "ChurnProbability", "ChurnPrediction", "ChurnRiskBand",
    # Metadata
    "ETLTimestamp",
]

# Derived KPI columns added during export
EXPORT_KPI_COLUMNS = {
    "RevenuePerDay": lambda df: (df["TotalRevenue"] / df["TenureDays"].clip(lower=1)).round(2),
    "IsHighValue": lambda df: (df["TotalRevenue"] > df["TotalRevenue"].quantile(0.75)).astype(int),
    "IsNewCustomer": lambda df: (df["TenureDays"] <= 30).astype(int),
    "ExportDate": lambda _: datetime.now().strftime("%Y-%m-%d"),
}


def export_powerbi_dataset(df: pd.DataFrame, output_path: Path = POWERBI_OUTPUT) -> Path:
    """
    Export a Power BI-optimised CSV from the customer_360 DataFrame.

    Parameters
    ----------
    df          : Enriched customer_360 DataFrame
    output_path : Destination path for the CSV

    Returns
    -------
    Path to the exported file
    """
    logger.info("[dashboard] Preparing Power BI export ...")

    export_df = df.copy()

    # ── Add derived KPI columns ────────────────────────────────────────────────
    for col_name, func in EXPORT_KPI_COLUMNS.items():
        try:
            export_df[col_name] = func(export_df)
        except Exception as exc:
            logger.warning("[dashboard] Could not compute '%s': %s", col_name, exc)

    # ── Select and order columns ───────────────────────────────────────────────
    all_export_cols = POWERBI_COLUMNS + list(EXPORT_KPI_COLUMNS.keys())
    available_cols = [c for c in all_export_cols if c in export_df.columns]
    export_df = export_df[available_cols]

    # ── Round floats for readability ───────────────────────────────────────────
    float_cols = export_df.select_dtypes(include=["float64"]).columns
    export_df[float_cols] = export_df[float_cols].round(2)

    # ── Write output ───────────────────────────────────────────────────────────
    output_path.parent.mkdir(parents=True, exist_ok=True)
    export_df.to_csv(output_path, index=False)

    logger.info(
        "[dashboard] Power BI export complete — %d rows × %d columns → %s",
        len(export_df), len(export_df.columns), output_path,
    )
    return output_path
