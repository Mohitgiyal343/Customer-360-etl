"""
streaming/stream_processor.py
==============================
Consumes validated events from the message bus and:

1. Aggregates real-time transaction events into a running CustomerActivity buffer.
2. Writes micro-batch summaries to data/processed/streaming_activity.csv
3. Detects anomalies (high-value transactions, rapid repeated failures).
4. Exposes a live summary of per-customer activity.

This replaces a Spark Structured Streaming job or Flink application for
development/CI environments.  Swap in the relevant stream processor by
replacing StreamProcessor.handle_event() as the consumer handler.

Architecture:
    EventProducer → MESSAGE_BUS → EventConsumer(handler=StreamProcessor.handle_event)
                                                    ↓
                                         CustomerActivity buffer (in-memory)
                                                    ↓
                                   (flush every N events or T seconds)
                                                    ↓
                               data/processed/streaming_activity.csv

Usage:
    python streaming/stream_processor.py --events 1000 --rate 50 --flush 100
"""

import argparse
import csv
import logging
import threading
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# ── Output path ────────────────────────────────────────────────────────────────
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "processed" / "streaming_activity.csv"

# ── Anomaly thresholds ─────────────────────────────────────────────────────────
HIGH_VALUE_THRESHOLD = 1_000.0      # Revenue ≥ £1000 in one transaction
RAPID_FAILURE_WINDOW_SEC = 60       # Failure detection window
RAPID_FAILURE_COUNT = 3             # ≥3 failures in one minute = alert


class CustomerActivity:
    """
    Per-customer running aggregation of streaming events.

    Fields updated in real time as events arrive, without locking.
    (Thread safety is handled by StreamProcessor at the dict level.)
    """

    __slots__ = [
        "customer_id",
        "total_events",
        "transaction_count",
        "total_revenue_live",
        "page_views",
        "support_tickets",
        "logins",
        "last_event_ts",
        "failed_txn_timestamps",
        "anomalies",
    ]

    def __init__(self, customer_id: str) -> None:
        self.customer_id = customer_id
        self.total_events = 0
        self.transaction_count = 0
        self.total_revenue_live = 0.0
        self.page_views = 0
        self.support_tickets = 0
        self.logins = 0
        self.last_event_ts: Optional[str] = None
        self.failed_txn_timestamps: List[float] = []   # unix timestamps
        self.anomalies: List[str] = []

    def to_dict(self) -> dict:
        return {
            "customer_id": self.customer_id,
            "total_events": self.total_events,
            "transaction_count": self.transaction_count,
            "total_revenue_live": round(self.total_revenue_live, 2),
            "page_views": self.page_views,
            "support_tickets": self.support_tickets,
            "logins": self.logins,
            "last_event_ts": self.last_event_ts,
            "anomaly_flags": "|".join(self.anomalies) if self.anomalies else None,
        }


