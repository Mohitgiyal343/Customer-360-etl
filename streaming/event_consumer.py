"""
streaming/event_consumer.py
============================
Simulates a Kafka consumer that reads events from the shared message bus,
validates schema, and routes them to the stream processor.

In production this would call:
    consumer = KafkaConsumer(topic, bootstrap_servers=..., value_deserializer=...)
    for msg in consumer:
        process(msg.value)

Here we poll from the thread-safe in-memory queue (MESSAGE_BUS) instead.

Features:
    • Configurable poll interval and batch size
    • Schema validation per event type
    • Dead-letter queue (DLQ) for malformed events
    • Structured logging with event-type breakdown
    • Graceful shutdown via threading.Event

Usage:
    from streaming.event_consumer import EventConsumer
    consumer = EventConsumer()
    consumer.start(run_in_thread=True)
"""

import json
import logging
import queue
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

# ── Import shared bus ──────────────────────────────────────────────────────────
from streaming.event_producer import MESSAGE_BUS


# ── Schema definitions — minimum required fields per event type ────────────────
EVENT_SCHEMAS: Dict[str, Set[str]] = {
    "transaction_created": {"event_id", "customer_id", "timestamp", "payload"},
    "page_view":           {"event_id", "customer_id", "timestamp", "payload"},
    "support_ticket":      {"event_id", "customer_id", "timestamp", "payload"},
    "login":               {"event_id", "customer_id", "timestamp", "payload"},
}

PAYLOAD_SCHEMAS: Dict[str, Set[str]] = {
    "transaction_created": {"order_id", "revenue", "status"},
    "page_view":           {"page"},
    "support_ticket":      {"ticket_id", "severity"},
    "login":               {"success"},
}


class DeadLetterQueue:
    """
    Captures events that fail validation.

    In production: write to a Kafka DLQ topic or an S3 error bucket.
    Here: store in-memory + optionally on disk.
    """

    def __init__(self, max_size: int = 5000) -> None:
        self._events: List[dict] = []
        self._lock = threading.Lock()
        self.max_size = max_size

    def add(self, event: dict, reason: str) -> None:
        with self._lock:
            if len(self._events) < self.max_size:
                self._events.append({"event": event, "reason": reason, "dlq_ts": datetime.utcnow().isoformat()})

    def flush_to_file(self, path: Path) -> int:
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            events = list(self._events)
        with open(path, "w") as f:
            for e in events:
                f.write(json.dumps(e) + "\n")
        logger.info("[consumer] DLQ flushed %d events → %s", len(events), path)
        return len(events)

    @property
    def count(self) -> int:
        return len(self._events)


def _validate_event(event: dict) -> Optional[str]:
    """
    Validate event structure.

    Returns
    -------
    None if valid; a string error message if invalid.
    """
    if not isinstance(event, dict):
        return "Event is not a dict"

    event_type = event.get("event_type")
    if event_type not in EVENT_SCHEMAS:
        return f"Unknown event_type: '{event_type}'"

    required_top = EVENT_SCHEMAS[event_type]
    missing_top = required_top - set(event.keys())
    if missing_top:
        return f"Missing top-level fields: {missing_top}"

    payload = event.get("payload", {})
    required_payload = PAYLOAD_SCHEMAS.get(event_type, set())
    missing_payload = required_payload - set(payload.keys())
    if missing_payload:
        return f"Missing payload fields: {missing_payload}"

    return None   # valid


class EventConsumer:
    """
    Poll events from the message bus, validate, route to a handler.

    Parameters
    ----------
    bus            : Shared queue (in-memory Kafka equivalent).
    handler        : Callable[[dict], None] called for each valid event.
    poll_interval  : Seconds to wait when the bus is empty.
    batch_size     : Max events to consume per poll cycle.

    Example
    -------
    def my_handler(event):
        print(event)

    consumer = EventConsumer(handler=my_handler)
    consumer.start(run_in_thread=True)
    time.sleep(10)
    consumer.stop()
    print(consumer.stats())
    """

    def __init__(
        self,
        bus: queue.Queue = MESSAGE_BUS,
        handler: Optional[Callable[[dict], None]] = None,
        poll_interval: float = 0.1,
        batch_size: int = 50,
    ) -> None:
        self.bus = bus
        self.handler = handler or self._default_handler
        self.poll_interval = poll_interval
        self.batch_size = batch_size
        self.dlq = DeadLetterQueue()
        self._stop_event = threading.Event()

        # Stats
        self._consumed = 0
        self._invalid = 0
        self._by_type: Dict[str, int] = {}

    def _default_handler(self, event: dict) -> None:
        """Default: just log the event."""
        logger.debug("[consumer] Event received: type=%s cid=%s", event.get("event_type"), event.get("customer_id"))

    def _process_batch(self, batch: List[dict]) -> None:
        for event in batch:
            error = _validate_event(event)
            if error:
                self._invalid += 1
                self.dlq.add(event, error)
                logger.warning("[consumer] Invalid event — %s | id=%s", error, event.get("event_id", "?"))
                continue

            try:
                self.handler(event)
                self._consumed += 1
                etype = event.get("event_type", "unknown")
                self._by_type[etype] = self._by_type.get(etype, 0) + 1
            except Exception as exc:
                logger.error("[consumer] Handler error for event %s: %s", event.get("event_id"), exc)
                self.dlq.add(event, f"handler_error: {exc}")

    def start(self, run_in_thread: bool = False) -> Optional[threading.Thread]:
        """
        Start consuming events from the bus.

        Parameters
        ----------
        run_in_thread : If True, run in a daemon background thread.
        """
        if run_in_thread:
            t = threading.Thread(target=self._consume_loop, daemon=True)
            t.start()
            logger.info("[consumer] Started in background thread.")
            return t

        self._consume_loop()
        return None

    def _consume_loop(self) -> None:
        self._stop_event.clear()
        logger.info("[consumer] Polling message bus ...")

        while not self._stop_event.is_set():
            batch = []
            for _ in range(self.batch_size):
                try:
                    event = self.bus.get_nowait()
                    batch.append(event)
                except queue.Empty:
                    break

            if batch:
                self._process_batch(batch)
                if self._consumed % 100 == 0 and self._consumed > 0:
                    logger.info("[consumer] Consumed %d events so far.", self._consumed)
            else:
                time.sleep(self.poll_interval)

        logger.info("[consumer] Stopped. Final stats: %s", self.stats())

    def stop(self) -> None:
        self._stop_event.set()

    def stats(self) -> dict:
        return {
            "consumed": self._consumed,
            "invalid": self._invalid,
            "dlq_size": self.dlq.count,
            "by_type": dict(self._by_type),
        }
