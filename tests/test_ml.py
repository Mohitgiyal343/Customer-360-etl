"""
tests/test_ml.py
================
Unit tests for ml/ package (features, RFM, churn model).
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml.features import prepare_features, NUMERIC_FEATURES
from ml.rfm import RFMSegmenter, assign_segment


# ── Fixtures ───────────────────────────────────────────────────────────────────

def make_customer_360(n: int = 100, churn_pct: float = 0.3) -> pd.DataFrame:
    """Generate a minimal customer_360 DataFrame for testing."""
    np.random.seed(42)
    n_churned = int(n * churn_pct)

    df = pd.DataFrame({
        "CustomerID": [f"C{i:04d}" for i in range(n)],
        "Age": np.random.randint(18, 70, n),
        "TenureDays": np.random.randint(1, 1000, n),
        "TotalOrders": np.random.randint(0, 50, n),
        "TotalRevenue": np.random.uniform(0, 5000, n).round(2),
        "TotalNetRevenue": np.random.uniform(0, 4800, n).round(2),
        "AvgOrderValue": np.random.uniform(0, 300, n).round(2),
        "MaxOrderValue": np.random.uniform(100, 800, n).round(2),
        "TotalQuantity": np.random.randint(0, 200, n),
        "UniqueCategories": np.random.randint(0, 7, n),
        "DaysSinceLastPurchase": np.concatenate([
            np.random.randint(91, 365, n_churned),
            np.random.randint(1, 90, n - n_churned),
        ]),
        "OrderFrequencyPerMonth": np.random.uniform(0, 3, n).round(4),
        "CLV": np.random.uniform(0, 10000, n).round(2),
        "TotalTransactions": np.random.randint(0, 20, n),
        "TotalTransactionAmount": np.random.uniform(0, 3000, n).round(2),
        "AvgTransactionAmount": np.random.uniform(0, 300, n).round(2),
        "Country": np.random.choice(["UK", "US", "DE", "FR"], n),
        "Segment": np.random.choice(["Enterprise", "SMB", "Startup", "Individual"], n),
        "RevenueTier": np.random.choice(["Low", "Medium", "High", "VIP", "No Revenue"], n),
        "IsChurned": np.concatenate([np.ones(n_churned, dtype=int), np.zeros(n - n_churned, dtype=int)]),
    })
    return df


# ── prepare_features ──────────────────────────────────────────────────────────

class TestPrepareFeatures:
    def test_returns_correct_shape(self):
        df = make_customer_360(50)
        X, encoders = prepare_features(df, fit_encoders=True)
        assert len(X) == 50

    def test_no_null_values_in_output(self):
        df = make_customer_360(50)
        # Introduce nulls
        df.loc[0, "Age"] = np.nan
        df.loc[1, "Country"] = None
        X, _ = prepare_features(df, fit_encoders=True)
        assert X.isnull().sum().sum() == 0

    def test_encoders_produced(self):
        df = make_customer_360(50)
        _, encoders = prepare_features(df, fit_encoders=True)
        assert "Country" in encoders
        assert "Segment" in encoders

    def test_inference_mode_uses_existing_encoders(self):
        df_train = make_customer_360(80)
        df_test = make_customer_360(20)

        _, encoders = prepare_features(df_train, fit_encoders=True)
        X_test, _ = prepare_features(df_test, encoders=encoders, fit_encoders=False)
        assert X_test.isnull().sum().sum() == 0


# ── RFMSegmenter ──────────────────────────────────────────────────────────────

class TestRFMSegmenter:
    def test_rfm_columns_added(self):
        df = make_customer_360(100)
        segmenter = RFMSegmenter()
        result = segmenter.compute(df)
        for col in ["R_Score", "F_Score", "M_Score", "RFM_Score", "RFM_Segment"]:
            assert col in result.columns, f"Missing column: {col}"

    def test_scores_in_valid_range(self):
        df = make_customer_360(100)
        segmenter = RFMSegmenter()
        result = segmenter.compute(df)
        for col in ["R_Score", "F_Score", "M_Score"]:
            assert result[col].between(1, 5).all(), f"{col} out of range"

    def test_rfm_score_is_sum(self):
        df = make_customer_360(100)
        segmenter = RFMSegmenter()
        result = segmenter.compute(df)
        expected = result["R_Score"] + result["F_Score"] + result["M_Score"]
        pd.testing.assert_series_equal(result["RFM_Score"], expected, check_names=False)

    def test_segment_labels_are_valid(self):
        valid_segments = {
            "Champion", "Loyal", "New Customer", "Potential Loyal",
            "At Risk", "Can't Lose Them", "Lost", "Promising", "Need Attention",
        }
        df = make_customer_360(200)
        segmenter = RFMSegmenter()
        result = segmenter.compute(df)
        assert set(result["RFM_Segment"].unique()).issubset(valid_segments)

    def test_requires_customer_id_column(self):
        df = make_customer_360(50).drop(columns=["CustomerID"])
        segmenter = RFMSegmenter()
        with pytest.raises(ValueError, match="CustomerID"):
            segmenter.compute(df)


# ── assign_segment helper ─────────────────────────────────────────────────────

class TestAssignSegment:
    def test_champion(self):
        row = pd.Series({"R_Score": 5, "F_Score": 5, "M_Score": 5})
        assert assign_segment(row) == "Champion"

    def test_lost(self):
        row = pd.Series({"R_Score": 1, "F_Score": 1, "M_Score": 1})
        assert assign_segment(row) == "Lost"

    def test_at_risk(self):
        row = pd.Series({"R_Score": 1, "F_Score": 4, "M_Score": 4})
        assert assign_segment(row) == "Can't Lose Them"


# ── ChurnPredictor ─────────────────────────────────────────────────────────────

class TestChurnPredictor:
    def test_train_and_predict(self):
        from ml.ml_model import ChurnPredictor
        df = make_customer_360(200)
        predictor = ChurnPredictor()
        predictor.train(df)
        preds = predictor.predict(df)

        assert "ChurnProbability" in preds.columns
        assert "ChurnPrediction" in preds.columns
        assert "ChurnRiskBand" in preds.columns
        assert len(preds) == len(df)

    def test_probabilities_in_range(self):
        from ml.ml_model import ChurnPredictor
        df = make_customer_360(200)
        predictor = ChurnPredictor()
        predictor.train(df)
        preds = predictor.predict(df)

        assert (preds["ChurnProbability"] >= 0).all()
        assert (preds["ChurnProbability"] <= 1).all()

    def test_prediction_is_binary(self):
        from ml.ml_model import ChurnPredictor
        df = make_customer_360(200)
        predictor = ChurnPredictor()
        predictor.train(df)
        preds = predictor.predict(df)

        assert set(preds["ChurnPrediction"].unique()).issubset({0, 1})

    def test_metrics_returned(self):
        from ml.ml_model import ChurnPredictor
        df = make_customer_360(200)
        predictor = ChurnPredictor()
        _, metrics = predictor.run(df)

        assert "accuracy" in metrics
        assert "roc_auc" in metrics
        assert 0.0 <= metrics["accuracy"] <= 1.0

    def test_save_and_load(self, tmp_path):
        from ml.ml_model import ChurnPredictor
        df = make_customer_360(150)
        model_path = tmp_path / "test_model.pkl"

        predictor = ChurnPredictor()
        predictor.train(df)
        predictor.save(model_path)

        loaded = ChurnPredictor()
        loaded.load(model_path)

        preds = loaded.predict(df)
        assert len(preds) == len(df)
