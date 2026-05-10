"""
api/main.py
===========
FastAPI churn-prediction inference service for the Customer 360 platform.

Startup:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

Or via Docker:
    docker-compose up api

Endpoints:
    GET  /health           — Liveness / readiness probe
    GET  /model/info       — Model metadata + training metrics
    POST /predict          — Single-customer churn prediction
    POST /predict/batch    — Batch churn prediction (up to 5 000 customers)
    GET  /docs             — Swagger UI (auto-generated)
    GET  /redoc            — ReDoc documentation

Authentication:
    Set API_KEY env var. Pass as header: X-API-Key: <key>
    Leave blank to disable auth (development mode).
"""

import logging
import os
import sys
import time
from pathlib import Path
from typing import List

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader

# ── Project root on sys.path ───────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.schemas import (
    BatchPredictRequest,
    BatchPredictResponse,
    ChurnPredictionResponse,
    CustomerFeatures,
    HealthResponse,
    ModelInfoResponse,
)
from config import MODEL_PATH
from ml.features import get_feature_columns
from ml.ml_model import ChurnPredictor

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────
MODEL_VERSION = "1.0.0"
APP_START_TIME = time.time()
API_KEY_ENV = os.getenv("API_KEY", "")   # empty = auth disabled

# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Customer 360 — Churn Prediction API",
    description=(
        "Production-grade churn prediction service for the Customer 360 platform.\n\n"
        "Powered by a RandomForest classifier trained on RFM, CLV, and behavioural features.\n\n"
        "**Note:** Train the model first by running `python main.py --skip-db`."
    ),
    version=MODEL_VERSION,
    contact={"name": "Data Engineering Team", "email": "data-eng@company.com"},
    license_info={"name": "MIT"},
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── New SaaS Routers ───────────────────────────────────────────────────────────
try:
    from api.routers import upload, clean, pipeline, insights, ml as ml_router
    app.include_router(upload.router, prefix="/api")
    app.include_router(clean.router, prefix="/api")
    app.include_router(pipeline.router, prefix="/api")
    app.include_router(insights.router, prefix="/api")
    app.include_router(ml_router.router, prefix="/api")
    logger.info("[api] SaaS routers registered: upload, clean, pipeline, insights, ml")
except ImportError as _e:
    logger.warning("[api] SaaS routers not loaded: %s", _e)

# ── API Key Auth (optional) ────────────────────────────────────────────────────
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _verify_api_key(api_key: str = Security(_api_key_header)) -> str:
    if not API_KEY_ENV:
        return "no-auth"   # Auth disabled
    if api_key == API_KEY_ENV:
        return api_key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid or missing API key. Set X-API-Key header.",
    )


# ── Model singleton ────────────────────────────────────────────────────────────
_predictor: ChurnPredictor | None = None


def _get_predictor() -> ChurnPredictor:
    """Lazy-load the trained model on first request."""
    global _predictor
    if _predictor is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"Model artefact not found at '{MODEL_PATH}'. "
                    "Run `python main.py --skip-db` to train the model first."
                ),
            )
        logger.info("[api] Loading model from %s ...", MODEL_PATH)
        _predictor = ChurnPredictor()
        _predictor.load(MODEL_PATH)
        logger.info("[api] Model loaded — version=%s", MODEL_VERSION)
    return _predictor


def _customer_features_to_df(customer: CustomerFeatures) -> pd.DataFrame:
    """Convert a Pydantic CustomerFeatures to a one-row DataFrame."""
    return pd.DataFrame([customer.dict()])


def _build_prediction_response(row: pd.Series) -> ChurnPredictionResponse:
    return ChurnPredictionResponse(
        CustomerID=str(row["CustomerID"]),
        ChurnProbability=float(row["ChurnProbability"]),
        ChurnPrediction=int(row["ChurnPrediction"]),
        ChurnRiskBand=str(row["ChurnRiskBand"]),
        model_version=MODEL_VERSION,
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Operations"],
    summary="Liveness and readiness check",
)
def health() -> HealthResponse:
    """
    Returns API health status.

    - `status: ok` — service is up
    - `model_loaded` — True if the model artefact has been loaded into memory
    """
    return HealthResponse(
        status="ok",
        model_loaded=_predictor is not None,
        uptime_seconds=round(time.time() - APP_START_TIME, 1),
        version=MODEL_VERSION,
    )


