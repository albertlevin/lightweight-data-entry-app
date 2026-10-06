CREATE OR REPLACE VIEW
  `your-project-id.demo_views.pl` AS
WITH
  client_1_pl AS (
  SELECT
    *
  FROM
    `your-project-id.demo_client_1.pl`),
  client_2_pl AS (
  SELECT
    *
  FROM
    `your-project-id.demo_client_2.pl`),
  clients AS (
  SELECT
    'Client A' AS client_name,
    *
  FROM
    client_1_pl
  UNION ALL
  SELECT
    'Client B' AS client_name,
    *
  FROM
    client_2_pl)
SELECT
  client_name,
  kennzahl AS account_name,
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
  value
FROM
  clients
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

