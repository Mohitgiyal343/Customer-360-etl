-- =============================================================================
-- sql/schema.sql
-- Customer 360 ETL Pipeline — PostgreSQL Schema
-- =============================================================================
-- Run this script to initialise the database:
--   psql -U postgres -d customer360 -f sql/schema.sql
-- =============================================================================

-- Enable UUID extension (optional, for future use)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Drop tables in reverse-dependency order (safe re-runs)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS customer_360   CASCADE;
DROP TABLE IF EXISTS fact_orders    CASCADE;
DROP TABLE IF EXISTS dim_customers  CASCADE;

-- =============================================================================
-- dim_customers
-- Dimension table: one row per unique customer
-- =============================================================================
CREATE TABLE dim_customers (
    customer_id         VARCHAR(20)     PRIMARY KEY,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    email               VARCHAR(200)    UNIQUE,
    phone               VARCHAR(50),
    gender              VARCHAR(50),
    age                 INTEGER         CHECK (age BETWEEN 0 AND 120),
    country             VARCHAR(100),
    city                VARCHAR(100),
    segment             VARCHAR(50),
    registration_date   TIMESTAMP,
    is_active           BOOLEAN         DEFAULT TRUE,
    credit_limit        NUMERIC(12, 2)  CHECK (credit_limit >= 0),
    preferred_payment   VARCHAR(50),
    tenure_days         INTEGER         DEFAULT 0,
    etl_timestamp       TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE dim_customers IS 'Customer master dimension — one row per unique customer.';
COMMENT ON COLUMN dim_customers.tenure_days IS 'Days since customer registration (calculated at ETL run time).';

-- Index for common filter patterns
CREATE INDEX idx_dim_customers_country   ON dim_customers (country);
CREATE INDEX idx_dim_customers_segment   ON dim_customers (segment);
CREATE INDEX idx_dim_customers_is_active ON dim_customers (is_active);


-- =============================================================================
-- fact_orders
-- Fact table: one row per order line item
-- =============================================================================
CREATE TABLE fact_orders (
    order_id            VARCHAR(20)     PRIMARY KEY,
    customer_id         VARCHAR(20)     REFERENCES dim_customers(customer_id) ON DELETE SET NULL,
    invoice_date        TIMESTAMP       NOT NULL,
    quantity            INTEGER         CHECK (quantity >= 0),
    unit_price          NUMERIC(10, 2)  CHECK (unit_price >= 0),
    product_category    VARCHAR(100),
    country             VARCHAR(100),
    order_status        VARCHAR(50),
    shipping_cost       NUMERIC(8, 2)   DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_pct        NUMERIC(5, 4)   DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 1),
    revenue             NUMERIC(12, 2)  GENERATED ALWAYS AS
                            (ROUND(quantity * unit_price * (1 - discount_pct), 2)) STORED,
    net_revenue         NUMERIC(12, 2),
    etl_timestamp       TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE fact_orders IS 'Order fact table — one row per order.';
COMMENT ON COLUMN fact_orders.revenue IS 'Auto-calculated: quantity × unit_price × (1 − discount_pct).';

CREATE INDEX idx_fact_orders_customer_id  ON fact_orders (customer_id);
CREATE INDEX idx_fact_orders_invoice_date ON fact_orders (invoice_date);
CREATE INDEX idx_fact_orders_status       ON fact_orders (order_status);
CREATE INDEX idx_fact_orders_category     ON fact_orders (product_category);


-- =============================================================================
-- customer_360
-- Wide denormalised view: one row per customer with all KPIs
-- =============================================================================
CREATE TABLE customer_360 (
    customer_id                 VARCHAR(20)     PRIMARY KEY,

    -- Demographics
    first_name                  VARCHAR(100),
    last_name                   VARCHAR(100),
    email                       VARCHAR(200),
    country                     VARCHAR(100),
    segment                     VARCHAR(50),
    age                         INTEGER,
    tenure_days                 INTEGER,

    -- Purchase behaviour
    total_orders                INTEGER         DEFAULT 0,
    total_revenue               NUMERIC(14, 2)  DEFAULT 0,
    total_net_revenue           NUMERIC(14, 2)  DEFAULT 0,
    avg_order_value             NUMERIC(12, 2)  DEFAULT 0,
    max_order_value             NUMERIC(12, 2)  DEFAULT 0,
    total_quantity              INTEGER         DEFAULT 0,
    unique_categories           INTEGER         DEFAULT 0,
    first_purchase_date         TIMESTAMP,
    last_purchase_date          TIMESTAMP,
    days_since_last_purchase    INTEGER         DEFAULT 9999,
    order_frequency_per_month   NUMERIC(8, 4)   DEFAULT 0,

    -- CLV & Transactions
    clv                         NUMERIC(14, 2)  DEFAULT 0,
    total_transactions          INTEGER         DEFAULT 0,
    total_transaction_amount    NUMERIC(14, 2)  DEFAULT 0,
    avg_transaction_amount      NUMERIC(12, 2)  DEFAULT 0,

    -- Segmentation
    revenue_tier                VARCHAR(20),
    r_score                     SMALLINT        CHECK (r_score BETWEEN 1 AND 5),
    f_score                     SMALLINT        CHECK (f_score BETWEEN 1 AND 5),
    m_score                     SMALLINT        CHECK (m_score BETWEEN 1 AND 5),
    rfm_score                   SMALLINT,
    rfm_segment                 VARCHAR(50),

    -- Churn
    is_churned                  SMALLINT        DEFAULT 0 CHECK (is_churned IN (0, 1)),
    churn_probability           NUMERIC(5, 4),
    churn_prediction            SMALLINT        CHECK (churn_prediction IN (0, 1)),
    churn_risk_band             VARCHAR(10),

    -- Metadata
    etl_timestamp               TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE customer_360 IS 'Denormalised Customer 360 view with all KPIs, RFM scores, and churn predictions.';
COMMENT ON COLUMN customer_360.rfm_segment IS 'Segment: Champion | Loyal | At Risk | Lost | etc.';
COMMENT ON COLUMN customer_360.churn_risk_band IS 'Low | Medium | High';

CREATE INDEX idx_c360_country        ON customer_360 (country);
CREATE INDEX idx_c360_segment        ON customer_360 (segment);
CREATE INDEX idx_c360_rfm_segment    ON customer_360 (rfm_segment);
CREATE INDEX idx_c360_churn          ON customer_360 (is_churned);
CREATE INDEX idx_c360_revenue_tier   ON customer_360 (revenue_tier);
CREATE INDEX idx_c360_clv            ON customer_360 (clv DESC);


-- =============================================================================
-- Useful view: At-Risk customers summary
-- =============================================================================
CREATE OR REPLACE VIEW v_at_risk_customers AS
SELECT
    customer_id,
    first_name || ' ' || last_name   AS full_name,
    email,
    country,
    segment,
    rfm_segment,
    total_revenue,
    clv,
    days_since_last_purchase,
    churn_probability,
    churn_risk_band
FROM customer_360
WHERE is_churned = 0                    -- still "active"
  AND churn_probability > 0.5           -- but model flags as high risk
ORDER BY churn_probability DESC;

COMMENT ON VIEW v_at_risk_customers IS 'Active customers flagged as high churn risk by the ML model.';
