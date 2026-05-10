"""
data/generate_sample_data.py
=============================
Generates realistic synthetic datasets for the Customer 360 pipeline.
Run this script once to populate data/raw/ before running the ETL.

Usage:
    python data/generate_sample_data.py
"""

import random
import logging
from pathlib import Path
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ── Reproducibility ────────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ── Output Paths ───────────────────────────────────────────────────────────────
RAW_DIR = Path(__file__).resolve().parent / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# ── Constants ──────────────────────────────────────────────────────────────────
N_CUSTOMERS = 500
N_ORDERS = 2500
N_TRANSACTIONS = 6000
START_DATE = datetime(2022, 1, 1)
END_DATE = datetime(2024, 12, 31)

COUNTRIES = [
    "United Kingdom", "Germany", "France", "Spain", "Italy",
    "Netherlands", "Belgium", "Sweden", "Australia", "United States",
]

SEGMENTS = ["Enterprise", "SMB", "Startup", "Individual"]
GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"]
PRODUCT_CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Toys", "Beauty"]
PAYMENT_METHODS = ["Credit Card", "PayPal", "Bank Transfer", "Debit Card"]
ORDER_STATUSES = ["Completed", "Shipped", "Processing", "Cancelled", "Returned"]


def random_date(start: datetime, end: datetime) -> datetime:
    """Return a random datetime between start and end."""
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


