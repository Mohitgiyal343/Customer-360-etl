"""
etl/incremental.py
==================
Incremental load support using a JSON watermark file.

The watermark stores the last successfully processed date per data source.
On subsequent runs, only records after the watermark are processed.

Usage:
    from etl.incremental import IncrementalLoader
    loader = IncrementalLoader()
    new_orders = loader.filter_new_records(orders_df, "orders", date_col="InvoiceDate")
    loader.update_watermark("orders", new_orders["InvoiceDate"])
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

from config import WATERMARK_PATH

logger = logging.getLogger(__name__)


class IncrementalLoader:
    """
    Manages watermark-based incremental data loading.

    The watermark is persisted to a JSON file and loaded on instantiation.
    """

    def __init__(self, watermark_path: Path = WATERMARK_PATH) -> None:
        self.watermark_path = watermark_path
        self._watermarks: dict = self._load_watermarks()

    # ── Persistence ────────────────────────────────────────────────────────────

    def _load_watermarks(self) -> dict:
        if self.watermark_path.exists():
            with open(self.watermark_path, "r") as f:
                raw = json.load(f)
            logger.info("[incremental] Loaded watermarks: %s", raw)
            # Parse ISO strings back to datetime
            return {k: datetime.fromisoformat(v) for k, v in raw.items()}
        logger.info("[incremental] No watermark found — full load will be performed.")
        return {}

    def _save_watermarks(self) -> None:
        self.watermark_path.parent.mkdir(parents=True, exist_ok=True)
        serialisable = {k: v.isoformat() for k, v in self._watermarks.items()}
        with open(self.watermark_path, "w") as f:
            json.dump(serialisable, f, indent=2)
        logger.debug("[incremental] Watermarks saved: %s", serialisable)

    # ── Public API ─────────────────────────────────────────────────────────────

    def get_watermark(self, source: str) -> Optional[datetime]:
        """Return the stored watermark datetime for a given source, or None."""
        return self._watermarks.get(source)

    def update_watermark(self, source: str, date_series: pd.Series) -> None:
        """
        Update the watermark for a source to the max date in the given Series.

        Parameters
        ----------
        source      : Logical name of the source (e.g., 'orders')
        date_series : Series of datetime values from the latest batch
        """
        if date_series.empty:
            logger.debug("[incremental] No new records for '%s' — watermark unchanged.", source)
            return

        max_date = pd.to_datetime(date_series).max()
        if pd.isna(max_date):
            return

        self._watermarks[source] = max_date.to_pydatetime()
        self._save_watermarks()
        logger.info("[incremental] Watermark for '%s' updated to %s.", source, max_date)

    def filter_new_records(
        self,
        df: pd.DataFrame,
        source: str,
        date_col: str,
    ) -> pd.DataFrame:
        """
        Return only rows where `date_col` is strictly after the stored watermark.

        If no watermark exists for `source`, returns the full DataFrame
        (initial full load).

        Parameters
        ----------
        df        : Source DataFrame (must contain `date_col`)
        source    : Logical source name (e.g., 'orders')
        date_col  : Column to compare against the watermark

        Returns
        -------
        Filtered DataFrame
        """
        watermark = self.get_watermark(source)

        if watermark is None:
            logger.info(
                "[incremental] No watermark for '%s' — returning all %d rows.",
                source, len(df),
            )
            return df

        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        mask = df[date_col] > watermark
        new_df = df[mask].copy()

        logger.info(
            "[incremental] '%s': watermark=%s | new_rows=%d / total_rows=%d",
            source, watermark.isoformat(), len(new_df), len(df),
        )
        return new_df

    def reset_all(self) -> None:
        """Clear all watermarks (triggers full reload on next run)."""
        self._watermarks = {}
        if self.watermark_path.exists():
            self.watermark_path.unlink()
        logger.warning("[incremental] All watermarks reset — next run will be a full load.")