class StreamProcessor:
    """
    Process validated events and maintain a real-time CustomerActivity buffer.

    Parameters
    ----------
    flush_every_n   : Flush buffer to CSV after this many events.
    flush_every_sec : Also flush on a timer (whichever fires first).
    output_path     : Path to the output CSV file.

    Example
    -------
    processor = StreamProcessor(flush_every_n=200, output_path=Path("out.csv"))
    processor.start_flush_timer()

    consumer = EventConsumer(handler=processor.handle_event)
    producer = EventProducer()
    producer.start(n_events=1000, rate_per_sec=50)
    consumer.start()
    """

    def __init__(
        self,
        flush_every_n: int = 500,
        flush_every_sec: float = 30.0,
        output_path: Path = DEFAULT_OUTPUT,
    ) -> None:
        self.flush_every_n = flush_every_n
        self.flush_every_sec = flush_every_sec
        self.output_path = output_path

        self._buffer: Dict[str, CustomerActivity] = {}
        self._lock = threading.Lock()
        self._event_count = 0
        self._flush_count = 0
        self._anomaly_log: List[dict] = []

    # ── Event Routing ──────────────────────────────────────────────────────────

    def handle_event(self, event: dict) -> None:
        """Entry point called by EventConsumer for each validated event."""
        customer_id = event.get("customer_id", "UNKNOWN")
        event_type = event.get("event_type", "unknown")
        payload = event.get("payload", {})
        ts = event.get("timestamp")

        with self._lock:
            if customer_id not in self._buffer:
                self._buffer[customer_id] = CustomerActivity(customer_id)

            activity = self._buffer[customer_id]
            activity.total_events += 1
            activity.last_event_ts = ts

            if event_type == "transaction_created":
                self._process_transaction(activity, payload)
            elif event_type == "page_view":
                activity.page_views += 1
            elif event_type == "support_ticket":
                activity.support_tickets += 1
            elif event_type == "login":
                activity.logins += 1

            self._event_count += 1

            if self._event_count % self.flush_every_n == 0:
                self._flush(triggered_by="n_events")

    def _process_transaction(self, activity: CustomerActivity, payload: dict) -> None:
        """Update activity record and check for anomalies."""
        revenue = float(payload.get("revenue", 0.0))
        status = payload.get("status", "")

        if status == "Success":
            activity.transaction_count += 1
            activity.total_revenue_live += revenue

            if revenue >= HIGH_VALUE_THRESHOLD:
                flag = f"HIGH_VALUE_TXN:{revenue:.2f}"
                activity.anomalies.append(flag)
                logger.warning("[stream] Anomaly — %s | customer=%s", flag, activity.customer_id)

        elif status == "Failed":
            now_ts = time.time()
            activity.failed_txn_timestamps.append(now_ts)
            # Keep only last 60 seconds
            activity.failed_txn_timestamps = [
                t for t in activity.failed_txn_timestamps
                if now_ts - t <= RAPID_FAILURE_WINDOW_SEC
            ]
            if len(activity.failed_txn_timestamps) >= RAPID_FAILURE_COUNT:
                flag = f"RAPID_FAILURES:{len(activity.failed_txn_timestamps)}"
                if flag not in activity.anomalies:
                    activity.anomalies.append(flag)
                    logger.warning("[stream] Anomaly — %s | customer=%s", flag, activity.customer_id)

    # ── Flush ──────────────────────────────────────────────────────────────────

    def _flush(self, triggered_by: str = "manual") -> None:
        """
        Write current buffer to CSV.  Appends if file exists (idempotent per flush).
        """
        if not self._buffer:
            return

        records = [a.to_dict() for a in self._buffer.values()]
        df = pd.DataFrame(records)
        df["flush_ts"] = datetime.utcnow().isoformat()
        df["flush_id"] = self._flush_count

        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        write_header = not self.output_path.exists() or self._flush_count == 0

        df.to_csv(self.output_path, mode="a" if not write_header else "w", header=write_header, index=False)

        self._flush_count += 1
        logger.info(
            "[stream] Flushed %d customer records → %s (trigger=%s, flush#%d)",
            len(records), self.output_path, triggered_by, self._flush_count,
        )

    def start_flush_timer(self) -> threading.Thread:
        """Start a background thread that flushes on a timer."""
        def _timer_loop():
            while True:
                time.sleep(self.flush_every_sec)
                with self._lock:
                    self._flush(triggered_by="timer")

        t = threading.Thread(target=_timer_loop, daemon=True)
        t.start()
        logger.info("[stream] Flush timer started (every %.0fs)", self.flush_every_sec)
        return t

    def final_flush(self) -> None:
        """Call after the producer/consumer have finished to write remaining data."""
        with self._lock:
            self._flush(triggered_by="final")

    # ── Stats ──────────────────────────────────────────────────────────────────

    def summary(self) -> dict:
        with self._lock:
            customers = len(self._buffer)
            total_live_revenue = sum(a.total_revenue_live for a in self._buffer.values())
            total_txns = sum(a.transaction_count for a in self._buffer.values())
            anomalies = sum(1 for a in self._buffer.values() if a.anomalies)
        return {
            "unique_customers": customers,
            "total_events_processed": self._event_count,
            "total_live_revenue": round(total_live_revenue, 2),
            "total_live_transactions": total_txns,
            "customers_with_anomalies": anomalies,
            "flushes": self._flush_count,
        }


# ── CLI — end-to-end streaming demo ───────────────────────────────────────────

def _cli() -> None:
    parser = argparse.ArgumentParser(description="Customer 360 — Streaming Pipeline Demo")
    parser.add_argument("--events", type=int, default=1000, help="Total events to produce (default 1000)")
    parser.add_argument("--rate", type=float, default=50.0, help="Events per second (default 50)")
    parser.add_argument("--flush", type=int, default=200, help="Flush buffer every N events (default 200)")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT), help="Output CSV path")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")

    from streaming.event_producer import EventProducer
    from streaming.event_consumer import EventConsumer

    output = Path(args.output)
    processor = StreamProcessor(flush_every_n=args.flush, output_path=output)
    processor.start_flush_timer()

    consumer = EventConsumer(handler=processor.handle_event)
    producer = EventProducer(seed=42)

    logger.info("=" * 60)
    logger.info("  Customer 360 — Streaming Pipeline Demo")
    logger.info("  Events=%d | Rate=%.0f/s | Flush every %d events", args.events, args.rate, args.flush)
    logger.info("=" * 60)

    # Start consumer in background
    consumer.start(run_in_thread=True)

    # Run producer (blocking)
    producer.start(n_events=args.events, rate_per_sec=args.rate)

    # Let consumer drain
    time.sleep(2.0)
    consumer.stop()

    # Final flush
    processor.final_flush()

    summary = processor.summary()
    consumer_stats = consumer.stats()

    logger.info("=" * 60)
    logger.info("  Stream Processor Summary: %s", summary)
    logger.info("  Consumer Stats: %s", consumer_stats)
    logger.info("  Output → %s", output)
    logger.info("=" * 60)


if __name__ == "__main__":
    _cli()
