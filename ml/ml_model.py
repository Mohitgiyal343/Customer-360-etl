"""
ml/ml_model.py
==============
Churn Prediction Model — Customer 360 Pipeline

Model: RandomForestClassifier (primary) with LogisticRegression comparison.

Workflow:
  1. Prepare feature matrix (numeric + encoded categorical)
  2. Handle class imbalance with SMOTE
  3. Train RandomForest & LogisticRegression
  4. Evaluate on held-out test set
  5. Persist model artefacts to disk
  6. Return prediction DataFrame

Metrics logged:
  • Accuracy
  • ROC-AUC
  • Precision, Recall, F1
  • Confusion matrix
  • Feature importances (top 10)
"""

import logging
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from config import CHURN_PREDICTIONS_PATH, ML_CONFIG, MODEL_PATH, PROCESSED_DIR
from ml.features import TARGET_COL, get_feature_columns, prepare_features

logger = logging.getLogger(__name__)


# ── Optional SMOTE (graceful fallback) ─────────────────────────────────────────
try:
    from imblearn.over_sampling import SMOTE
    _SMOTE_AVAILABLE = True
except ImportError:
    _SMOTE_AVAILABLE = False
    logger.warning("[ml] imbalanced-learn not found — SMOTE will be skipped.")


class ChurnPredictor:
    """
    End-to-end churn prediction: training, evaluation, inference, and persistence.

    Example
    -------
    predictor = ChurnPredictor()
    results_df = predictor.run(customer_360_df)
    """

    def __init__(self, config: dict = None) -> None:
        self.config = config or ML_CONFIG
        self.model: Optional[RandomForestClassifier] = None
        self.encoders: dict = {}
        self.feature_cols = get_feature_columns()
        self.metrics: Dict[str, float] = {}

    # ── Training ───────────────────────────────────────────────────────────────

    def _build_rf_model(self) -> RandomForestClassifier:
        return RandomForestClassifier(
            n_estimators=self.config["n_estimators"],
            max_depth=self.config["max_depth"],
            class_weight="balanced",  # handles imbalance without SMOTE
            n_jobs=-1,
            random_state=self.config["random_state"],
        )

    def _build_lr_model(self) -> Pipeline:
        """Logistic Regression wrapped in a scaling Pipeline to ensure convergence."""
        return Pipeline([
            ("scaler", StandardScaler()),
            ("lr", LogisticRegression(
                class_weight="balanced",
                max_iter=2000,
                solver="lbfgs",
                random_state=self.config["random_state"],
            )),
        ])

    def train(self, df: pd.DataFrame) -> "ChurnPredictor":
        """
        Train the churn model.

        Parameters
        ----------
        df : customer_360 DataFrame with IsChurned column

        Returns
        -------
        self (for method chaining)
        """
        logger.info("[ml] Starting model training ...")

        if TARGET_COL not in df.columns:
            raise ValueError(f"Target column '{TARGET_COL}' not found in DataFrame.")

        # ── Feature preparation ────────────────────────────────────────────────
        X, self.encoders = prepare_features(df, fit_encoders=True)
        y = df[TARGET_COL].astype(int)

        # Drop rows where target is null
        valid_mask = y.notna()
        X, y = X[valid_mask], y[valid_mask]

        logger.info(
            "[ml] Dataset — total=%d | churned=%d (%.1f%%) | active=%d",
            len(y), y.sum(), y.mean() * 100, (y == 0).sum(),
        )

        # ── Train / test split ─────────────────────────────────────────────────
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config["test_size"],
            random_state=self.config["random_state"],
            stratify=y,
        )

        # ── SMOTE oversampling (training set only) ─────────────────────────────
        if _SMOTE_AVAILABLE and y_train.sum() > 5:
            smote = SMOTE(random_state=self.config["random_state"])
            X_train, y_train = smote.fit_resample(X_train, y_train)
            logger.info("[ml] SMOTE applied — train set now %d rows.", len(y_train))

        # ── Train RandomForest ─────────────────────────────────────────────────
        t0 = time.perf_counter()
        rf = self._build_rf_model()
        rf.fit(X_train, y_train)
        logger.info("[ml] RandomForest trained in %.2fs.", time.perf_counter() - t0)

        # ── Train Logistic Regression (comparison) ─────────────────────────────
        lr = self._build_lr_model()
        lr.fit(X_train, y_train)

        # ── Evaluation ─────────────────────────────────────────────────────────
        logger.info("[ml] === RandomForest Evaluation ===")
        self.metrics = self._evaluate(rf, X_test, y_test, "RandomForest")

        logger.info("[ml] === Logistic Regression Evaluation ===")
        lr_metrics = self._evaluate(lr, X_test, y_test, "LogisticRegression")

        # ── Cross-validation ──────────────────────────────────────────────────
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.config["random_state"])
        cv_scores = cross_val_score(rf, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
        logger.info(
            "[ml] 5-Fold CV ROC-AUC: %.4f ± %.4f",
            cv_scores.mean(), cv_scores.std(),
        )
        self.metrics["cv_roc_auc_mean"] = round(float(cv_scores.mean()), 4)
        self.metrics["cv_roc_auc_std"] = round(float(cv_scores.std()), 4)

        # ── Feature importance ─────────────────────────────────────────────────
        self._log_feature_importances(rf, X.columns.tolist())

        self.model = rf
        return self

    def _evaluate(
        self,
        model,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        model_name: str,
    ) -> dict:
        """Compute and log standard classification metrics."""
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        report = classification_report(y_test, y_pred, target_names=["Active", "Churned"])
        cm = confusion_matrix(y_test, y_pred)

        logger.info("[ml] %s — Accuracy: %.4f | ROC-AUC: %.4f", model_name, acc, auc)
        logger.info("[ml] Classification Report:\n%s", report)
        logger.info("[ml] Confusion Matrix:\n%s", cm)

        return {
            "model": model_name,
            "accuracy": round(acc, 4),
            "roc_auc": round(auc, 4),
        }

    def _log_feature_importances(self, model: RandomForestClassifier, feature_names: list) -> None:
        importances = pd.Series(model.feature_importances_, index=feature_names)
        top10 = importances.nlargest(10)
        logger.info("[ml] Top-10 Feature Importances:\n%s", top10.to_string())

    # ── Inference ─────────────────────────────────────────────────────────────

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Run inference on new customer data.

        Returns the input DataFrame augmented with:
          • ChurnProbability  (float 0–1)
          • ChurnPrediction   (0 = active, 1 = churned)
          • ChurnRiskBand     (Low / Medium / High)
        """
        if self.model is None:
            raise RuntimeError("Model is not trained. Call train() first or load a model.")

        X, _ = prepare_features(df, encoders=self.encoders, fit_encoders=False)
        probs = self.model.predict_proba(X)[:, 1]
        preds = (probs >= 0.5).astype(int)

        result = df[["CustomerID"]].copy() if "CustomerID" in df.columns else pd.DataFrame()
        result["ChurnProbability"] = np.round(probs, 4)
        result["ChurnPrediction"] = preds
        result["ChurnRiskBand"] = pd.cut(
            probs,
            bins=[-0.001, 0.33, 0.66, 1.001],
            labels=["Low", "Medium", "High"],
        ).astype(str)

        return result

    # ── Persistence ────────────────────────────────────────────────────────────

    def save(self, path: Path = MODEL_PATH) -> None:
        """Persist model + encoders to disk using joblib."""
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"model": self.model, "encoders": self.encoders, "metrics": self.metrics}
        joblib.dump(payload, path)
        logger.info("[ml] Model saved → %s", path)

    def load(self, path: Path = MODEL_PATH) -> "ChurnPredictor":
        """Load a previously saved model from disk."""
        if not path.exists():
            raise FileNotFoundError(f"No model artefact found at {path}.")
        payload = joblib.load(path)
        self.model = payload["model"]
        self.encoders = payload["encoders"]
        self.metrics = payload.get("metrics", {})
        logger.info("[ml] Model loaded ← %s", path)
        return self

    # ── High-level runner ──────────────────────────────────────────────────────

    def run(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, dict]:
        """
        Train, evaluate, infer, save, and return predictions.

        Parameters
        ----------
        df : customer_360 DataFrame

        Returns
        -------
        predictions : DataFrame with ChurnProbability, ChurnPrediction, ChurnRiskBand
        metrics     : dict of evaluation metrics
        """
        logger.info("=== ML PHASE ===")
        self.train(df)
        predictions = self.predict(df)

        # Save predictions CSV
        CHURN_PREDICTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
        results = df[["CustomerID"]].merge(predictions, on="CustomerID", how="left") \
            if "CustomerID" in df.columns else predictions
        results.to_csv(CHURN_PREDICTIONS_PATH, index=False)
        logger.info("[ml] Predictions saved → %s", CHURN_PREDICTIONS_PATH)

        # Save model
        self.save()

        return predictions, self.metrics
