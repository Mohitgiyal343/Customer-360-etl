"""
tests/test_transform.py
=======================
Unit tests for etl/transform.py using pytest.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from etl.transform import (
    add_churn_label,
    add_revenue_bands,
    clean_customers,
    clean_orders,
    clean_transactions,
    engineer_customer_features,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_customers():
    return pd.DataFrame({
        "CustomerID": ["C001", "C002", "C001", "C003"],  # C001 is a duplicate
        "FirstName": ["Alice", "Bob", "Alice", "Carol"],
        "LastName": ["Smith", "Jones", "Smith", "Brown"],
        "Email": ["alice@test.com", "bob@test.com", "alice@test.com", "carol@test.com"],
        "Phone": ["123", None, "123", "456"],
        "Gender": ["Female", "Male", "Female", "Female"],
        "Age": [30, None, 30, 25],
        "Country": ["UK", "US", "UK", "DE"],
        "City": [None, "NYC", None, "Berlin"],
        "Segment": ["SMB", "Enterprise", "SMB", "Startup"],
        "RegistrationDate": ["2022-01-01", "2022-06-01", "2022-01-01", "2023-01-01"],
        "IsActive": [True, False, True, True],
        "CreditLimit": [5000.0, 10000.0, 5000.0, 2000.0],
        "PreferredPayment": ["PayPal", "Card", "PayPal", "Bank"],
    })


@pytest.fixture
def sample_orders():
    return pd.DataFrame({
        "OrderID": ["O001", "O002", "O003", "O004", "O001"],  # O001 duplicate
        "CustomerID": ["C001", "C001", "C002", "C003", "C001"],
        "InvoiceDate": [
            "2024-01-15", "2024-03-10", "2024-07-20",
            "2022-01-05", "2024-01-15",
        ],
        "Quantity": [5, None, 10, 2, 5],
        "UnitPrice": [100.0, 50.0, None, 200.0, 100.0],
        "ProductCategory": ["Electronics", "Books", "Clothing", "Toys", "Electronics"],
        "Country": ["UK", "UK", "US", "DE", "UK"],
        "OrderStatus": ["Completed", "Completed", None, "Completed", "Completed"],
        "ShippingCost": [5.0, 0.0, 10.0, 3.0, 5.0],
        "DiscountPct": [0.1, 0.0, 0.05, 0.2, 0.1],
    })


@pytest.fixture
def sample_transactions():
    return pd.DataFrame({
        "TransactionID": ["T001", "T002", "T003", "T001"],  # T001 duplicate
        "OrderID": ["O001", "O002", "O003", "O001"],
        "CustomerID": ["C001", "C001", "C002", "C001"],
        "TransactionDate": ["2024-01-15", "2024-03-10", "2024-07-20", "2024-01-15"],
        "Amount": [500.0, 100.0, None, 500.0],
        "PaymentMethod": ["PayPal", "Card", "Bank", "PayPal"],
        "Status": ["Success", "Success", "Success", "Success"],
        "Currency": ["GBP", "GBP", "USD", "GBP"],
    })


# ── clean_customers ────────────────────────────────────────────────────────────

class TestCleanCustomers:
    def test_removes_exact_duplicates(self, sample_customers):
        result = clean_customers(sample_customers)
        # C001 appears twice — one should be removed
        assert result["CustomerID"].duplicated().sum() == 0

    def test_fills_missing_age_with_median(self, sample_customers):
        result = clean_customers(sample_customers)
        assert result["Age"].isna().sum() == 0
        assert result["Age"].dtype in [int, np.int64]

    def test_fills_missing_city(self, sample_customers):
        result = clean_customers(sample_customers)
        assert result["City"].isna().sum() == 0
        assert "Unknown" in result["City"].values

    def test_fills_missing_phone(self, sample_customers):
        result = clean_customers(sample_customers)
        assert result["Phone"].isna().sum() == 0

    def test_tenure_days_non_negative(self, sample_customers):
        result = clean_customers(sample_customers)
        assert (result["TenureDays"] >= 0).all()

    def test_registration_date_parsed(self, sample_customers):
        result = clean_customers(sample_customers)
        assert pd.api.types.is_datetime64_any_dtype(result["RegistrationDate"])


# ── clean_orders ───────────────────────────────────────────────────────────────

class TestCleanOrders:
    def test_removes_duplicate_order_ids(self, sample_orders):
        result = clean_orders(sample_orders)
        assert result["OrderID"].duplicated().sum() == 0

    def test_drops_rows_with_null_quantity_or_price(self, sample_orders):
        result = clean_orders(sample_orders)
        assert result["Quantity"].isna().sum() == 0
        assert result["UnitPrice"].isna().sum() == 0

    def test_revenue_calculated(self, sample_orders):
        result = clean_orders(sample_orders)
        # Revenue = Quantity * UnitPrice * (1 - DiscountPct)
        expected = result["Quantity"] * result["UnitPrice"] * (1 - result["DiscountPct"])
        pd.testing.assert_series_equal(
            result["Revenue"].round(2), expected.round(2), check_names=False
        )

    def test_order_status_filled(self, sample_orders):
        result = clean_orders(sample_orders)
        assert result["OrderStatus"].isna().sum() == 0

    def test_discount_pct_clamped(self, sample_orders):
        result = clean_orders(sample_orders)
        assert (result["DiscountPct"] >= 0).all() and (result["DiscountPct"] <= 1).all()


# ── clean_transactions ─────────────────────────────────────────────────────────

class TestCleanTransactions:
    def test_removes_duplicate_transaction_ids(self, sample_transactions):
        result = clean_transactions(sample_transactions)
        assert result["TransactionID"].duplicated().sum() == 0

    def test_drops_null_amount(self, sample_transactions):
        result = clean_transactions(sample_transactions)
        assert result["Amount"].isna().sum() == 0


# ── engineer_customer_features ─────────────────────────────────────────────────

class TestEngineerFeatures:
    def test_customer_360_has_all_customers(self, sample_customers, sample_orders, sample_transactions):
        customers = clean_customers(sample_customers)
        orders = clean_orders(sample_orders)
        txns = clean_transactions(sample_transactions)
        result = engineer_customer_features(customers, orders, txns)
        # All unique customers should be present
        assert len(result) == len(customers)

    def test_clv_non_negative(self, sample_customers, sample_orders, sample_transactions):
        customers = clean_customers(sample_customers)
        orders = clean_orders(sample_orders)
        txns = clean_transactions(sample_transactions)
        result = engineer_customer_features(customers, orders, txns)
        assert (result["CLV"] >= 0).all()

    def test_total_orders_matches(self, sample_customers, sample_orders, sample_transactions):
        customers = clean_customers(sample_customers)
        orders = clean_orders(sample_orders)
        txns = clean_transactions(sample_transactions)
        result = engineer_customer_features(customers, orders, txns)

        # C001 should have 1 completed order (O001 is deduplicated)
        c001 = result[result["CustomerID"] == "C001"]
        assert not c001.empty
        assert c001.iloc[0]["TotalOrders"] == 2   # O001 and O002


# ── add_churn_label ────────────────────────────────────────────────────────────

class TestChurnLabel:
    def test_churned_when_no_orders(self):
        df = pd.DataFrame({
            "DaysSinceLastPurchase": [9999, 30],
            "TotalOrders": [0, 5],
        })
        result = add_churn_label(df, threshold_days=90)
        assert result.iloc[0]["IsChurned"] == 1   # no orders → churned
        assert result.iloc[1]["IsChurned"] == 0   # active

    def test_churned_when_inactive_too_long(self):
        df = pd.DataFrame({
            "DaysSinceLastPurchase": [100, 50],
            "TotalOrders": [3, 3],
        })
        result = add_churn_label(df, threshold_days=90)
        assert result.iloc[0]["IsChurned"] == 1   # 100 days > threshold
        assert result.iloc[1]["IsChurned"] == 0   # 50 days < threshold

    def test_churn_label_is_binary(self):
        df = pd.DataFrame({
            "DaysSinceLastPurchase": [10, 200, 45, 300],
            "TotalOrders": [5, 1, 0, 3],
        })
        result = add_churn_label(df)
        assert set(result["IsChurned"].unique()).issubset({0, 1})


# ── add_revenue_bands ──────────────────────────────────────────────────────────

class TestRevenueBands:
    def test_revenue_bands_assigned(self):
        df = pd.DataFrame({"TotalRevenue": [0, 250, 1000, 5000, 20000]})
        result = add_revenue_bands(df)
        assert "RevenueTier" in result.columns
        assert result["RevenueTier"].notna().all()

    def test_vip_for_high_revenue(self):
        df = pd.DataFrame({"TotalRevenue": [100_000]})
        result = add_revenue_bands(df)
        assert result.iloc[0]["RevenueTier"] == "VIP"
