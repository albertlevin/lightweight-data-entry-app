  CREATE OR REPLACE VIEW
    `your-project-id.demo_views.revenues` AS
WITH
  revenues AS (
  SELECT
    'Client A' AS client_name,
    2023 AS year,
    *
  FROM
    `your-project-id.demo_client_1.umsatz_2023`
  UNION ALL
  SELECT
    'Client A' AS client_name,
    2024 AS year,
    *
  FROM
    `your-project-id.demo_client_1.umsatz_2024`)
SELECT
  client_name,
  kunde AS customer,
  produkt AS product_type,
  konto AS account,
  category AS month,
  CASE
    WHEN category = 'Jan' THEN 1
    WHEN category = 'Feb' THEN 2
    WHEN category = 'Mar' THEN 3
    WHEN category = 'Apr' THEN 4
    WHEN category = 'May' THEN 5
    WHEN category = 'Jun' THEN 6
    WHEN category = 'Jul' THEN 7
    WHEN category = 'Aug' THEN 8
    WHEN category = 'Sep' THEN 9
    WHEN category = 'Oct' THEN 10
    WHEN category = 'Nov' THEN 11
    WHEN category = 'Dec' THEN 12
    ELSE 99
END
  AS month_order,
  year,
  value
FROM
  revenues
UNPIVOT
  (value FOR category IN (Jan,
      Feb,
      Mar,
      Apr,
      May,
      Jun,
      Jul,
      Aug,
      Sep,
      Oct,
      Nov,
      Dec))
