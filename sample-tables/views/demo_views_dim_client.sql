CREATE OR REPLACE VIEW
  `demo_views.dim_client` AS
SELECT
  DISTINCT client_name
FROM
  `demo_views.pl`
