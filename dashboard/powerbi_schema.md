# Power BI Data Model Guide

## Overview

The Power BI dashboard connects to `dashboard/customer_360_powerbi.csv` (or directly to the `customer_360` table in PostgreSQL).

---

## Data Source Setup

### Option A — CSV (quickest)
1. Open Power BI Desktop
2. **Get Data → Text/CSV** → select `dashboard/customer_360_powerbi.csv`
3. Use Power Query to set correct data types (see table below)

### Option B — PostgreSQL Direct Connection
1. **Get Data → Database → PostgreSQL**
2. Server: `localhost:5432`, Database: `customer360`
3. Table: `customer_360`

---

## Column Reference & Data Types

| Column | Type | Description |
|--------|------|-------------|
| CustomerID | Text | Primary key |
| FirstName / LastName | Text | Customer name |
| Email | Text | Contact email |
| Age | Whole Number | Customer age |
| Gender | Text | Gender category |
| Country | Text | Customer country |
| City | Text | Customer city |
| Segment | Text | Business segment (Enterprise / SMB / Startup / Individual) |
| RegistrationDate | Date | Account registration date |
| TenureDays | Whole Number | Days since registration |
| IsActive | True/False | Account active status |
| TotalOrders | Whole Number | Lifetime order count |
| TotalRevenue | Decimal | Lifetime gross revenue (£) |
| TotalNetRevenue | Decimal | Revenue after shipping |
| AvgOrderValue | Decimal | Average order value |
| MaxOrderValue | Decimal | Highest single order |
| TotalQuantity | Whole Number | Total units ordered |
| UniqueCategories | Whole Number | Product category diversity |
| FirstPurchaseDate | Date | Date of first order |
| LastPurchaseDate | Date | Date of most recent order |
| DaysSinceLastPurchase | Whole Number | Recency metric |
| OrderFrequencyPerMonth | Decimal | Orders per month |
| CLV | Decimal | Customer Lifetime Value |
| TotalTransactions | Whole Number | Successful payment count |
| TotalTransactionAmount | Decimal | Total transaction value |
| RevenueTier | Text | No Revenue / Low / Medium / High / VIP |
| R_Score | Whole Number | Recency score 1–5 |
| F_Score | Whole Number | Frequency score 1–5 |
| M_Score | Whole Number | Monetary score 1–5 |
| RFM_Score | Whole Number | Sum of R+F+M (3–15) |
| RFM_Segment | Text | Champion / Loyal / At Risk / Lost / etc. |
| IsChurned | Whole Number | 1 = churned, 0 = active |
| ChurnProbability | Decimal | ML model churn probability (0–1) |
| ChurnPrediction | Whole Number | 1 = predicted churn |
| ChurnRiskBand | Text | Low / Medium / High |
| RevenuePerDay | Decimal | Daily revenue rate |
| IsHighValue | Whole Number | 1 = top 25% by revenue |
| IsNewCustomer | Whole Number | 1 = registered within last 30 days |
| ExportDate | Text | When export was generated |

---

## Recommended Visuals

### Page 1 — Revenue Overview
- **KPI Cards**: Total Revenue, Active Customers, Avg CLV
- **Bar Chart**: Revenue by Country
- **Donut Chart**: Revenue Tier distribution
- **Line Chart**: Monthly revenue trend (use `fact_orders` if connected via DB)

### Page 2 — Customer Segmentation
- **Treemap**: RFM Segment → Customer Count
- **Scatter Plot**: CLV vs DaysSinceLastPurchase (colour by Segment)
- **Bar Chart**: Avg Revenue by Segment

### Page 3 — Churn Analysis
- **KPI Card**: Churn Rate (`AVERAGE(IsChurned)`)
- **Funnel**: Customers by ChurnRiskBand
- **Table**: At-Risk customers (filter: IsChurned=0, ChurnRiskBand="High")
- **Gauge**: Avg Churn Probability

### Page 4 — RFM Detail
- **Heat map**: R_Score vs F_Score with M_Score as colour
- **Bar**: Customer count by RFM_Segment
- **Slicer**: Country, Segment, RevenueTier

---

## DAX Measures

```dax
-- Churn Rate
Churn Rate % = AVERAGE(customer_360[IsChurned]) * 100

-- Average CLV
Avg CLV = AVERAGE(customer_360[CLV])

-- Revenue at Risk
Revenue At Risk =
    CALCULATE(
        SUM(customer_360[TotalRevenue]),
        customer_360[ChurnRiskBand] = "High"
    )

-- High Value Churn Risk Count
High Value Churners =
    CALCULATE(
        COUNTROWS(customer_360),
        customer_360[IsHighValue] = 1,
        customer_360[IsChurned] = 1
    )
```

---

## Refresh Schedule

- Set Power BI to refresh daily after the Airflow pipeline completes (02:30 UTC)
- For live connection: use PostgreSQL DirectQuery mode
