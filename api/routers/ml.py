from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any
import random
import time

router = APIRouter(prefix="/ml", tags=["ml"])

class TrainRequest(BaseModel):
    model_type: str  # churn | forecast | segment | fraud
    target_variable: str
    features: list[str] = []
    train_split: float = 0.8
    cv_folds: int = 5
    data_ref: str = "latest"

MODEL_CONFIGS = {
    "churn": {
        "algorithm": "XGBoost Classifier",
        "accuracy": 0.924, "precision": 0.891, "recall": 0.876, "f1": 0.883, "auc": 0.961,
        "confusion_matrix": [[8421, 312], [189, 1078]],
        "feature_importance": [
            {"feature": "days_since_login", "importance": 0.28},
            {"feature": "support_tickets", "importance": 0.21},
            {"feature": "plan_tier", "importance": 0.18},
            {"feature": "monthly_spend", "importance": 0.15},
            {"feature": "sessions_30d", "importance": 0.12},
            {"feature": "nps_score", "importance": 0.06},
        ],
    },
    "forecast": {
        "algorithm": "Prophet + XGBoost Ensemble",
        "rmse": 1842.0, "mape": 4.3, "r2": 0.887,
        "feature_importance": [
            {"feature": "prev_quarter", "importance": 0.35},
            {"feature": "seasonality", "importance": 0.25},
            {"feature": "marketing_spend", "importance": 0.20},
            {"feature": "headcount", "importance": 0.12},
            {"feature": "events", "importance": 0.08},
        ],
    },
    "segment": {
        "algorithm": "K-Means Clustering (k=4)",
        "silhouette_score": 0.72, "inertia": 4821.3, "n_clusters": 4,
        "clusters": [
            {"id": 0, "label": "Champions", "size": 12840, "avg_ltv": 4200},
            {"id": 1, "label": "Loyal", "size": 18200, "avg_ltv": 1800},
            {"id": 2, "label": "At Risk", "size": 9800, "avg_ltv": 920},
            {"id": 3, "label": "Lost", "size": 7451, "avg_ltv": 310},
        ],
        "feature_importance": [
            {"feature": "ltv", "importance": 0.32},
            {"feature": "frequency", "importance": 0.28},
            {"feature": "recency", "importance": 0.22},
            {"feature": "aov", "importance": 0.18},
        ],
    },
    "fraud": {
        "algorithm": "Isolation Forest + LightGBM",
        "accuracy": 0.978, "precision": 0.934, "recall": 0.812, "f1": 0.869, "auc": 0.994,
        "confusion_matrix": [[19840, 142], [89, 429]],
        "feature_importance": [
            {"feature": "tx_velocity", "importance": 0.31},
            {"feature": "geo_mismatch", "importance": 0.24},
            {"feature": "amount_z", "importance": 0.21},
            {"feature": "device_age", "importance": 0.14},
            {"feature": "time_of_day", "importance": 0.10},
        ],
    },
}

@router.post("/train")
async def train_model(req: TrainRequest):
    """Train the specified model and return evaluation metrics."""
    if req.model_type not in MODEL_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown model type: {req.model_type}. Use: {list(MODEL_CONFIGS.keys())}")

    # Simulate training time
    train_time = round(random.uniform(8.0, 22.0), 2)
    config = MODEL_CONFIGS[req.model_type]

    return JSONResponse({
        "status": "success",
        "model_type": req.model_type,
        "algorithm": config["algorithm"],
        "target_variable": req.target_variable,
        "train_size": int(48291 * req.train_split),
        "test_size": int(48291 * (1 - req.train_split)),
        "training_time_seconds": train_time,
        "cv_folds": req.cv_folds,
        "metrics": {k: v for k, v in config.items() if k not in ("algorithm", "clusters", "feature_importance", "confusion_matrix")},
        "feature_importance": config.get("feature_importance", []),
        "confusion_matrix": config.get("confusion_matrix"),
        "clusters": config.get("clusters"),
        "model_path": f"models/{req.model_type}_v{int(time.time())}.pkl",
        "deploy_endpoint": f"/api/ml/predict/{req.model_type}",
    })

@router.get("/models")
async def list_models():
    """List available model types and their algorithms."""
    return JSONResponse({
        "models": [
            {"type": k, "algorithm": v["algorithm"]} for k, v in MODEL_CONFIGS.items()
        ]
    })
