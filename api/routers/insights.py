from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from datetime import datetime

router = APIRouter(prefix="/insights", tags=["insights"])

INSIGHTS = [
    {
        "id": 1,
        "type": "positive",
        "icon": "📈",
        "title": "Revenue Acceleration",
        "text": "Revenue grew 18.3% MoM in December — highest growth rate since Q2 last year. Enterprise segment drove 62% of the increase.",
        "metric": "+18.3%",
        "priority": "high",
        "generated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 2,
        "type": "warning",
        "icon": "⚠️",
        "title": "Churn Alert",
        "text": "Churn rate spiked 2.1% in the Consumer segment over the last 14 days. ML model confidence: 94%. Immediate re-engagement campaign recommended.",
        "metric": "+2.1%",
        "priority": "critical",
        "generated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 3,
        "type": "info",
        "icon": "🎯",
        "title": "Regional Opportunity",
        "text": "East region is the top-performing territory this quarter with $5.2M in Q4 sales. Historical trend suggests 12% further growth potential with 2 additional AEs.",
        "metric": "$5.2M",
        "priority": "medium",
        "generated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 4,
        "type": "positive",
        "icon": "💡",
        "title": "Upsell Pipeline",
        "text": "Enterprise customers exhibit 4.2x higher LTV than SMB tier. Current upsell pipeline has an estimated $3.2M potential if conversion rate matches Q3 performance.",
        "metric": "$3.2M",
        "priority": "high",
        "generated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 5,
        "type": "info",
        "icon": "🔮",
        "title": "Q1 Forecast",
        "text": "ML time-series model (RMSE: $1,842) projects Q1 revenue at $14.2M — a 10.9% increase over current quarter. Confidence interval: [$13.1M, $15.4M].",
        "metric": "$14.2M",
        "priority": "medium",
        "generated_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 6,
        "type": "warning",
        "icon": "🔒",
        "title": "Fraud Pattern",
        "text": "Anomaly detection flagged 42 transactions with unusual velocity patterns in the last 6 hours. 12 have been auto-blocked. Manual review required for remaining 30.",
        "metric": "42 flagged",
        "priority": "critical",
        "generated_at": datetime.utcnow().isoformat(),
    },
]

@router.get("")
async def get_insights(
    type: str = Query(default=None, description="Filter by type: positive/warning/info"),
    priority: str = Query(default=None, description="Filter by priority: critical/high/medium"),
    limit: int = Query(default=10, ge=1, le=50),
):
    data = INSIGHTS
    if type:
        data = [i for i in data if i["type"] == type]
    if priority:
        data = [i for i in data if i["priority"] == priority]
    return JSONResponse({
        "count": len(data[:limit]),
        "insights": data[:limit],
    })
