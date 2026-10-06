#!/bin/bash
# Registers the demo tables in the data entry meta tables and grants them to USER_ACCOUNT.
# Credentials come from `gcloud auth login` or GOOGLE_APPLICATION_CREDENTIALS in your shell.
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
USER_ACCOUNT="${USER_ACCOUNT:-demo.user@example.com}"
gcloud config set project "$PROJECT_ID"

LOCATION="europe-west3"
DATASET_NAMES=("demo_client_1" "demo_client_2")

# truncate all tables before starting
SQL="DELETE
FROM
  data_entry.meta_def_table
WHERE
  TRUE;
DELETE
FROM
  data_entry.meta_def_column
WHERE
  TRUE;
DELETE
FROM
  data_entry.meta_user_to_table
WHERE
  TRUE;"
bq query --use_legacy_sql=false $SQL

# datasets and tables already exist;
# tables already filled with data.
# add new tables to data_entry.meta_def_table: PL & umsatz
i=0
for DATASET in "${DATASET_NAMES[@]}"; do
  SQL="INSERT INTO \
    \`${PROJECT_ID}.data_entry.meta_def_table\` (table_id, \
      table_schema, \
      table_order, \
      table_name, \
      table_description, 
      subsystem)
  VALUES 
    ($i, \"$DATASET\", 0, 'pl', 'GuV', \"$DATASET\"), 
    ($((i+1)), \"$DATASET\", 1, 'balance', 'Bilanz', \"$DATASET\")"
  # echo $SQL
  bq query --use_legacy_sql=false $SQL

# add columns, descriptions, and PKs to data_entry.meta_def_column
  SQL="INSERT INTO
    ${PROJECT_ID}.data_entry.meta_def_column (table_id,
      column_id,
      column_pk,
      column_system,
      column_name,
      column_desc,
      column_comment,
      min_value,
      max_value,
      min_textlen,
      max_textlen,
      column_interval_type,
      column_default,
      column_constraint,
      backendGenerated)
  VALUES
    ($i, 1, 1, 0, 'kennzahl', 'Konto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 2, 0, 0, 'Jan', 'Januar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 3, 0, 0, 'Feb', 'Februar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 4, 0, 0, 'Mar', 'März', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 5, 0, 0, 'Apr', 'April', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 6, 0, 0, 'May', 'Mai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 7, 0, 0, 'Jun', 'Juni', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 8, 0, 0, 'Jul', 'Juli', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 9, 0, 0, 'Aug', 'August', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 10, 0, 0, 'Sep', 'September', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 11, 0, 0, 'Oct', 'Oktober', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 12, 0, 0, 'Nov', 'November', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($i, 13, 0, 0, 'Dec', 'Dezember', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)"

  bq query --use_legacy_sql=false $SQL
  
  # balance
  SQL="INSERT INTO
    ${PROJECT_ID}.data_entry.meta_def_column (table_id,
      column_id,
      column_pk,
      column_system,
      column_name,
      column_desc,
      column_comment,
      min_value,
      max_value,
      min_textlen,
      max_textlen,
      column_interval_type,
      column_default,
      column_constraint,
      backendGenerated)
  VALUES
    ($((i+1)), 1, 1, 0, 'kennzahl', 'Konto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 2, 0, 0, 'Jan', 'Januar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 3, 0, 0, 'Feb', 'Februar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 4, 0, 0, 'Mar', 'März', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 5, 0, 0, 'Apr', 'April', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 6, 0, 0, 'May', 'Mai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 7, 0, 0, 'Jun', 'Juni', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 8, 0, 0, 'Jul', 'Juli', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 9, 0, 0, 'Aug', 'August', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 10, 0, 0, 'Sep', 'September', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 11, 0, 0, 'Oct', 'Oktober', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 12, 0, 0, 'Nov', 'November', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
    ($((i+1)), 13, 0, 0, 'Dec', 'Dezember', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)"

  bq query --use_legacy_sql=false $SQL
  ((i++))
  ((i++))
done

# add umsatz_2023, umsatz_2024 to data_entry.meta_def_table
# currently, only in dataset demo_client_1
# continue with the counter
SQL="INSERT INTO \
  \`${PROJECT_ID}.data_entry.meta_def_table\` (table_id, \
    table_schema, \
    table_order, \
    table_name, \
    table_description, 
    subsystem)
VALUES 
  ($i, 'demo_client_1', 2, 'umsatz_2023', 'Umsatz_2023', 'demo_client_1'), 
  ($((i+1)), 'demo_client_1', 3, 'umsatz_2024', 'Umsatz_2024', 'demo_client_1')"
# echo $SQL
bq query --use_legacy_sql=false $SQL


# add umsatz_2023, umsatz_2024 to data_entry.meta_def_column
# currently, only in dataset demo_client_1
# continue with the counter
SQL="INSERT INTO
  ${PROJECT_ID}.data_entry.meta_def_column (table_id,
    column_id,
    column_pk,
    column_system,
    column_name,
    column_desc,
    column_comment,
    min_value,
    max_value,
    min_textlen,
    max_textlen,
    column_interval_type,
    column_default,
    column_constraint,
    backendGenerated)
VALUES
  ($i, 1, 1, 0, 'kunde', 'Kunde', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 2, 1, 0, 'produkt', 'Produkt', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 3, 1, 0, 'konto', 'Konto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 4, 0, 0, 'Jan', 'Januar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 5, 0, 0, 'Feb', 'Februar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 6, 0, 0, 'Mar', 'März', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 7, 0, 0, 'Apr', 'April', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 8, 0, 0, 'May', 'Mai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 9, 0, 0, 'Jun', 'Juni', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 10, 0, 0, 'Jul', 'Juli', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 11, 0, 0, 'Aug', 'August', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 12, 0, 0, 'Sep', 'September', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 13, 0, 0, 'Oct', 'Oktober', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 14, 0, 0, 'Nov', 'November', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($i, 15, 0, 0, 'Dec', 'Dezember', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 1, 1, 0, 'kunde', 'Kunde', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 2, 1, 0, 'produkt', 'Produkt', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 3, 1, 0, 'konto', 'Konto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 4, 0, 0, 'Jan', 'Januar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 5, 0, 0, 'Feb', 'Februar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 6, 0, 0, 'Mar', 'März', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 7, 0, 0, 'Apr', 'April', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 8, 0, 0, 'May', 'Mai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 9, 0, 0, 'Jun', 'Juni', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 10, 0, 0, 'Jul', 'Juli', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 11, 0, 0, 'Aug', 'August', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 12, 0, 0, 'Sep', 'September', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 13, 0, 0, 'Oct', 'Oktober', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 14, 0, 0, 'Nov', 'November', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ($((i+1)), 15, 0, 0, 'Dec', 'Dezember', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)"

bq query --use_legacy_sql=false $SQL


# Set permissions on tables
# need to re-run after any new table created
SQL="INSERT INTO
  ${PROJECT_ID}.data_entry.meta_user_to_table(user_account,
    table_id)
WITH
  users AS (
  SELECT
    '${USER_ACCOUNT}' AS user_account ),
  tables AS(
  SELECT
    table_id
  FROM
    ${PROJECT_ID}.data_entry.meta_def_table )
SELECT
  users.user_account,
  tables.table_id
FROM
  users,
  tables
LEFT JOIN
  ${PROJECT_ID}.data_entry.meta_user_to_table AS EXISTING
ON
  users.user_account = EXISTING.user_account
  AND tables.table_id = EXISTING.table_id
WHERE
  EXISTING.user_account IS NULL
  AND EXISTING.table_id IS NULL ;"

bq query --use_legacy_sql=false $SQL
