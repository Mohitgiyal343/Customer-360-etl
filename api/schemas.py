"""
api/schemas.py
==============
Pydantic request / response schemas for the churn prediction API.
Validated automatically by FastAPI.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, validator


# ── Request Models ─────────────────────────────────────────────────────────────

class CustomerFeatures(BaseModel):
    """
    Feature vector for a single customer — matches ml/features.py NUMERIC + CATEGORICAL features.
    All fields are optional to support partial updates; missing values default to 0 / 'Unknown'.
    """

    # Identity
    CustomerID: str = Field(..., example="CUST00042", description="Unique customer identifier")

    # Numeric features
    Age: Optional[float] = Field(None, ge=0, le=120, example=34)
    TenureDays: Optional[float] = Field(None, ge=0, example=365)
    TotalOrders: Optional[float] = Field(None, ge=0, example=12)
    TotalRevenue: Optional[float] = Field(None, ge=0, example=1250.50)
    AvgOrderValue: Optional[float] = Field(None, ge=0, example=104.21)
    MaxOrderValue: Optional[float] = Field(None, ge=0, example=350.0)
    TotalQuantity: Optional[float] = Field(None, ge=0, example=45)
    UniqueCategories: Optional[float] = Field(None, ge=0, example=3)
    DaysSinceLastPurchase: Optional[float] = Field(None, ge=0, example=28)
    OrderFrequencyPerMonth: Optional[float] = Field(None, ge=0, example=1.2)
    CLV: Optional[float] = Field(None, ge=0, example=4500.0)
    TotalTransactions: Optional[float] = Field(None, ge=0, example=15)
    TotalTransactionAmount: Optional[float] = Field(None, ge=0, example=1180.0)
    AvgTransactionAmount: Optional[float] = Field(None, ge=0, example=78.67)

    # Categorical features
    Country: Optional[str] = Field(None, example="United Kingdom")
    Segment: Optional[str] = Field(None, example="SMB")
    RevenueTier: Optional[str] = Field(None, example="Medium")

    class Config:
        schema_extra = {
            "example": {
                "CustomerID": "CUST00042",
                "Age": 34,
                "TenureDays": 580,
                "TotalOrders": 12,
                "TotalRevenue": 1250.50,
                "AvgOrderValue": 104.21,
                "MaxOrderValue": 350.0,
                "TotalQuantity": 45,
                "UniqueCategories": 3,
                "DaysSinceLastPurchase": 28,
                "OrderFrequencyPerMonth": 1.2,
                "CLV": 4500.0,
                "TotalTransactions": 15,
                "TotalTransactionAmount": 1180.0,
                "AvgTransactionAmount": 78.67,
                "Country": "United Kingdom",
                "Segment": "SMB",
                "RevenueTier": "Medium",
            }
        }


class BatchPredictRequest(BaseModel):
    customers: List[CustomerFeatures] = Field(..., min_items=1, max_items=5000)


# ── Response Models ────────────────────────────────────────────────────────────

class ChurnPredictionResponse(BaseModel):
    CustomerID: str
    ChurnProbability: float = Field(..., ge=0.0, le=1.0, description="Probability of churn (0–1)")
    ChurnPrediction: int = Field(..., description="Binary prediction: 1 = churned, 0 = active")
    ChurnRiskBand: str = Field(..., description="Low | Medium | High")
    model_version: str


class BatchPredictResponse(BaseModel):
    predictions: List[ChurnPredictionResponse]
    total: int
    model_version: str


class ModelInfoResponse(BaseModel):
    model_version: str
    algorithm: str
    training_metrics: dict
    feature_count: int
    status: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    uptime_seconds: float
    version: str
