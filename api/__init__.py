"""
api/
====
FastAPI-based churn prediction inference service.

Endpoints:
    GET  /health          — Liveness check
    GET  /model/info      — Model metadata and training metrics
    POST /predict         — Predict churn for one customer
    POST /predict/batch   — Predict churn for multiple customers
    GET  /docs            — Auto-generated Swagger UI (FastAPI built-in)
"""
