CREATE OR REPLACE VIEW
  `demo_views.dim_year` AS
SELECT
  DISTINCT year
FROM
  `demo_views.revenues`
