"""
ml/rfm.py
=========
RFM (Recency, Frequency, Monetary) Segmentation

Computes RFM scores per customer and assigns segment labels.

Segments (classic):
  Champion        — bought recently, buys often, spends the most
  Loyal           — buys often, responds to promotions
  Potential Loyal — recent customers, moderate frequency
  At Risk         — spent a lot but haven't returned recently
  Can't Lose Them — made big purchases, now gone
  Lost            — lowest recency, frequency, and monetary
  New Customers   — bought recently but not often yet
  Promising       — recent but low spend

Scoring:
  R, F, M each scored 1–5 using quintile cuts.
  Combined RFM Score = R + F + M (3–15).
"""

import logging
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

REFERENCE_DATE = datetime.now()


def _quintile_score(series: pd.Series, ascending: bool = True) -> pd.Series:
    """
    Assign quintile labels (1–5) to a series.
    ascending=True  → higher value gets higher score
    ascending=False → lower value gets higher score (e.g., Recency)
    """
    try:
        labels = [1, 2, 3, 4, 5] if ascending else [5, 4, 3, 2, 1]
        return pd.qcut(series, q=5, labels=labels, duplicates="drop")
    except ValueError:
        # Fallback if not enough distinct values
        return pd.Series(3, index=series.index)


def assign_segment(row: pd.Series) -> str:
    """Map RFM scores to a human-readable segment label."""
    r, f, m = row["R_Score"], row["F_Score"], row["M_Score"]

    if r >= 4 and f >= 4 and m >= 4:
        return "Champion"
    elif r >= 3 and f >= 3 and m >= 4:
        return "Loyal"
    elif r >= 4 and f <= 2:
        return "New Customer"
    elif r >= 3 and f >= 2 and m >= 3:
        return "Potential Loyal"
    elif r <= 2 and f >= 3 and m >= 3:
        return "At Risk"
    elif r <= 2 and f >= 4 and m >= 4:
        return "Can't Lose Them"
    elif r <= 2 and f <= 2 and m <= 2:
        return "Lost"
    elif r >= 3 and f <= 2 and m <= 2:
        return "Promising"
    else:
        return "Need Attention"


class RFMSegmenter:
    """
    Compute RFM scores and segments from a customer_360 DataFrame.

    Expects columns:
      - CustomerID
      - DaysSinceLastPurchase  (Recency)
      - TotalOrders            (Frequency)
      - TotalRevenue           (Monetary)

    Returns the input DataFrame with extra columns:
      R_Score, F_Score, M_Score, RFM_Score, RFM_Segment
    """

    def __init__(self, reference_date: Optional[datetime] = None) -> None:
        self.reference_date = reference_date or REFERENCE_DATE

    def compute(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Compute RFM scores and segment labels.

        Parameters
        ----------
        df : customer_360 DataFrame

        Returns
        -------
        df with R_Score, F_Score, M_Score, RFM_Score, RFM_Segment columns
        """
        logger.info("[rfm] Computing RFM scores for %d customers ...", len(df))

        required = ["CustomerID", "DaysSinceLastPurchase", "TotalOrders", "TotalRevenue"]
        for col in required:
            if col not in df.columns:
                raise ValueError(f"[rfm] Missing required column: '{col}'")

        rfm = df[required].copy()

        # Cap 'no-order' recency at 9999 days for scoring purposes
        rfm["DaysSinceLastPurchase"] = rfm["DaysSinceLastPurchase"].replace(9999, np.nan)
        rfm["DaysSinceLastPurchase"] = rfm["DaysSinceLastPurchase"].fillna(
            rfm["DaysSinceLastPurchase"].max() * 1.5
        )

        # R (Recency) — lower days = better → score is REVERSED
        rfm["R_Score"] = _quintile_score(rfm["DaysSinceLastPurchase"], ascending=False)

        # F (Frequency) — higher orders = better
        rfm["F_Score"] = _quintile_score(rfm["TotalOrders"], ascending=True)

        # M (Monetary) — higher revenue = better
        rfm["M_Score"] = _quintile_score(rfm["TotalRevenue"], ascending=True)

        # Convert to numeric for summing
        for col in ["R_Score", "F_Score", "M_Score"]:
            rfm[col] = pd.to_numeric(rfm[col], errors="coerce").fillna(3).astype(int)

        rfm["RFM_Score"] = rfm["R_Score"] + rfm["F_Score"] + rfm["M_Score"]
        rfm["RFM_Segment"] = rfm.apply(assign_segment, axis=1)

        # Distribution log
        seg_dist = rfm["RFM_Segment"].value_counts()
        logger.info("[rfm] Segment distribution:\n%s", seg_dist.to_string())

        # Merge back into full DataFrame
        df = df.merge(
            rfm[["CustomerID", "R_Score", "F_Score", "M_Score", "RFM_Score", "RFM_Segment"]],
            on="CustomerID",
            how="left",
        )

        logger.info("[rfm] RFM segmentation complete.")
        return df