# ── Generate Customers ─────────────────────────────────────────────────────────
def generate_customers(n: int) -> pd.DataFrame:
    logger.info("Generating %d customers ...", n)

    first_names = [
        "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
        "Linda", "William", "Barbara", "David", "Elizabeth", "Richard", "Susan",
        "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Liam",
        "Olivia", "Noah", "Emma", "Aiden", "Sophia", "Lucas", "Mia", "Mason",
        "Amelia", "Ethan", "Harper", "Logan", "Evelyn", "Benjamin", "Abigail",
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
        "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
        "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
        "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
        "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    ]

    registration_dates = [random_date(START_DATE, END_DATE - timedelta(days=30)) for _ in range(n)]

    data = {
        "CustomerID": [f"CUST{str(i).zfill(5)}" for i in range(1, n + 1)],
        "FirstName": [random.choice(first_names) for _ in range(n)],
        "LastName": [random.choice(last_names) for _ in range(n)],
        "Email": None,  # filled below
        "Phone": [f"+44-{random.randint(7000,7999)}-{random.randint(100000,999999)}" for _ in range(n)],
        "Gender": [random.choice(GENDERS) for _ in range(n)],
        "Age": np.random.randint(18, 75, size=n),
        "Country": [random.choice(COUNTRIES) for _ in range(n)],
        "City": [f"City_{random.randint(1, 50)}" for _ in range(n)],
        "Segment": [random.choice(SEGMENTS) for _ in range(n)],
        "RegistrationDate": registration_dates,
        "IsActive": np.random.choice([True, False], size=n, p=[0.80, 0.20]),
        "CreditLimit": np.round(np.random.uniform(500, 50_000, size=n), 2),
        "PreferredPayment": [random.choice(PAYMENT_METHODS) for _ in range(n)],
    }

    df = pd.DataFrame(data)
    df["Email"] = (
        df["FirstName"].str.lower()
        + "."
        + df["LastName"].str.lower()
        + df.index.astype(str)
        + "@example.com"
    )

    # Introduce ~5% missing values to test cleaning logic
    for col in ["Phone", "City", "Age"]:
        mask = np.random.random(n) < 0.05
        df.loc[mask, col] = np.nan

    # Introduce ~2% duplicates
    n_dupes = max(1, int(n * 0.02))
    dupes = df.sample(n_dupes, random_state=SEED)
    df = pd.concat([df, dupes], ignore_index=True)

    logger.info("  → Generated %d customer rows (including %d dupes)", len(df), n_dupes)
    return df


# ── Generate Orders ────────────────────────────────────────────────────────────
def generate_orders(customers: pd.DataFrame, n: int) -> pd.DataFrame:
    logger.info("Generating %d orders ...", n)

    customer_ids = customers["CustomerID"].unique().tolist()

    # Churn simulation: ~20% customers have no recent orders
    churned_ids = set(random.sample(customer_ids, k=int(len(customer_ids) * 0.20)))

    order_dates = []
    assigned_customers = []

    for _ in range(n):
        cid = random.choice(customer_ids)
        if cid in churned_ids:
            # Last order was >90 days ago
            date = random_date(START_DATE, datetime(2024, 6, 1))
        else:
            date = random_date(datetime(2024, 1, 1), END_DATE)
        order_dates.append(date)
        assigned_customers.append(cid)

    quantities = np.random.randint(1, 30, size=n)
    unit_prices = np.round(np.random.uniform(1.5, 500.0, size=n), 2)

    data = {
        "OrderID": [f"ORD{str(i).zfill(7)}" for i in range(1, n + 1)],
        "CustomerID": assigned_customers,
        "InvoiceDate": order_dates,
        "Quantity": quantities,
        "UnitPrice": unit_prices,
        "ProductCategory": [random.choice(PRODUCT_CATEGORIES) for _ in range(n)],
        "Country": [random.choice(COUNTRIES) for _ in range(n)],
        "OrderStatus": [random.choice(ORDER_STATUSES) for _ in range(n)],
        "ShippingCost": np.round(np.random.uniform(0, 25, size=n), 2),
        "DiscountPct": np.round(np.random.uniform(0, 0.30, size=n), 4),
    }

    df = pd.DataFrame(data)
    df["Revenue"] = np.round(df["Quantity"] * df["UnitPrice"] * (1 - df["DiscountPct"]), 2)

    # Introduce ~3% missing values
    for col in ["Quantity", "UnitPrice", "OrderStatus"]:
        mask = np.random.random(n) < 0.03
        df.loc[mask, col] = np.nan

    logger.info("  → Generated %d order rows", len(df))
    return df


# ── Generate Transactions ──────────────────────────────────────────────────────
def generate_transactions(orders: pd.DataFrame, n: int) -> pd.DataFrame:
    logger.info("Generating %d transactions ...", n)

    order_ids = orders["OrderID"].tolist()
    customer_ids = orders["CustomerID"].tolist()

    txn_dates = [random_date(START_DATE, END_DATE) for _ in range(n)]

    data = {
        "TransactionID": [f"TXN{str(i).zfill(8)}" for i in range(1, n + 1)],
        "OrderID": [random.choice(order_ids) for _ in range(n)],
        "CustomerID": [random.choice(customer_ids) for _ in range(n)],
        "TransactionDate": txn_dates,
        "Amount": np.round(np.random.uniform(5, 2000, size=n), 2),
        "PaymentMethod": [random.choice(PAYMENT_METHODS) for _ in range(n)],
        "Status": np.random.choice(
            ["Success", "Failed", "Pending", "Refunded"],
            size=n,
            p=[0.85, 0.05, 0.07, 0.03],
        ),
        "Currency": np.random.choice(["GBP", "USD", "EUR"], size=n, p=[0.5, 0.3, 0.2]),
    }

    df = pd.DataFrame(data)
    logger.info("  → Generated %d transaction rows", len(df))
    return df


# ── Main ───────────────────────────────────────────────────────────────────────
def main() -> None:
    customers = generate_customers(N_CUSTOMERS)
    orders = generate_orders(customers, N_ORDERS)
    transactions = generate_transactions(orders, N_TRANSACTIONS)

    customers.to_csv(RAW_DIR / "customers.csv", index=False)
    orders.to_csv(RAW_DIR / "orders.csv", index=False)
    transactions.to_csv(RAW_DIR / "transactions.csv", index=False)

    logger.info("✓ Data written to %s", RAW_DIR)
    logger.info(
        "  customers=%d | orders=%d | transactions=%d",
        len(customers), len(orders), len(transactions),
    )


if __name__ == "__main__":
    main()
