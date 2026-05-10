-- =============================================================================
-- sql/queries.sql
-- Customer 360 ETL Pipeline — Analytical Query Library
-- =============================================================================
-- Common BI/analytics queries for Customer 360 reporting.
-- Run in psql or connect from any SQL client.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Revenue Overview by Country
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    country,
    COUNT(*)                            AS customer_count,
    SUM(total_orders)                   AS total_orders,
    ROUND(SUM(total_revenue), 2)        AS total_revenue,
    ROUND(AVG(avg_order_value), 2)      AS avg_order_value,
    SUM(is_churned)                     AS churned_customers,
    ROUND(100.0 * SUM(is_churned) / COUNT(*), 1) AS churn_rate_pct
FROM customer_360
GROUP BY country
ORDER BY total_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RFM Segment Distribution
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    rfm_segment,
    COUNT(*)                            AS customer_count,
    ROUND(AVG(total_revenue), 2)        AS avg_revenue,
    ROUND(AVG(clv), 2)                  AS avg_clv,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_of_base
FROM customer_360
GROUP BY rfm_segment
ORDER BY avg_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Churn Risk Analysis
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    churn_risk_band,
    COUNT(*)                            AS customer_count,
    ROUND(AVG(churn_probability) * 100, 1) AS avg_churn_prob_pct,
    ROUND(SUM(total_revenue), 2)        AS revenue_at_risk,
    ROUND(AVG(days_since_last_purchase), 0) AS avg_days_inactive
FROM customer_360
WHERE churn_risk_band IS NOT NULL
GROUP BY churn_risk_band
ORDER BY avg_churn_prob_pct DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Top 20 Customers by CLV
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    customer_id,
    first_name || ' ' || last_name     AS full_name,
    country,
    segment,
    rfm_segment,
    total_orders,
    total_revenue,
    ROUND(clv, 2)                      AS clv,
    churn_risk_band
FROM customer_360
ORDER BY clv DESC
LIMIT 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Monthly Revenue Trend (from fact_orders)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    DATE_TRUNC('month', invoice_date)  AS month,
    COUNT(DISTINCT customer_id)         AS active_customers,
    COUNT(order_id)                     AS orders,
    ROUND(SUM(revenue), 2)             AS revenue,
    ROUND(AVG(revenue), 2)             AS avg_order_value
FROM fact_orders
WHERE order_status NOT IN ('Cancelled', 'Returned')
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Revenue Tier Distribution
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    revenue_tier,
    COUNT(*)                            AS customer_count,
    ROUND(SUM(total_revenue), 2)        AS total_revenue,
    ROUND(AVG(total_orders), 1)         AS avg_orders,
    SUM(is_churned)                     AS churned
FROM customer_360
GROUP BY revenue_tier
ORDER BY total_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Category Performance
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    product_category,
    COUNT(order_id)                     AS order_count,
    SUM(quantity)                       AS total_units,
    ROUND(SUM(revenue), 2)             AS total_revenue,
    ROUND(AVG(revenue), 2)             AS avg_order_revenue
FROM fact_orders
WHERE order_status = 'Completed'
GROUP BY product_category
ORDER BY total_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Champions vs Lost Segment Comparison
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    rfm_segment,
    ROUND(AVG(days_since_last_purchase), 0)  AS avg_recency_days,
    ROUND(AVG(total_orders), 1)              AS avg_orders,
    ROUND(AVG(total_revenue), 2)             AS avg_revenue,
    ROUND(AVG(clv), 2)                       AS avg_clv,
    ROUND(AVG(churn_probability) * 100, 1)   AS avg_churn_pct
FROM customer_360
WHERE rfm_segment IN ('Champion', 'Loyal', 'At Risk', 'Lost', 'Can''t Lose Them')
GROUP BY rfm_segment
ORDER BY avg_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. At-Risk High-Value Customers (use the view)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT * FROM v_at_risk_customers LIMIT 25;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. New vs Returning Customer Revenue Split
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    CASE WHEN tenure_days <= 30 THEN 'New' ELSE 'Returning' END AS customer_type,
    COUNT(*)                    AS count,
    ROUND(SUM(total_revenue), 2) AS revenue,
    ROUND(AVG(clv), 2)           AS avg_clv
FROM customer_360
GROUP BY customer_type;
