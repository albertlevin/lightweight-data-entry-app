WITH
  pivoted AS (
  SELECT
    *
  FROM
    `your-project-id.demo_views.revenues`
  PIVOT
    (SUM(value) FOR account IN ('Umsatz',
        'Umsatzkosten')))
SELECT
  client_name,
  customer,
  product_type,
  year,
  month,
  month_order,
  Umsatz AS revenue,
  Umsatzkosten AS revenue_costs,
  Umsatz + Umsatzkosten AS gross_sales_margin,
  (Umsatz + Umsatzkosten)/(Umsatz) AS sales_margin_share
FROM
  pivoted
