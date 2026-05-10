"""
ml/features.py
==============
Feature engineering helpers for the churn prediction model.

Separates feature selection / encoding logic from the model itself
so features can be evolved independently.
"""

import logging
from typing import List, Tuple

import pandas as pd
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

# ── Feature Groups ─────────────────────────────────────────────────────────────

NUMERIC_FEATURES: List[str] = [
    "Age",
    "TenureDays",
    "TotalOrders",
    "TotalRevenue",
    "AvgOrderValue",
    "MaxOrderValue",
    "TotalQuantity",
    "UniqueCategories",
    "DaysSinceLastPurchase",
    "OrderFrequencyPerMonth",
    "CLV",
    "TotalTransactions",
    "TotalTransactionAmount",
    "AvgTransactionAmount",
]

CATEGORICAL_FEATURES: List[str] = [
    "Country",
    "Segment",
    "RevenueTier",
]

TARGET_COL = "IsChurned"


def get_feature_columns() -> List[str]:
    """Return the full list of feature column names."""
    return NUMERIC_FEATURES + [f"{c}_encoded" for c in CATEGORICAL_FEATURES]


def prepare_features(
    df: pd.DataFrame,
    encoders: dict = None,
    fit_encoders: bool = True,
) -> Tuple[pd.DataFrame, dict]:
    """
    Prepare a feature matrix from the customer_360 DataFrame.

    Parameters
    ----------
    df            : customer_360 DataFrame
    encoders      : Pre-fitted LabelEncoders (used in inference mode)
    fit_encoders  : If True, fit new LabelEncoders (training). Else, use provided.

    Returns
    -------
    X             : Feature DataFrame
    encoders      : Dict of fitted LabelEncoder objects
    """
    if encoders is None:
        encoders = {}

    df = df.copy()

    # ── Fill numeric nulls ─────────────────────────────────────────────────────
    for col in NUMERIC_FEATURES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        else:
            logger.warning("[features] Column '%s' not found — filling with 0.", col)
            df[col] = 0

    # ── Encode categoricals ────────────────────────────────────────────────────
    for col in CATEGORICAL_FEATURES:
        encoded_col = f"{col}_encoded"
        if col not in df.columns:
            logger.warning("[features] Categorical '%s' not found — filling with 0.", col)
            df[encoded_col] = 0
            continue

        df[col] = df[col].fillna("Unknown").astype(str)

        if fit_encoders:
            le = LabelEncoder()
            df[encoded_col] = le.fit_transform(df[col])
            encoders[col] = le
        else:
            le = encoders.get(col)
            if le is None:
                logger.warning("[features] No fitted encoder for '%s' — using 0.", col)
                df[encoded_col] = 0
            else:
                # Handle unseen labels
                df[encoded_col] = df[col].apply(
                    lambda v: le.transform([v])[0] if v in le.classes_ else -1
                )

    feature_cols = get_feature_columns()
    X = df[[c for c in feature_cols if c in df.columns]]

    logger.debug(
        "[features] Feature matrix shape: %s | columns: %s",
        X.shape, X.columns.tolist(),
    )
    return X, encoders