@app.get(
    "/model/info",
    response_model=ModelInfoResponse,
    tags=["Model"],
    summary="Training metrics and model metadata",
)
def model_info(key: str = Depends(_verify_api_key)) -> ModelInfoResponse:
    """
    Returns metadata about the loaded model:
    - Algorithm, version, training metrics (accuracy, ROC-AUC, CV scores)
    - Feature count
    """
    predictor = _get_predictor()
    return ModelInfoResponse(
        model_version=MODEL_VERSION,
        algorithm="RandomForestClassifier",
        training_metrics=predictor.metrics,
        feature_count=len(get_feature_columns()),
        status="loaded",
    )


@app.post(
    "/predict",
    response_model=ChurnPredictionResponse,
    tags=["Inference"],
    summary="Predict churn for a single customer",
)
def predict_single(
    customer: CustomerFeatures,
    key: str = Depends(_verify_api_key),
) -> ChurnPredictionResponse:
    """
    Predict churn probability for **one** customer.

    Request body should contain the customer's feature vector.
    Missing numeric fields default to 0; missing categorical fields to 'Unknown'.

    Returns:
    - `ChurnProbability`: float 0–1 (higher = more likely to churn)
    - `ChurnPrediction`: 0 (active) or 1 (churned)
    - `ChurnRiskBand`: Low | Medium | High
    """
    predictor = _get_predictor()

    try:
        df = _customer_features_to_df(customer)
        predictions = predictor.predict(df)

        if predictions.empty:
            raise HTTPException(status_code=500, detail="Prediction returned empty result.")

        row = predictions.iloc[0]
        row["CustomerID"] = customer.CustomerID
        return _build_prediction_response(row)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[api] Prediction error for customer %s: %s", customer.CustomerID, exc)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@app.post(
    "/predict/batch",
    response_model=BatchPredictResponse,
    tags=["Inference"],
    summary="Batch churn prediction (up to 5 000 customers)",
)
def predict_batch(
    request: BatchPredictRequest,
    key: str = Depends(_verify_api_key),
) -> BatchPredictResponse:
    """
    Predict churn for a **batch** of customers in a single request.

    - Accepts 1–5 000 customers per request
    - Returns predictions in the same order as the input list
    - Efficiently vectorised using the underlying sklearn model

    Request body:
    ```json
    {
      "customers": [
        { "CustomerID": "CUST00001", "TotalOrders": 5, ... },
        { "CustomerID": "CUST00002", ... }
      ]
    }
    ```
    """
    predictor = _get_predictor()

    try:
        records = [c.dict() for c in request.customers]
        df = pd.DataFrame(records)

        predictions = predictor.predict(df)

        # Ensure CustomerID is preserved
        predictions["CustomerID"] = df["CustomerID"].values

        responses: List[ChurnPredictionResponse] = []
        for _, row in predictions.iterrows():
            responses.append(_build_prediction_response(row))

        logger.info("[api] Batch prediction — %d customers processed.", len(responses))

        return BatchPredictResponse(
            predictions=responses,
            total=len(responses),
            model_version=MODEL_VERSION,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[api] Batch prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {exc}")


# ── Startup / Shutdown Events ──────────────────────────────────────────────────

@app.on_event("startup")
async def _startup() -> None:
    """Pre-load model on startup so first request is fast."""
    logger.info("[api] Starting Customer 360 Churn Prediction API v%s", MODEL_VERSION)
    try:
        _get_predictor()
    except HTTPException:
        logger.warning("[api] Model not found — endpoints will return 503 until model is trained.")


@app.on_event("shutdown")
async def _shutdown() -> None:
    logger.info("[api] Shutting down.")
