"""
streaming/event_producer.py
============================
Simulates a Kafka-style real-time event producer for the Customer 360 platform.

In production this would publish to a real Kafka topic (using confluent-kafka or
kafka-python).  Here we simulate the message bus using a thread-safe in-memory
queue so the pipeline works without requiring a running Kafka cluster.  Swapping
to real Kafka requires only changing the ``_publish`` method.

Event types produced:
    • transaction_created  — customer completes a purchase
    • page_view            — customer views a product page
    • support_ticket       — customer raises a support request
    • login                — customer authentication event

Usage (standalone):
    python streaming/event_producer.py --events 500 --rate 10

Usage (as library):
    from streaming.event_producer import EventProducer
    producer = EventProducer()
    producer.start(n_events=200, rate_per_sec=5)
"""

import argparse
import json
import logging
import queue
import random
import threading
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Shared in-memory message bus (thread-safe) ─────────────────────────────────
# Each queue entry is a JSON-serialisable dict — equivalent to a Kafka message.
MESSAGE_BUS: queue.Queue = queue.Queue(maxsize=50_000)

# ── Configuration ──────────────────────────────────────────────────────────────
COUNTRIES = [
    "United Kingdom", "Germany", "France", "Spain", "Italy",
    "Netherlands", "United States", "Australia", "Belgium", "Sweden",
]
SEGMENTS = ["Enterprise", "SMB", "Startup", "Individual"]
CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Toys", "Beauty"]
PAYMENT_METHODS = ["Credit Card", "PayPal", "Bank Transfer", "Debit Card"]
EVENT_TYPES = ["transaction_created", "page_view", "support_ticket", "login"]
EVENT_WEIGHTS = [0.40, 0.35, 0.15, 0.10]   # realistic distribution


def _make_customer_id(n_customers: int = 500) -> str:
    """Return a random customer ID matching data/raw/customers.csv format."""
    return f"CUST{str(random.randint(1, n_customers)).zfill(5)}"


def _make_transaction_event(customer_id: str) -> Dict[str, Any]:
    qty = random.randint(1, 20)
    price = round(random.uniform(5.0, 500.0), 2)
    discount = round(random.uniform(0.0, 0.30), 4)
    return {
        "event_type": "transaction_created",
        "event_id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": {
            "order_id": f"LIVE{str(uuid.uuid4().int)[:8]}",
            "product_category": random.choice(CATEGORIES),
            "quantity": qty,
            "unit_price": price,
            "discount_pct": discount,
            "revenue": round(qty * price * (1 - discount), 2),
            "payment_method": random.choice(PAYMENT_METHODS),
            "country": random.choice(COUNTRIES),
            "status": random.choices(
                ["Success", "Failed", "Pending"],
                weights=[0.88, 0.07, 0.05]
            )[0],
        },
    }


def _make_page_view_event(customer_id: str) -> Dict[str, Any]:
    return {
        "event_type": "page_view",
        "event_id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": {
            "page": random.choice(["/product", "/cart", "/checkout", "/homepage", "/search"]),
            "product_category": random.choice(CATEGORIES),
            "session_duration_sec": random.randint(5, 600),
            "device": random.choice(["desktop", "mobile", "tablet"]),
        },
    }


def _make_support_ticket_event(customer_id: str) -> Dict[str, Any]:
    return {
        "event_type": "support_ticket",
        "event_id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": {
            "ticket_id": f"TKT{str(uuid.uuid4().int)[:6]}",
            "category": random.choice(["billing", "delivery", "product", "refund", "technical"]),
            "severity": random.choice(["low", "medium", "high"]),
            "channel": random.choice(["email", "chat", "phone"]),
        },
    }


def _make_login_event(customer_id: str) -> Dict[str, Any]:
    return {
        "event_type": "login",
        "event_id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": {
            "device": random.choice(["desktop", "mobile", "tablet"]),
            "location_country": random.choice(COUNTRIES),
            "success": random.choices([True, False], weights=[0.97, 0.03])[0],
        },
    }


EVENT_FACTORIES = {
    "transaction_created": _make_transaction_event,
    "page_view": _make_page_view_event,
    "support_ticket": _make_support_ticket_event,
    "login": _make_login_event,
}


