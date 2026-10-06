-- Load the data entry meta tables with an example definition for the reference table sample-tables/ref_bundesland.json.
-- Replace 'your-project-id' with your GCP project ID.

----------------------------------------------------------------------------------------------------------------------------------------------------
-- ref_bundesland:
delete from your-project-id.data_entry.meta_def_column where table_id in(select table_id from your-project-id.data_entry.meta_def_table where table_name = 'ref_bundesland');
delete from your-project-id.data_entry.meta_def_table  where table_name = 'ref_bundesland';

insert into your-project-id.data_entry.meta_def_table(table_id,table_schema,table_order,table_name,table_description,subsystem)
    values(1, 'ref', 0, 'ref_bundesland', 'Bundesland', 'REF');

insert into your-project-id.data_entry.meta_def_column(table_id, column_id, column_pk, column_system, column_name, column_desc, column_comment, min_value, max_value, min_textlen, max_textlen, column_interval_type, column_default, column_constraint, backendGenerated)
    values(1, 1, 1, 0, 'bundesland', 'Bundesland', Null, Null, Null, Null, Null, Null, Null, Null, 0);
insert into your-project-id.data_entry.meta_def_column(table_id, column_id, column_pk, column_system, column_name, column_desc, column_comment, min_value, max_value, min_textlen, max_textlen, column_interval_type, column_default, column_constraint, backendGenerated)
    values(1, 2, 0, 0, 'bundesland_bez', 'Bundesland-Bezeichnung', Null, Null, Null, Null, Null, Null, Null, Null, 0);
insert into your-project-id.data_entry.meta_def_column(table_id, column_id, column_pk, column_system, column_name, column_desc, column_comment, min_value, max_value, min_textlen, max_textlen, column_interval_type, column_default, column_constraint, backendGenerated)
    values(1, 3, 0, 0, 'bundesland_gebiet', 'Gebiet', Null, Null, Null, Null, Null, Null, Null, Null, 0);
insert into your-project-id.data_entry.meta_def_column(table_id, column_id, column_pk, column_system, column_name, column_desc, column_comment, min_value, max_value, min_textlen, max_textlen, column_interval_type, column_default, column_constraint, backendGenerated)
    values(1, 4, 0, 0, 'bundesland_gebiet_bez', 'Gebiet', Null, Null, Null, Null, Null, Null, Null, Null, 0);


----------------------------------------------------------------------------------------------------------------------------------------------------
-- Database version table:
truncate table your-project-id.data_entry.data_entry_db_version;
insert into your-project-id.data_entry.data_entry_db_version(db_ver_major, db_ver_minor) values('02', '20');


------------------------------------------------------------------------
-- system_columns:
-- Columns named sys_user / sys_timestamp are filled by the backend and cannot be edited.
update your-project-id.data_entry.meta_def_column set column_system = case when column_name in('sys_user', 'sys_timestamp') then 1 else 0 end where column_system=0;
update your-project-id.data_entry.meta_def_column set column_default = 'current_timestamp()' where column_name = 'sys_timestamp';
update your-project-id.data_entry.meta_def_column set column_default = 'userId' where column_name = 'sys_user';


------------------------------------------------------------------------
-- What do we have now:
select t.*, c.ColCnt
from your-project-id.data_entry.meta_def_table as t
left join (select table_id, count(*) as ColCnt
           from your-project-id.data_entry.meta_def_column
           group by table_id) as c
  on t.table_id = c.table_id
order by t.table_order
;


-----------------------------------------------------------------------
-- Set permissions on tables (re-run after any new table has been defined)
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
