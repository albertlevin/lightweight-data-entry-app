-- These examples are written for the schema 'your-project-id'. 
-- For other schemas please change it accordingly.

----------------------------------------------------------------------------------------------------------------------------------------------------
-- 1. meta_def_table: Definition of data entry tables, main entry:
drop   table if exists your-project-id.data_entry.meta_def_table;
create table your-project-id.data_entry.meta_def_table(
    table_id             INTEGER      NOT NULL OPTIONS(description="Choose a unique number")
  , table_schema         STRING(100)  NOT NULL OPTIONS(description="dataset, e.g. ref")
  , table_name           STRING(100)  NOT NULL OPTIONS(description="table name")
  , table_description	   STRING(200)	NOT NULL OPTIONS(description="a description, for use in the fronend")
  , subsystem	           STRING(10) 	NOT NULL OPTIONS(description="Name of the subsystem, e.g. FIN, REF, etc.")
  , table_order	         INTEGER      NOT NULL OPTIONS(description="A sort number for use in dropdown lists at the frontend.")
)
;


----------------------------------------------------------------------------------------------------------------------------------------------------
-- 2. meta_def_column: Columns definitions of all data entry tables.
-- BigQuery does not support physical Primary-Keys for table like e.g. Exasol or Teradata.
-- This is why we define the attribute column_PK (it is needed for the comparison of changes in the data entry client: updated vs. delete/insert).
drop   table if exists your-project-id.data_entry.meta_def_column;
create table your-project-id.data_entry.meta_def_column(
    table_id              INTEGER      NOT NULL OPTIONS(description="The same number as defined in meta_def_table.table_id")
  , column_pk             INTEGER      DEFAULT 0 NOT NULL OPTIONS(description="1: Column is part of the Primary Key. BQ-Tables only support not enforced PKs until spring 2024.")
  , column_system         INTEGER      DEFAULT 0 NOT NULL OPTIONS(description="1: Column is a system column which cannot be changed by the user.")
  , column_id             INTEGER      NOT NULL OPTIONS(description="Choose a unique number per table")
  , column_name           STRING(128)  NOT NULL
  , column_desc           STRING(200)
  , column_comment        STRING(200)
  , min_value             NUMERIC(10)
  , max_value             NUMERIC(10)
  , min_textlen           NUMERIC(3)
  , max_textlen           NUMERIC(3)
  , column_interval_type  INTEGER     -- (0=no check, 1=check overlap, 2=check overlap and gap, not yet implemented)
  , column_constraint     STRING(200) -- e.g. "CHECK(abw IN (0,1))" or "CHECK((von_jahr*100 + von_monat)<=(bis_jahr*100 + bis_monat))"
  , column_default        STRING(300) -- the frontend needs to know defaults when it shall insert new rows (not yet implemented))
  , backendGenerated      INTEGER      DEFAULT 0 NOT NULL OPTIONS(description="1: Content of this column will be set automatically by the backend.")
)
;


----------------------------------------------------------------------------------------------------------------------------------------------------
-- 3. meta_user_to_table
drop   table if exists your-project-id.data_entry.meta_user_to_table;
create table your-project-id.data_entry.meta_user_to_table(
    user_account          STRING(100) NOT NULL OPTIONS(description="The name or email adress that needs the user to log into google.")
  , table_id              INTEGER     NOT NULL OPTIONS(description="The same number as defined in meta_def_table.table_id")
  , sys_timestamp       TIMESTAMP   DEFAULT current_timestamp
)
;

-- Load example account data (replace with your own users):
-- This statement complements missing data rows.
insert into your-project-id.data_entry.meta_user_to_table(user_account, table_id)
  with users as (
    select 'demo.user@example.com' as user_account
  ), tables as(
    select table_id
    from your-project-id.data_entry.meta_def_table
  )
select users.user_account, tables.table_id
from users  -- cross product, yes!
,    tables
left join your-project-id.data_entry.meta_user_to_table as EXISTING
  on  users.user_account     = EXISTING.user_account
  and tables.table_id        = EXISTING.table_id
where EXISTING.user_account is null
  and EXISTING.table_id     is null
;


--------------------------------------------------------------------------------------------------------------------------------------------------
-- 4. meta_user_to_tenant (a KDF number identifies a tenant; users only see rows of their granted KDFs)
drop   table if exists your-project-id.data_entry.meta_user_to_tenant;
create table your-project-id.data_entry.meta_user_to_tenant(
    user_account          STRING(100) NOT NULL OPTIONS(description="The name or email adress that needs the user to log into google. Should be encypted.")
  , kdf                   INTEGER     NOT NULL OPTIONS(description="The tenant number, matched against the kdf column of the data tables")
  , sys_timestamp       TIMESTAMP   DEFAULT current_timestamp
)
;

-- Load example account data and tenant-/kdf values (replace with your own):
-- This statement adds missing data rows.
insert into your-project-id.data_entry.meta_user_to_tenant(user_account, kdf)
with users as (
    select 'demo.user@example.com' as user_account, 1 as KDF
  )
select users.user_account, users.KDF
from users
left join your-project-id.data_entry.meta_user_to_tenant as EXISTING
on  users.user_account = EXISTING.user_account
and users.KDF          = EXISTING.kdf
where EXISTING.user_account is null
  and EXISTING.kdf          is null
;


----------------------------------------------------------------------------------------------------------------------------------------------------
-- 6. data_entry_log_main: data entry log, main entry (one entry per upload)
drop   table if exists your-project-id.data_entry.data_entry_log_main;
create table your-project-id.data_entry.data_entry_log_main(
    log_id                INTEGER     NOT NULL OPTIONS(description="A number that identifys the log main and all detail entries.")
  , subsystem	            STRING(10)  NOT NULL OPTIONS(description="Name of the subsystem, e.g. FIN, REF, etc.")
  , table_name            STRING(100) NOT NULL OPTIONS(description="table name")
  , log_ts_start          TIMESTAMP   DEFAULT current_timestamp
  , log_ts_stop           TIMESTAMP   DEFAULT current_timestamp
  , user_account          STRING(100) NOT NULL OPTIONS(description="The name or email adress that needs the user to log into google.")
  , status                STRING(100) NOT NULL OPTIONS(description="The status of this upload, like started, succesfull, stopped with errors,....")
  , description           STRING(20000)        OPTIONS(description="A description or an error message for this log.")
)
;


----------------------------------------------------------------------------------------------------------------------------------------------------
-- 7. data_entry_log_detail: data entry log, details (0...n entries per upload with details of the changes delete/insert/update)
drop   table if exists your-project-id.data_entry.data_entry_log_detail;
create table your-project-id.data_entry.data_entry_log_detail(
    log_id                INTEGER     NOT NULL OPTIONS(description="The id that identifys the log main and all detail entries.")
  , detail_no             INTEGER     NOT NULL OPTIONS(description="A number that identifys the detail entry within the log.")
  , change_type           STRING(10)  NOT NULL OPTIONS(description="The kind of change like delete, insert, update.")
  , change_values         STRING(2000)         OPTIONS(description="The content data of this change.")
)
;


----------------------------------------------------------------------------------------------------------------------------------------------------
-- 8. data_entry_db_version: data entry database version
drop   table if exists your-project-id.data_entry.data_entry_db_version;
create table your-project-id.data_entry.data_entry_db_version(
    db_ver_major          STRING(10)  NOT NULL OPTIONS(description="The major version of the database. Must match with the server_bq.js version.")
  , db_ver_minor          STRING(10)  NOT NULL OPTIONS(description="The minor version of the database. Should match with the server_bq.js version.")
)
;