class EventProducer:
    """
    Simulate a Kafka producer that emits customer behavioural events.

    Parameters
    ----------
    bus         : Shared queue that acts as the message bus.
    n_customers : Number of synthetic customer IDs to sample from.
    seed        : Random seed for reproducibility.

    Example
    -------
    producer = EventProducer()
    producer.start(n_events=1000, rate_per_sec=20)
    """

    def __init__(
        self,
        bus: queue.Queue = MESSAGE_BUS,
        n_customers: int = 500,
        seed: Optional[int] = None,
    ) -> None:
        self.bus = bus
        self.n_customers = n_customers
        self._stop_event = threading.Event()
        self._produced = 0
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

    def _make_event(self) -> Dict[str, Any]:
        """Generate a single random event."""
        event_type = random.choices(EVENT_TYPES, weights=EVENT_WEIGHTS)[0]
        customer_id = _make_customer_id(self.n_customers)
        return EVENT_FACTORIES[event_type](customer_id)

    def _publish(self, event: Dict[str, Any]) -> None:
        """
        Publish an event to the message bus.

        In production: replace with kafka_producer.produce(topic, json.dumps(event))
        """
        try:
            self.bus.put_nowait(event)
            self._produced += 1
        except queue.Full:
            logger.warning("[producer] Message bus full — dropping event %s", event["event_id"])

    def start(
        self,
        n_events: int = 1000,
        rate_per_sec: float = 10.0,
        run_in_thread: bool = False,
    ) -> Optional[threading.Thread]:
        """
        Emit `n_events` events at `rate_per_sec` events-per-second.

        Parameters
        ----------
        n_events       : Total events to produce (0 = unlimited until stop() called).
        rate_per_sec   : Target throughput.
        run_in_thread  : If True, run the producer in a background thread.

        Returns
        -------
        Thread object if run_in_thread=True, else None (blocking call).
        """
        if run_in_thread:
            t = threading.Thread(target=self._produce_loop, args=(n_events, rate_per_sec), daemon=True)
            t.start()
            logger.info("[producer] Started in background thread (n_events=%d, rate=%.1f/s)", n_events, rate_per_sec)
            return t

        self._produce_loop(n_events, rate_per_sec)
        return None

    def _produce_loop(self, n_events: int, rate_per_sec: float) -> None:
        self._stop_event.clear()
        interval = 1.0 / max(rate_per_sec, 0.01)
        count = 0

        logger.info("[producer] Emitting events — target=%d | rate=%.1f/s", n_events, rate_per_sec)

        while not self._stop_event.is_set():
            if n_events > 0 and count >= n_events:
                break

            event = self._make_event()
            self._publish(event)
            count += 1

            if count % 100 == 0:
                logger.debug("[producer] Emitted %d events (bus size=%d)", count, self.bus.qsize())

            time.sleep(interval)

        logger.info("[producer] Done — emitted %d events total.", count)

    def stop(self) -> None:
        """Signal the producer loop to stop after the current event."""
        self._stop_event.set()

    @property
    def produced_count(self) -> int:
        return self._produced


# ── CLI ────────────────────────────────────────────────────────────────────────

def _cli() -> None:
    parser = argparse.ArgumentParser(description="Customer 360 — Streaming Event Producer")
    parser.add_argument("--events", type=int, default=500, help="Number of events to produce (default 500)")
    parser.add_argument("--rate", type=float, default=10.0, help="Events per second (default 10)")
    parser.add_argument("--output", type=str, default=None, help="Optional JSONL file to write events to")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")

    producer = EventProducer(seed=42)
    producer.start(n_events=args.events, rate_per_sec=args.rate)

    # Drain the bus to a JSONL file if requested
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        written = 0
        with open(out_path, "w") as f:
            while not MESSAGE_BUS.empty():
                event = MESSAGE_BUS.get_nowait()
                f.write(json.dumps(event) + "\n")
                written += 1
        print(f"[producer] Events written to {out_path} ({written} records)")


if __name__ == "__main__":
    _cli()
