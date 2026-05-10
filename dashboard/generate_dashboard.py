"""
dashboard/generate_dashboard.py
Builds a fully self-contained interactive HTML dashboard from processed CSVs.
Usage: python dashboard/generate_dashboard.py
"""
import json, math
from pathlib import Path
import pandas as pd

PROCESSED = Path(__file__).resolve().parent.parent / "data" / "processed"
TMPL = Path(__file__).resolve().parent / "dashboard_template.html"
OUT  = Path(__file__).resolve().parent / "dashboard.html"

def safe(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return 0
    return v

def df_json(df):
    for col in df.select_dtypes(include=["datetime64[ns]"]).columns:
        df[col] = df[col].astype(str)
    return json.dumps([{k: safe(v) for k, v in r.items()} for r in df.to_dict("records")])

def build():
    c360   = pd.read_csv(PROCESSED / "customer_360.csv")
    orders = pd.read_csv(PROCESSED / "fact_orders.csv")
    orders["InvoiceDate"] = pd.to_datetime(orders["InvoiceDate"], errors="coerce")

    # KPIs
    kpi = {
        "total_customers": len(c360),
        "total_revenue":   round(float(c360["TotalRevenue"].sum()), 2),
        "churn_rate":      round(float(c360["IsChurned"].mean() * 100), 1),
        "avg_clv":         round(float(c360["CLV"].mean()), 2),
        "active":          int((c360["IsChurned"] == 0).sum()),
        "churned":         int((c360["IsChurned"] == 1).sum()),
        "avg_order_val":   round(float(c360["AvgOrderValue"].mean()), 2),
        "total_orders":    int(c360["TotalOrders"].sum()),
        "high_risk":       int((c360.get("ChurnRiskBand","") == "High").sum()) if "ChurnRiskBand" in c360.columns else 0,
        "champions":       int((c360.get("RFM_Segment","") == "Champion").sum()) if "RFM_Segment" in c360.columns else 0,
    }

    # Chart aggregates
    seg_counts   = c360["RFM_Segment"].value_counts().to_dict() if "RFM_Segment" in c360.columns else {}
    tier_counts  = c360["RevenueTier"].value_counts().to_dict() if "RevenueTier" in c360.columns else {}
    risk_counts  = c360["ChurnRiskBand"].value_counts().to_dict() if "ChurnRiskBand" in c360.columns else {}
    cntry_rev    = c360.groupby("Country")["TotalRevenue"].sum().sort_values(ascending=False).head(10).to_dict()
    cntry_churn  = c360.groupby("Country")["IsChurned"].mean().round(3).sort_values(ascending=False).head(10).to_dict()
    seg_revenue  = (c360.groupby("RFM_Segment")["TotalRevenue"].mean().round(2).to_dict()
                    if "RFM_Segment" in c360.columns else {})

    # Monthly revenue + order trend
    orders["Month"] = orders["InvoiceDate"].dt.to_period("M").astype(str)
    monthly_rev  = orders.groupby("Month")["Revenue"].sum().sort_index().tail(24)
    monthly_ord  = orders.groupby("Month")["OrderID"].count().sort_index().tail(24)

    # CLV distribution buckets
    bins   = [0, 1000, 5000, 15000, 30000, float("inf")]
    labels = ["<1k", "1k-5k", "5k-15k", "15k-30k", "30k+"]
    c360["CLV_Bucket"] = pd.cut(c360["CLV"], bins=bins, labels=labels)
    clv_dist = c360["CLV_Bucket"].value_counts().reindex(labels).fillna(0).astype(int).to_dict()

    # Age distribution
    age_bins   = [0,20,30,40,50,60,75,200]
    age_labels = ["<20","20s","30s","40s","50s","60s","70+"]
    c360["AgeBin"] = pd.cut(c360["Age"], bins=age_bins, labels=age_labels)
    age_dist = c360["AgeBin"].value_counts().reindex(age_labels).fillna(0).astype(int).to_dict()

    # Churn by segment
    if "RFM_Segment" in c360.columns:
        churn_by_seg = c360.groupby("RFM_Segment")["IsChurned"].mean().round(3).to_dict()
    else:
        churn_by_seg = {}

    # Order status
    if "OrderStatus" in orders.columns:
        status_dist = orders["OrderStatus"].value_counts().to_dict()
    else:
        status_dist = {}

    # Category revenue
    if "ProductCategory" in orders.columns:
        cat_rev = orders.groupby("ProductCategory")["Revenue"].sum().sort_values(ascending=False).to_dict()
    else:
        cat_rev = {}

    # Top 10 customers
    top_cols = ["CustomerID","FirstName","LastName","Country","TotalRevenue","CLV","RFM_Segment","ChurnRiskBand","IsChurned"]
    top_avail = [c for c in top_cols if c in c360.columns]
    top10 = c360.nlargest(10, "TotalRevenue")[top_avail]

    # Full table (200 rows)
    tbl_cols = ["CustomerID","FirstName","LastName","Email","Country","Segment",
                "Age","TenureDays","TotalOrders","TotalRevenue","AvgOrderValue",
                "CLV","RFM_Segment","R_Score","F_Score","M_Score","RFM_Score",
                "ChurnRiskBand","ChurnProbability","IsChurned","RevenueTier"]
    tbl_avail = [c for c in tbl_cols if c in c360.columns]
    table_df  = c360[tbl_avail].head(200)

    # Build HTML from template
    html = TMPL.read_text(encoding="utf-8")
    replacements = {
        "__KPI_JSON__":          json.dumps(kpi),
        "__SEG_JSON__":          json.dumps(seg_counts),
        "__TIER_JSON__":         json.dumps(tier_counts),
        "__RISK_JSON__":         json.dumps(risk_counts),
        "__COUNTRY_JSON__":      json.dumps(cntry_rev),
        "__COUNTRY_CHURN_JSON__":json.dumps(cntry_churn),
        "__SEG_REV_JSON__":      json.dumps(seg_revenue),
        "__MONTHLY_LABELS__":    json.dumps(monthly_rev.index.tolist()),
        "__MONTHLY_VALUES__":    json.dumps(monthly_rev.values.tolist()),
        "__MONTHLY_ORDERS__":    json.dumps(monthly_ord.values.tolist()),
        "__CLV_DIST_JSON__":     json.dumps(clv_dist),
        "__AGE_DIST_JSON__":     json.dumps(age_dist),
        "__CHURN_SEG_JSON__":    json.dumps(churn_by_seg),
        "__STATUS_JSON__":       json.dumps(status_dist),
        "__CAT_REV_JSON__":      json.dumps(cat_rev),
        "__TOP10_JSON__":        df_json(top10),
        "__TABLE_JSON__":        df_json(table_df),
    }
    for k, v in replacements.items():
        html = html.replace(k, v)
    OUT.write_text(html, encoding="utf-8")
    print(f"Dashboard written -> {OUT}")

if __name__ == "__main__":
    build()
