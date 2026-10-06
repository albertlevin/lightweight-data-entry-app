-- Template: create a new data entry definition for an existing BigQuery table.
-- Replace values for DATASET_NAME, TABLE_NAME and subsystem as needed.

-- Example source table
select *
from your-project-id.ref.ref_example_table
;

--------------------------------------------------------------------------------------------------------------------------
-- Preparations:
-- Check if the definition already exists:
select *
from your-project-id.data_entry.meta_def_table
where table_schema = 'ref'
  and table_name = 'ref_example_table';

-- If needed, remove the previous definition in this order:
delete from your-project-id.data_entry.meta_def_column
where table_id in (
  select table_id
  from your-project-id.data_entry.meta_def_table
  where table_schema = 'ref' and table_name = 'ref_example_table'
);

 delete from your-project-id.data_entry.meta_def_table
 where table_schema = 'ref' and table_name = 'ref_example_table';

--------------------------------------------------------------------------------------------------------------------------
-- 1) Create the main table entry in meta_def_table
insert into your-project-id.data_entry.meta_def_table(table_id, table_schema, table_order, table_name, table_description, subsystem)
with
  new_id as (
    select ifnull(max(table_id), 0) + 1 as table_id_new
    from your-project-id.data_entry.meta_def_table
  ),
  tab_main as (
    select
      table_schema,
      table_name,
      table_type,
      'REF' as subsystem
    from your-project-id.ref.INFORMATION_SCHEMA.TABLES
    where table_name = 'ref_example_table'
  ),
  existing as (
    select table_name, table_schema
    from your-project-id.data_entry.meta_def_table
    where table_schema = 'ref'
      and table_name = 'ref_example_table'
  )
select
  new_id.table_id_new as table_id,
  tab_main.table_schema,
  new_id.table_id_new as table_order,
  tab_main.table_name,
  table_type || ' ' || tab_main.table_name as table_description,
  subsystem
from new_id, tab_main
left join existing
  on tab_main.table_name = existing.table_name
 and tab_main.table_schema = existing.table_schema
where existing.table_schema is null
  and existing.table_name is null
;

--------------------------------------------------------------------------------------------------------------------------
-- 2) Create column metadata in meta_def_column
insert into your-project-id.data_entry.meta_def_column
  (table_id, column_pk, column_system, column_id, column_name, column_desc, column_comment, min_value, max_value, min_textlen, max_textlen, column_interval_type, column_constraint, column_default, backendGenerated)
with
  tab_id as (
    select table_id
    from your-project-id.data_entry.meta_def_table
    where table_schema = 'ref'
      and table_name = 'ref_example_table'
  ),
  tab_col as (
    select *
    from your-project-id.ref.INFORMATION_SCHEMA.COLUMNS
    where table_name = 'ref_example_table'
  ),
  existing as (
    select t.table_schema, t.table_name, t.table_id, c.column_name
    from your-project-id.data_entry.meta_def_table as t
    join your-project-id.data_entry.meta_def_column as c
      on t.table_id = c.table_id
    where t.table_schema = 'ref'
      and t.table_name = 'ref_example_table'
  )
select
    tab_id.table_id,
    0 as column_pk,
    case when (tab_col.column_name = 'sys_timestamp' or tab_col.column_name = 'sys_user') then 1 else 0 end as column_system,
    row_number() over(partition by tab_col.table_catalog, tab_col.table_schema, tab_col.table_name order by ordinal_position) as column_id,
    tab_col.column_name,
    tab_col.column_name as column_desc,
    tab_col.column_name as column_comment,
    null as min_value,
    null as max_value,
    null as min_textlen,
    null as max_textlen,
    0 as column_interval_type,
    '' as column_constraint,
    case
      when tab_col.column_name = 'sys_timestamp' then 'current_timestamp()'
      when tab_col.column_name = 'sys_user' then 'userId'
    end as column_default,
    0 as backendGenerated
from tab_id, tab_col
left join existing
  on tab_col.table_name = existing.table_name
 and tab_col.column_name = existing.column_name
where existing.table_id is null
  and existing.column_name is null
;

--------------------------------------------------------------------------------------------------------------------------
-- 3) Define logical primary key columns
update your-project-id.data_entry.meta_def_column
set column_pk = 1
where table_id in (
  select table_id
  from your-project-id.data_entry.meta_def_table
  where table_schema = 'ref'
    and table_name = 'ref_example_table'
)
and column_name in('kdf', 'example_business_key')
;

--------------------------------------------------------------------------------------------------------------------------
-- 4) Grant table access to a user account
insert into your-project-id.data_entry.meta_user_to_table(user_account, table_id)
with users as (
    select 'demo.user@example.com' as user_account
  ), tables as(
    select table_id
    from your-project-id.data_entry.meta_def_table
  )
select users.user_account, tables.table_id
from users,
     tables
left join your-project-id.data_entry.meta_user_to_table as existing
  on users.user_account = existing.user_account
 and tables.table_id = existing.table_id
where existing.user_account is null
  and existing.table_id is null
;
