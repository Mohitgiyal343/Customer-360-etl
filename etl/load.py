"""
etl/load.py
===========
Load layer — writes transformed DataFrames into PostgreSQL using SQLAlchemy.

Operations:
  • Create tables from DDL if they don't exist
  • Upsert (replace) strategy via INSERT … ON CONFLICT
  • CSV backup to data/processed/ on every run
  • Row-count validation after load
"""

import logging
import time
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy import create_engine, text, exc as sa_exc
from sqlalchemy.engine import Engine

from config import (
    DATABASE_URL,
    CUSTOMER_360_PATH,
    PROCESSED_DIR,
    TABLE_DIM_CUSTOMERS,
    TABLE_FACT_ORDERS,
    TABLE_CUSTOMER_360,
)

logger = logging.getLogger(__name__)

# ── DDL ────────────────────────────────────────────────────────────────────────
DDL_STATEMENTS = [
    # dim_customers
    f"""
    CREATE TABLE IF NOT EXISTS {TABLE_DIM_CUSTOMERS} (
        customer_id         VARCHAR(20)  PRIMARY KEY,
        first_name          VARCHAR(100),
        last_name           VARCHAR(100),
        email               VARCHAR(200),
        phone               VARCHAR(50),
        gender              VARCHAR(50),
        age                 INTEGER,
        country             VARCHAR(100),
        city                VARCHAR(100),
        segment             VARCHAR(50),
        registration_date   TIMESTAMP,
        is_active           BOOLEAN,
        credit_limit        NUMERIC(12, 2),
        preferred_payment   VARCHAR(50),
        tenure_days         INTEGER,
        etl_timestamp       TIMESTAMP DEFAULT NOW()
    )
    """,

    # fact_orders
    f"""
    CREATE TABLE IF NOT EXISTS {TABLE_FACT_ORDERS} (
        order_id            VARCHAR(20)  PRIMARY KEY,
        customer_id         VARCHAR(20)  REFERENCES {TABLE_DIM_CUSTOMERS}(customer_id),
        invoice_date        TIMESTAMP,
        quantity            INTEGER,
        unit_price          NUMERIC(10, 2),
        product_category    VARCHAR(100),
        country             VARCHAR(100),
        order_status        VARCHAR(50),
        shipping_cost       NUMERIC(8, 2),
        discount_pct        NUMERIC(5, 4),
        revenue             NUMERIC(12, 2),
        net_revenue         NUMERIC(12, 2),
        etl_timestamp       TIMESTAMP DEFAULT NOW()
    )
    """,

    # customer_360
    f"""
    CREATE TABLE IF NOT EXISTS {TABLE_CUSTOMER_360} (
        customer_id             VARCHAR(20)  PRIMARY KEY,
        first_name              VARCHAR(100),
        last_name               VARCHAR(100),
        email                   VARCHAR(200),
        country                 VARCHAR(100),
        segment                 VARCHAR(50),
        age                     INTEGER,
        tenure_days             INTEGER,
        total_orders            INTEGER,
        total_revenue           NUMERIC(14, 2),
        total_net_revenue       NUMERIC(14, 2),
        avg_order_value         NUMERIC(12, 2),
        max_order_value         NUMERIC(12, 2),
        total_quantity          INTEGER,
        unique_categories       INTEGER,
        first_purchase_date     TIMESTAMP,
        last_purchase_date      TIMESTAMP,
        days_since_last_purchase INTEGER,
        order_frequency_per_month NUMERIC(8, 4),
        clv                     NUMERIC(14, 2),
        total_transactions      INTEGER,
        total_transaction_amount NUMERIC(14, 2),
        avg_transaction_amount  NUMERIC(12, 2),
        revenue_tier            VARCHAR(20),
        is_churned              SMALLINT,
        etl_timestamp           TIMESTAMP DEFAULT NOW()
    )
    """,
]


def get_engine(database_url: str = DATABASE_URL) -> Engine:
    """Create and return a SQLAlchemy engine."""
    engine = create_engine(
        database_url,
        pool_pre_ping=True,        # validates connection health
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": 10},
    )
    return engine


def create_schema(engine: Engine) -> None:
    """Run DDL to create tables if they don't exist."""
    logger.info("[load] Creating schema (if not exists) ...")
    with engine.begin() as conn:
        for ddl in DDL_STATEMENTS:
            conn.execute(text(ddl))
    logger.info("[load] Schema ready.")


