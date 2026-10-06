WITH
UNPIVOT
  AS (
  SELECT
    *
  FROM
    `your-project-id.demo_views.balance`
  WHERE
    account_name IN ('Eigenkapital',
      'Summe Verbindlichkeiten')),
  pivoted AS (
  SELECT
    *
  FROM
  UNPIVOT
  PIVOT
    (SUM(value) FOR account_name IN ('Eigenkapital',
        'Summe Verbindlichkeiten')))
SELECT
  client_name,
  month,
  month_order,
  (Eigenkapital / (Eigenkapital + `Summe Verbindlichkeiten`)) AS capital_ratio
FROM
  pivoted
