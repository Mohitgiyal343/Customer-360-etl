# =============================================================================
# Dockerfile
# Customer 360 ETL Platform — Multi-stage build
#
# Stages:
#   base    — Python runtime + system deps
#   builder — Install Python packages
#   app     — Final slim runtime image
#
# Build:
#   docker build -t customer360-etl .
#
# Run pipeline:
#   docker run --env-file .env customer360-etl python main.py --skip-db
#
# Run API:
#   docker run -p 8000:8000 --env-file .env customer360-etl uvicorn api.main:app --host 0.0.0.0 --port 8000
# =============================================================================

# ── Stage 1: Base runtime ─────────────────────────────────────────────────────
FROM python:3.11-slim AS base

LABEL maintainer="data-engineering@company.com"
LABEL description="Customer 360 ETL + ML + API Platform"
LABEL version="1.0.0"

# Prevent .pyc files and enable unbuffered stdout for logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System dependencies for psycopg2 and scientific libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Python dependency builder ───────────────────────────────────────
FROM base AS builder

WORKDIR /build

# Copy only requirements first (layer cache optimisation)
COPY requirements.txt requirements-api.txt ./

RUN pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt && \
    pip install --prefix=/install -r requirements-api.txt

# ── Stage 3: Final application image ─────────────────────────────────────────
FROM base AS app

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy project source
COPY . .

# Create required directories
RUN mkdir -p data/raw data/processed dashboard

# Non-root user for security
RUN groupadd -r etluser && useradd -r -g etluser etluser && \
    chown -R etluser:etluser /app
USER etluser

# Default: run the full pipeline (CSV-only mode, no DB required)
CMD ["python", "main.py", "--skip-db", "--generate-data"]

# API mode: override CMD in docker-compose or docker run
# CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

EXPOSE 8000