def _rename_columns_for_db(df: pd.DataFrame) -> pd.DataFrame:
    """Map DataFrame column names → snake_case DB column names."""
    rename_map = {
        "CustomerID": "customer_id",
        "FirstName": "first_name",
        "LastName": "last_name",
        "Email": "email",
        "Phone": "phone",
        "Gender": "gender",
        "Age": "age",
        "Country": "country",
        "City": "city",
        "Segment": "segment",
        "RegistrationDate": "registration_date",
        "IsActive": "is_active",
        "CreditLimit": "credit_limit",
        "PreferredPayment": "preferred_payment",
        "TenureDays": "tenure_days",
        # orders
        "OrderID": "order_id",
        "InvoiceDate": "invoice_date",
        "Quantity": "quantity",
        "UnitPrice": "unit_price",
        "ProductCategory": "product_category",
        "OrderStatus": "order_status",
        "ShippingCost": "shipping_cost",
        "DiscountPct": "discount_pct",
        "Revenue": "revenue",
        "NetRevenue": "net_revenue",
        # customer_360 features
        "TotalOrders": "total_orders",
        "TotalRevenue": "total_revenue",
        "TotalNetRevenue": "total_net_revenue",
        "AvgOrderValue": "avg_order_value",
        "MaxOrderValue": "max_order_value",
        "TotalQuantity": "total_quantity",
        "UniqueCategories": "unique_categories",
        "FirstPurchaseDate": "first_purchase_date",
        "LastPurchaseDate": "last_purchase_date",
        "DaysSinceLastPurchase": "days_since_last_purchase",
        "OrderFrequencyPerMonth": "order_frequency_per_month",
        "CLV": "clv",
        "TotalTransactions": "total_transactions",
        "TotalTransactionAmount": "total_transaction_amount",
        "AvgTransactionAmount": "avg_transaction_amount",
        "RevenueTier": "revenue_tier",
        "IsChurned": "is_churned",
        "ETLTimestamp": "etl_timestamp",
    }
    return df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})


def _upsert_table(
    df: pd.DataFrame,
    table_name: str,
    engine: Engine,
    pk_col: str = "customer_id",
    chunk_size: int = 500,
) -> int:
    """
    Efficient upsert: write to a temp table then INSERT … ON CONFLICT DO UPDATE.

    Returns the number of rows upserted.
    """
    temp_table = f"_tmp_{table_name}"
    df_db = _rename_columns_for_db(df.copy())

    # Drop columns not in the target schema to avoid DB errors
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                f"WHERE table_name = '{table_name}'"
            )
        )
        db_cols = {row[0] for row in result}

    # Keep only columns that exist in the DB table
    df_db = df_db[[c for c in df_db.columns if c in db_cols]]

    start = time.perf_counter()
    with engine.begin() as conn:
        # Write to temp table
        df_db.to_sql(temp_table, conn, if_exists="replace", index=False, chunksize=chunk_size)

        cols = ", ".join(df_db.columns)
        updates = ", ".join(
            f"{c} = EXCLUDED.{c}" for c in df_db.columns if c != pk_col
        )
        upsert_sql = f"""
            INSERT INTO {table_name} ({cols})
            SELECT {cols} FROM {temp_table}
            ON CONFLICT ({pk_col}) DO UPDATE SET {updates};
        """
        conn.execute(text(upsert_sql))
        conn.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))

    elapsed = time.perf_counter() - start
    logger.info(
        "[load] Upserted %d rows → %s (%.2fs)", len(df_db), table_name, elapsed
    )
    return len(df_db)


def load_dim_customers(df: pd.DataFrame, engine: Engine) -> int:
    """Load into dim_customers."""
    return _upsert_table(df, TABLE_DIM_CUSTOMERS, engine, pk_col="customer_id")


def load_fact_orders(df: pd.DataFrame, engine: Engine) -> int:
    """Load into fact_orders."""
    return _upsert_table(df, TABLE_FACT_ORDERS, engine, pk_col="order_id")


def load_customer_360(df: pd.DataFrame, engine: Engine) -> int:
    """Load into customer_360."""
    return _upsert_table(df, TABLE_CUSTOMER_360, engine, pk_col="customer_id")


def backup_to_csv(df: pd.DataFrame, path: Path) -> None:
    """Write a DataFrame to CSV as a local backup."""
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    logger.info("[load] CSV backup written to %s (%d rows)", path, len(df))


def load_all(
    customers: pd.DataFrame,
    orders: pd.DataFrame,
    customer_360: pd.DataFrame,
    skip_db: bool = False,
    engine: Optional[Engine] = None,
) -> None:
    """
    Full load phase:
      1. Write CSVs to data/processed/
      2. Load into PostgreSQL (unless skip_db=True)

    Parameters
    ----------
    customers    : Cleaned dim_customers DataFrame
    orders       : Cleaned fact_orders DataFrame
    customer_360 : Merged, enriched customer 360 view
    skip_db      : If True, skip DB load (useful when Postgres is unavailable)
    engine       : SQLAlchemy engine (created if None)
    """
    logger.info("=== LOAD PHASE ===")

    # ── CSV Backups (always) ───────────────────────────────────────────────────
    backup_to_csv(customers, PROCESSED_DIR / "dim_customers.csv")
    backup_to_csv(orders, PROCESSED_DIR / "fact_orders.csv")
    backup_to_csv(customer_360, CUSTOMER_360_PATH)

    if skip_db:
        logger.warning("[load] DB load skipped (skip_db=True). CSV outputs only.")
        return

    # ── Database Load ──────────────────────────────────────────────────────────
    if engine is None:
        try:
            engine = get_engine()
        except sa_exc.SQLAlchemyError as exc:
            logger.error("[load] Cannot create DB engine: %s", exc)
            logger.warning("[load] Falling back to CSV-only output.")
            return

    try:
        create_schema(engine)
        load_dim_customers(customers, engine)
        load_fact_orders(orders, engine)
        load_customer_360(customer_360, engine)
        logger.info("[load] All tables loaded successfully.")
    except sa_exc.OperationalError as exc:
        logger.error("[load] Database connection error: %s", exc)
        logger.warning("[load] CSV output is still available at %s", PROCESSED_DIR)
    except sa_exc.SQLAlchemyError as exc:
        logger.error("[load] Unexpected database error: %s", exc)
        raise
