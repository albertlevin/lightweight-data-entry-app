const largeDataAmountLimit = 1000;
const verbose = true;

// retrieves the limit value for large data
export async function getLargeDataAmountLimit() {
  return largeDataAmountLimit;
}

// retrieves a list of all subsystems defined in the data entry metadata
export async function getSubsystemList(bqCli, prjID, loc) {
  const query = `SELECT distinct subsystem
      FROM  \`${prjID}.data_entry.meta_def_table\`
      ORDER BY subsystem;`;
  const options = {
    query,
    loc,
  };
  const [rows] = await bqCli.query(options);
  return rows;
}

// ----------------------------------------------------------------------------------------------------
// retrieves a list of all tenant/KDF-Values granted to the user
export async function getUserKdfList(bqCli, prjID, loc, userId) {
  const query = `SELECT distinct kdf
      from \`${prjID}.data_entry.meta_user_to_tenant\`
      WHERE user_account = '${userId}' order by kdf;`;
  const options = {
    query,
    loc,
  };
  const [KList] = await bqCli.query(options);
  return KList;
}

// ----------------------------------------------------------------------------------------------------
// Retrieves the dataset name of a BQ schema of a given subsystem and tabName from the data entry metadata
export async function getBQDatasetFromSubsystem(
  bqCli,
  prjID,
  loc,
  subSys,
  tabName,
) {
  const query = `SELECT distinct table_schema
      FROM \`${prjID}.data_entry.meta_def_table\`
      WHERE upper(subsystem) = upper('${subSys}') AND table_name = '${tabName}'`;
  const options = {
    query,
    loc,
  };
  // This query returns one or zero rows:
  const [dataset] = await bqCli.query(options);
  // Check if there was a result:
  if (dataset.length > 0) {
    const datasetName = dataset[0].table_schema;
    return datasetName;
  } else {
    console.log(
      `getBQDatasetFromSubsystem(): Dataset for '${subSys}/${tabName}' not found.`,
    );
  }
}

// ----------------------------------------------------------------------------------------------------
// retrieves a list of all tables of a given subsystem as defined in the data entry metadata.
// Only lists table which the user is granted to (via meta_user_to_table).
export async function getSubsystemTableList(bqCli, prjID, loc, userId, subSys) {
  const query = `SELECT distinct
          table_name
        , table_description
        , table_schema
        , subsystem
        , table_order
      FROM  \`${prjID}.data_entry.meta_def_table\` as T
      INNER JOIN (
         SELECT table_id
         FROM \`${prjID}.data_entry.meta_user_to_table\`
         WHERE user_account = '${userId}'
        ) as G
        on T.table_id = G.table_id
      WHERE upper(subsystem) = upper('${subSys}')
      order by subsystem, table_order;`;
  const options = {
    query,
    loc,
  };
  const [tables] = await bqCli.query(options);
  return tables;
}

// ----------------------------------------------------------------------------------------------------
// This is a second version of getTableSchemaWithPrimaryKeys for complete meta data:
export async function getTableSchemaFull(
  bqCli,
  prjID,
  loc,
  userId,
  subSys,
  tabName,
  ysnSosCols,
) {
  const datasetName = await getBQDatasetFromSubsystem(
    bqCli,
    prjID,
    loc,
    subSys,
    tabName,
  );
  // Column-Metadata including auto-primary key feature and generic data type mapping:
  let query = `WITH
    tab_schema AS (
      SELECT distinct
        column_name
      , is_nullable
      , data_type
      , case
          when data_type = 'TIMESTAMP' or data_type = 'DATETIME' then 'dateTime'
          when data_type = 'DATE' then 'date'
          when data_type = 'TIME' then 'time'
          when data_type = 'FLOAT64' then 'numberFloat'
          when data_type = 'BYTES' or data_type = 'INT64' or data_type = 'BIGNUMERIC' then 'numberInt'
          when (substr(upper(data_type), 1, 7) = 'NUMERIC') and (instr(data_type, ',', 7) = 0) then 'numberInt'
          when (substr(upper(data_type), 1, 7) = 'NUMERIC') and (instr(data_type, ',', 7) > 0) then 'numberFloat'
          when data_type = 'BOOL' then 'boolean'
          when substr(upper(data_type), 1, 6) = 'STRING' then 'string'
        else 'unkown'
        end as genericType
        , case
          when data_type = 'TIMESTAMP' then 'TIMESTAMP'
          when data_type = 'DATETIME' then 'DATETIME'
          when data_type = 'DATE' then 'DATE'
          when data_type = 'TIME' then 'TIME'
          when data_type = 'FLOAT64' then 'FLOAT64'
          when data_type = 'BYTES' or data_type = 'INT64' then 'INT64'
          when (substr(upper(data_type), 1, 7) = 'NUMERIC') and (instr(data_type, ',', 7) = 0) then 'NUMERIC'
          when (substr(upper(data_type), 1, 7) = 'NUMERIC') and (instr(data_type, ',', 7) > 0) then 'NUMERIC'
          when data_type = 'BOOL' then 'BOOL'
          when substr(upper(data_type), 1, 6) = 'STRING' then 'STRING'
        else 'unkown'
        end as paramType
      FROM \`${prjID}.${datasetName}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = '${tabName}'
    ),
    tab_detail AS (
      select
          C.column_id
        , C.column_name
        , C.column_pk
        , C.column_system
        , C.column_desc
        , case when C.column_system = 1 then '(Systemfeld)'
              else COALESCE(C.column_comment, C.column_desc, C.column_name)
          end as column_description
        , C.min_value   as minValue
        , C.max_value   as maxValue
        , C.min_textlen as minTextLen
        , C.max_textlen as maxTextLen
        , C.column_interval_type
        , C.column_default
        , C.column_constraint
        , C.backendGenerated
        , sum(case when C.column_pk=1 then 1 else 0 end) over(partition by C.table_id) as PKCount
      from \`${prjID}\`.data_entry.meta_def_table  as T
      join \`${prjID}\`.data_entry.meta_def_column as C
        on   T.table_id  = C.table_id
        INNER JOIN (
          SELECT table_id
          FROM \`${prjID}.data_entry.meta_user_to_table\`
          WHERE user_account = '${userId}'
          ) as G
        ON T.table_id = G.table_id
      WHERE T.table_name = '${tabName}'
  )
  SELECT distinct
      s.column_name         as fieldName
    , s.data_type           as baseDataType
    , s.genericType
    , s.paramType
    , case when d.PKCount = 0 then 1 else d.column_pk end as primaryKey --column_pk
    , case when (d.column_pk = 1 or upper(s.is_nullable) = 'NO') then 1 else 0 end as required
    , d.column_system       as systemColumn
    , d.column_description  as description
    , d.minValue
    , d.maxValue
    , d.minTextLen
    , d.maxTextLen
    , d.column_interval_type as dateIntervalCheck
    , d.column_default       as defaultValue
    , d.column_constraint    as columnConstraint
    , d.column_id
    , d.backendGenerated
  FROM  tab_schema as s
  JOIN  tab_detail as d
    on (s.column_name = d.column_name)`;
  if (ysnSosCols == false) {
    query += " WHERE (d.column_system = 0)";
  }
  query += " ORDER BY d.column_id";
  const options = {
    query,
    loc,
  };
  // custom renaming logic for BigQuery: rename keys in the returned 'rows' object first
  // then, rename the values for the new keys
  const keyMap = {
    column_name: "fieldName",
    data_type: "baseDataType",
    column_pk: "primaryKey",
    column_system: "systemColumn",
    column_description: "description",
    column_interval_type: "dateIntervalCheck",
    column_default: "defaultValue",
    column_constraint: "columnConstraint",
  };
  const valueMap = {
    primaryKey: {
      0: false,
      1: true,
    },
    systemColumn: {
      0: false,
      1: true,
    },
    required: {
      0: false,
      1: true,
    },
    backendGenerated: {
      0: false,
      1: true,
    },
  };
  // run the query:
  const [rows] = await bqCli.query(options);

  // custom renaming for BigQuery:
  const renamedRows = rows.map((row) => {
    const newRow = {};
    Object.keys(row).forEach((key) => {
      const newKey = keyMap[key] || key;
      const valueMapping = valueMap[newKey];
      if (valueMapping === undefined) {
        // if there is no value mapping for the new key in the valueMap, use the old value for the new key
        newRow[newKey] = row[key];
      } else {
        // otherwise, use the mapping for the old value with a fallback to the old value
        newRow[newKey] = Object.prototype.hasOwnProperty.call(
          valueMapping,
          row[key],
        )
          ? valueMapping[row[key]]
          : row[key];
      }
    });
    return newRow;
  });
  return renamedRows;
}

// ----------------------------------------------------------------------------------------------------
// Get the content data of the desired table:
// Only call this function, if hasUserTableGrant() was successful!
// This function only selects non-system columns!
export async function getTableContent(
  bqCli,
  prjID,
  loc,
  userId,
  subSys,
  tabName,
) {
  const datasetName = await getBQDatasetFromSubsystem(
    bqCli,
    prjID,
    loc,
    subSys,
    tabName,
  );
  if (verbose == true) {
    console.log(
      `getTableContent(), datasetId of '${subSys}/${tabName}' is: '${datasetName}'`,
    );
  }
  const schema = await getTableSchemaFull(
    bqCli,
    prjID,
    loc,
    userId,
    subSys,
    tabName,
    true,
  );
  const tableColumns = schema.map((row) => row.fieldName);
  let sTabColNoSys = "";
  for (const objcol of schema) {
    if (objcol.systemColumn != true) {
      if (sTabColNoSys != "") {
        sTabColNoSys += ",";
      }
      if (objcol.genericType.toUpperCase() == "DATE") {
        sTabColNoSys +=
          'FORMAT_TIMESTAMP("%Y-%m-%d", ' +
          objcol.fieldName +
          ") as " +
          objcol.fieldName;
      } else if (objcol.genericType.toUpperCase() == "DATETIME") {
        sTabColNoSys +=
          'FORMAT_TIMESTAMP("%Y-%m-%d %H:%M:%S", ' +
          objcol.fieldName +
          ") as " +
          objcol.fieldName;
      } else if (objcol.genericType.toUpperCase() == "TIMESTAMP") {
        sTabColNoSys +=
          'FORMAT_TIMESTAMP("%Y-%m-%d %H:%M:%S", ' +
          objcol.fieldName +
          ") as " +
          objcol.fieldName;
      } else if (objcol.genericType.toUpperCase() == "NUMBERINT") {
        sTabColNoSys +=
          "cast(" + objcol.fieldName + " as INT64) as " + objcol.fieldName;
      } else if (objcol.genericType.toUpperCase() == "NUMBERFLOAT") {
        sTabColNoSys +=
          "cast(" + objcol.fieldName + " as FLOAT64) as " + objcol.fieldName;
      } else {
        sTabColNoSys += objcol.fieldName;
      }
    }
  }

  // Order by all PK-Columns:
  let sPKCols = "";
  for (const objcol of schema) {
    if (objcol.primaryKey == true) {
      if (sPKCols != "") {
        sPKCols += ",";
      }
      sPKCols += objcol.fieldName;
    }
  }

  // Build the query:
  let query = `SELECT ${sTabColNoSys} FROM \`${prjID}.${datasetName}.${tabName}\``;

  // Does this table have a KDF column? Then we have to use KDF grants:
  if (tableColumns.find((element) => element.toUpperCase() == "KDF")) {
    if (verbose == true) {
      console.log(`Column KDF found in '${subSys}/${tabName}'.`);
    }
    const kdfList = await getUserKdfList(bqCli, prjID, loc, userId);
    function checkString(element, index) {
      return element.kdf;
    }
    const kdfNumberList = kdfList.map(checkString);
    if (verbose == true) {
      console.log("granted KDFs:", kdfNumberList);
    }

    // Does the user have any KDF grants been assigned?
    if (kdfList.length > 0) {
      query += ` WHERE KDF IN(${kdfNumberList})`;
    } else {
      query += " WHERE (1=0)";
      if (verbose == true) {
        console.log(
          "Table has a KDF column, but the user does not have any KDFs granted.",
        );
      }
    }
  } else {
    query += " WHERE (1=1)";
    if (verbose == true) {
      console.log(
        `No KDF column in '${subSys}/${tabName}'. Returning all rows.`,
      );
    }
  }

  if (sPKCols != "") {
    query += ` ORDER BY ${sPKCols}`;
  }
  query += ";";
  const options = {
    query,
    loc,
  };
  // run the query
  const [rows] = await bqCli.query(options);
  return rows;
}

// ----------------------------------------------------------------------------------------------------
// New on 2024-05-07:
// Does a table exist within a subsystem?
// (No grants of the user to this table will be checked)
export async function existsTableInSubsystem(
  bqCli,
  prjID,
  loc,
  subSys,
  tabName,
) {
  const query = `select count(*) as tableCount
    from \`${prjID}.data_entry.meta_def_table\`  as t
    where upper(t.table_name)   = upper('${tabName}')
      and upper(t.subsystem)    = upper('${subSys}')`;
  const options = {
    query,
    loc,
  };
  // This query returns one or zero rows:
  const [tabCnt] = await bqCli.query(options);

  // Check if there was a result:
  if (tabCnt[0].tableCount == 1) {
    if (verbose == true) {
      console.log(`'${subSys}/${tabName}' exists.`);
    }
    return true;
  } else {
    if (verbose == true) {
      console.log(`There is no table ${tabName} in ${subSys}!`);
    }
    return false;
  }
}

// ----------------------------------------------------------------------------------------------------
// New on 2024-05-02:
// Has a user been granted to a table?
export async function hasUserTableGrant(
  bqCli,
  prjID,
  loc,
  userId,
  subSys,
  tabName,
) {
  const query = `select count(*) as grantCount
    from      \`${prjID}.data_entry.meta_user_to_table\` as g
    inner join \`${prjID}.data_entry.meta_def_table\`  as t
      on g.table_id = t.table_id
    where upper(t.table_name)   = upper('${tabName}')
      and upper(t.subsystem)    = upper('${subSys}')
      and upper(g.user_account) = upper('${userId}')`;
  const options = {
    query,
    loc,
  };
  // This query returns one or zero rows:
  const [grantCnt] = await bqCli.query(options);

  // Check if there was a result:
  if (grantCnt[0].grantCount == 1) {
    return true;
  } else {
    if (verbose == true) {
      console.log(
        `User '${userId}' has not yet been granted to ${subSys}/${tabName}!`,
      );
    }
    return false;
  }
}

// ----------------------------------------------------------------------------------------------------
// For a better error handling:
class BqDeleteError extends Error {
  constructor(message, number) {
    super(message);
    this._number = number;
    this.name = "BqDeleteError";
  }
}
class BqInsertError extends Error {
  constructor(message, number) {
    super(message);
    this._number = number;
    this.name = "BqInsertError";
  }
}
class BqUpdateError extends Error {
  constructor(message, number) {
    super(message);
    this._number = number;
    this.name = "BqUpdateError";
  }
}

// ----------------------------------------------------------------------------------------------------
// This function does some tidy up works on the log tables (main and details)
async function cleanUp_logs(bqCli, prjID, loc) {
  const sqlCL1 = `delete from \`${prjID}.data_entry.data_entry_log_main\`
  where (
          (status not IN('Success', 'Error'))
      and (
        (log_ts_start < TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL -5 MINUTE))
        or (log_id in(
          select log_id
          from \`${prjID}.data_entry.data_entry_log_main\`
          except distinct
          select log_id
          from \`${prjID}.data_entry.data_entry_log_detail\`
          )
        )
      )
    ) 
    OR (
      (log_ts_start < TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL -365 DAY))
    );`;

  // Tidy up log_details with no corresponding main entry:
  const sqlCL2 = `delete from \`${prjID}.data_entry.data_entry_log_detail\`
  where log_id not in(select log_id from \`${prjID}.data_entry.data_entry_log_main\`);`;
  // Can we run both statements at once?
  const sqlCL = sqlCL1 + sqlCL2;
  try {
    const options1 = {
      query: sqlCL,
      location: loc,
    };
    const [result] = await bqCli.query(options1);
    return true;
  } catch (error) {
    console.log("Error: " + error.message);
    return false;
  }
}

// ----------------------------------------------------------------------------------------------------
// The function creates a new Log entry and returns the log_ID of the new entry or null in case of an error.
async function create_log_main_entry(
  bqCli,
  prjID,
  loc,
  userId,
  subSys,
  tabName,
  description,
  startTS,
) {
  // Do some cleansing of main entries (of all users) which are older than 5 minutes, and not successful or error
  await cleanUp_logs(bqCli, prjID, loc);

  // create a new log entry with the succeeding log_Id:
  const sqlIns = `insert into \`${prjID}.data_entry.data_entry_log_main\`
    (log_id, subsystem, table_name, log_ts_start, log_ts_stop, user_account, status, description)
  select
      newLogEntry.LogID_new as log_id
    , '${subSys}'                     as subsystem
    , '${tabName}'                    as table_name
    , cast('${startTS}' as timestamp) as log_ts_start
    , cast('${startTS}' as timestamp) as log_ts_stop
    , '${userId}'                     as user_account
    , 'Started'                       as status
    , '${description}'                as description
  from (
    select ifnull(max(log_id), 0) + 1 as LogID_new
    from \`${prjID}.data_entry.data_entry_log_main\`
  ) as newLogEntry;`;
  // get the newly created logID:
  const sqlLogId = `select ifnull(max(log_id), 0) as latest_LogID
  from \`${prjID}.data_entry.data_entry_log_main\`
  where (user_account   = '${userId}' )
    and (log_ts_start) >= cast('${startTS}' as timestamp)`;
  const options1 = {
    query: sqlIns,
    location: loc,
  };
  const options2 = {
    query: sqlLogId,
    location: loc,
  };
  try {
    await bqCli.query(options1);
    let logMainID = 0;
    // hav a little break to make sure the insert has finished:
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // This query returns always one row:
    const [dataset] = await bqCli.query(options2);
    if (dataset.length > 0) {
      logMainID = dataset[0].latest_LogID;
      if (logMainID > 0) {
        return logMainID;
      } else {
        console.log("LogID could not be found!");
      }
    } else {
      console.log("LogID could not be found!");
    }
  } catch (error) {
    console.log("Error: " + error.message);
    return 0;
  }
}

// ----------------------------------------------------------------------------------------------------
// This function edits a (started) log main entry: status can be running, successful or error.
async function edit_log_main_entry(
  bqCli,
  prjID,
  loc,
  logID,
  status,
  description,
) {
  // description will be cleansed and then added to the existing data:
  const message = description
    .replaceAll('"', "")
    .replaceAll(String.fromCharCode(13), ".")
    .replaceAll(String.fromCharCode(10), ".")
    .replaceAll(String.fromCharCode(34), ".")
    .replaceAll(String.fromCharCode(37), ".")
    .replaceAll(String.fromCharCode(96), ".")
    .replaceAll(String.fromCharCode(146), ".")
    .replaceAll(String.fromCharCode(180), ".")
    .replaceAll("\\", "")
    .replaceAll("^", "")
    .replaceAll("<", "")
    .replaceAll(">", "")
    .replaceAll("[", "")
    .replaceAll("]", "")
    .replaceAll("{", "")
    .replaceAll("}", "")
    .replaceAll("(", "")
    .replaceAll(")", "")
    .replaceAll("=", " ")
    .replaceAll("!", "");
  const sqlLogMainUpd = `update \`${prjID}.data_entry.data_entry_log_main\`
  SET status = '${status}'
    , log_ts_stop = cast(FORMAT_TIMESTAMP("%F %T", CURRENT_TIMESTAMP()) as timestamp)
    , description = description || case when description is not null then CHR(10) else '' end || '${message}'
  WHERE (log_id = ${logID});`;
  if (verbose == true) {
    console.log(sqlLogMainUpd);
  }
  try {
    const options = {
      query: sqlLogMainUpd,
      location: loc,
    };
    const [result] = await bqCli.query(options);
  } catch (error) {
    console.log("Error: " + error.message);
  }
}

// ----------------------------------------------------------------------------------------------------
// Gets the main entries of the user, each entry in one line. Useage for the show log feature.
export async function get_log_main_entries(bqCli, prjID, loc, userId) {
  const sqlLogMain = `select m.log_id, subsystem || '/' || m.table_name 
  || ' | ' || FORMAT_TIMESTAMP("%F %T", m.log_ts_start) 
  || ' | ' || m.status
  || case when ifnull(d.detailCnt, 0) = 0 then ' (no details)' else '' end 
   as LogMainDesc 
  from \`${prjID}.data_entry.data_entry_log_main\` as m
  left join (select log_id, count(detail_no) as detailCnt
             from \`${prjID}.data_entry.data_entry_log_detail\`
             group by log_Id) as d
    on m.log_id = d.log_id
  where (m.user_account = '${userId}')
  order by m.log_id desc;`;

  if (verbose == true) {
    console.log("Main log entries list requested.");
  }
  const options = {
    query: sqlLogMain,
    location: loc,
  };
  try {
    const [rows] = await bqCli.query(options);
    return rows;
  } catch (error) {
    console.log("Error: " + error.message);
  }
}

// ----------------------------------------------------------------------------------------------------
// Gets the detail log entries of the user for a specified logID
export async function get_log_detail_entries(bqCli, prjID, loc, userId, logID) {
  const sqlLogDetail = `select d.change_type as changeType
    , d.change_values as LogValues
  from \`${prjID}.data_entry.data_entry_log_detail\` as d
  inner join \`${prjID}.data_entry.data_entry_log_main\` as m
    on d.log_id = m.log_id
  where (d.log_id = ${logID})
    and (m.user_account = '${userId}')
  order by detail_no;`;
  if (verbose == true) {
    console.log(`Detail log entries for LogID ${logID} requested.`);
  }
  const options = {
    query: sqlLogDetail,
    location: loc,
  };
  try {
    const [rows] = await bqCli.query(options);
    return rows;
  } catch (error) {
    console.log("Error: " + error.message);
  }
}

// ----------------------------------------------------------------------------------------------------
// Creates log detail entries for all changes by a paramerterized query.
// Until now we don't log the changed data, but only the 'intended' changes.
// This should be ok until in case of errors this will be logged either.
async function log_all_details(bqCli, prjID, loc, logID, changes) {
  const objParam = {};
  try {
    // placeholders come like this for each row:
    // (@log_id0, @detail_no0, @change_type0, @change_values0),
    // (@log_id1, @detail_no1, @change_type1, @change_values1)
    const placeholders = [];
    // The values for the parameters:
    let paramIdx = 0;

    if (changes.deletedRows.length > 0) {
      const arrChg = changes.deletedRows;
      for (let i = 0; i < arrChg.length; i++) {
        // Add placeholders:
        placeholders.push(
          `(@log_id${paramIdx}, @detail_no${paramIdx}, @change_type${paramIdx}, @change_values${paramIdx})`,
        );
        // Add the values of each row to parameters:
        const detailDesc = JSON.stringify(arrChg[i])
          .replaceAll('"', "")
          .replaceAll(",", ", ")
          .replaceAll("{", "")
          .replaceAll("}", "");
        objParam[`log_id${paramIdx}`] = logID;
        objParam[`detail_no${paramIdx}`] = paramIdx;
        objParam[`change_type${paramIdx}`] = "deleted";
        objParam[`change_values${paramIdx}`] = `${detailDesc}`;
        paramIdx++;
      }
    }

    if (changes.insertedRows.length > 0) {
      const arrChg = changes.insertedRows;
      for (let i = 0; i < arrChg.length; i++) {
        // Add placeholders:
        placeholders.push(
          `(@log_id${paramIdx}, @detail_no${paramIdx}, @change_type${paramIdx}, @change_values${paramIdx})`,
        );
        // Add the values of each row to parameters:
        const detailDesc = JSON.stringify(arrChg[i])
          .replaceAll('"', "")
          .replaceAll(",", ", ")
          .replaceAll("{", "")
          .replaceAll("}", "");
        objParam[`log_id${paramIdx}`] = logID;
        objParam[`detail_no${paramIdx}`] = paramIdx;
        objParam[`change_type${paramIdx}`] = "inserted";
        objParam[`change_values${paramIdx}`] = `${detailDesc}`;
        paramIdx++;
      }
    }

    if (changes.updatedRows.length > 0) {
      const arrChg = changes.updatedRows;
      for (let i = 0; i < arrChg.length; i++) {
        // Add placeholders:
        placeholders.push(
          `(@log_id${paramIdx}, @detail_no${paramIdx}, @change_type${paramIdx}, @change_values${paramIdx})`,
        );
        // Add the values of each row to parameters:
        const detailDesc = JSON.stringify(arrChg[i])
          .replaceAll('"', "")
          .replaceAll(",", ", ")
          .replaceAll("{", "")
          .replaceAll("}", "");
        objParam[`log_id${paramIdx}`] = logID;
        objParam[`detail_no${paramIdx}`] = paramIdx;
        objParam[`change_type${paramIdx}`] = "updated";
        objParam[`change_values${paramIdx}`] = `${detailDesc}`;
        paramIdx++;
      }
    }

    // Do not log all details if there are more than (defined in largeDataAmountLimit) changes!
    if (paramIdx < largeDataAmountLimit) {
      const phList = placeholders.join(", ");
      const logSQL = `insert into \`${prjID}.data_entry.data_entry_log_detail\` (log_id, detail_no, change_type, change_values)
        values ${phList} ;`;
      const options = {
        query: logSQL,
        location: loc,
        params: objParam,
      };
      const [result] = await bqCli.query(options);
    } else {
      if (verbose == true) {
        console.log(
          `More than ${largeDataAmountLimit}: no details will be logged.`,
        );
      }
    }
    return true;
  } catch (error) {
    console.log("Error: " + error.message);
    return false;
  }
}

// ----------------------------------------------------------------------------------------------------
// This function expects an object with three arrays: changed, deleted and inserted rows.
// Only call this function, if hasUserTableGrant() was successful!
export async function uploadChanges(
  bqCli,
  prjID,
  loc,
  userId,
  subSys,
  tabName,
  changes,
) {
  const pkColumns = [];
  const nonPkCols = [];
  const sysColumns = [];
  const logSteps = true;
  let kdfList = [];
  let kdfNumberList = [];
  let logDetailsSuccess = false;
  let description = "";
  let logMainID = 0;
  let totalRowCount = 0;
  let logStatus = "Running";

  const pad = function (num) {
    return ("00" + num).slice(-2);
  };
  const d = new Date();
  const logStartTS =
    d.getUTCFullYear() +
    "-" +
    pad(d.getUTCMonth() + 1) +
    "-" +
    pad(d.getUTCDate()) +
    " " +
    pad(d.getUTCHours()) +
    ":" +
    pad(d.getUTCMinutes()) +
    ":" +
    pad(d.getUTCSeconds());

  // With the changes object we get three kindes column/value lists for delete, insert und update:
  const delValues = changes.deletedRows;
  const insValues = changes.insertedRows;
  const updValues = changes.updatedRows;
  bqCli.projectId = prjID;

  if (delValues.length > 0 || insValues.length > 0 || updValues.length > 0) {
    description = `This will do ${delValues.length} deletes, ${insValues.length} inserts and ${updValues.length} updates...`;
    logMainID = await create_log_main_entry(
      bqCli,
      prjID,
      loc,
      userId,
      subSys,
      tabName,
      description,
      logStartTS,
    );
    if (verbose == true) {
      console.log("This LogID =", logMainID, "Started at: ", logStartTS);
    }
  } else {
    description = "There is nothing to do!";
    if (verbose == true) {
      console.log(description);
    }
  }

  // get table dataset and schema:
  const datasetName = await getBQDatasetFromSubsystem(
    bqCli,
    prjID,
    loc,
    subSys,
    tabName,
  );
  if (verbose == true) {
    console.log(
      `uploadChanges(): table ${subSys}/${tabName} resides here: ${prjID}.${datasetName}`,
    );
  }
  const schema = await getTableSchemaFull(
    bqCli,
    prjID,
    loc,
    userId,
    subSys,
    tabName,
    true,
  );
  const tableColumns = schema.map((row) => row.fieldName);
  // let ar5 = arr.map(function(row){ if(row.value != ''){return row.value;} else {return 'unknown';}});

  // some local helper functions:
  function getColumnGenericType(columnName) {
    for (const objcol of schema) {
      if (objcol.fieldName == columnName) {
        return objcol.genericType;
      }
    }
  }

  function getColumnParameterType(columnName) {
    for (const objcol of schema) {
      if (objcol.fieldName == columnName) {
        return objcol.paramType;
      }
    }
  }

  function isColumnBackendGenerated(columnName) {
    for (const objcol of schema) {
      if (objcol.fieldName == columnName) {
        return objcol.backendGenerated;
      }
    }
  }

  function isColumnSystemCol(columnName) {
    for (const objcol of schema) {
      if (objcol.fieldName == columnName) {
        return objcol.systemColumn;
      }
    }
  }

  // If there is a KDF column inside the table, add a filter of the granted KDF numbers to the select.
  if (tableColumns.find((element) => element.toUpperCase() == "KDF")) {
    kdfList = await getUserKdfList(bqCli, prjID, loc, userId);
    function checkString(element, index) {
      return element.kdf;
    }
    kdfNumberList = kdfList.map(checkString);
    if (verbose == true) {
      console.log(
        "The table contains a KDF column, granted KDFs are:",
        kdfNumberList,
      );
    }
  }

  // Create lists of all primary key / system / non PK columns:
  for (const objcol of schema) {
    if (objcol.primaryKey == true) {
      pkColumns.push(objcol.fieldName);
    } else if (objcol.systemColumn == true) {
      sysColumns.push(objcol.fieldName);
    } else if (objcol.primaryKey == false && objcol.systemColumn == false) {
      nonPkCols.push(objcol.fieldName);
    }
  }

  // All changes will be processed in this order: deletes, inserts and then updates.

  // --------------------------------------------------
  // 1. Delete:
  // This needs a list of all primary key column names and the corresponding values.
  let rowCntDel = 0;
  if (delValues.length > 0) {
    const placeholdersDel = delValues
      .map(
        (_, index) =>
          `(${pkColumns
            .map((column) => `(${column} = @${column}${index})`)
            .join(" AND ")})`,
      )
      .join(" OR ");

    // build the statement with parameters:
    const sDelSQL = `DELETE FROM \`${prjID}.${datasetName}.${tabName}\` WHERE (${placeholdersDel});`;

    // prepare the query (sDelSQL) parameters based on the placeholdersDel
    const arrDelParam = [];
    try {
      const parametersDel = delValues.reduce((accumulator, row, index) => {
        pkColumns.forEach((column) => {
          const genType = getColumnGenericType(column);
          if (genType == "numberInt") {
            const colVal = parseInt(row[column]);
            accumulator[`${column}${index}`] = colVal;
          } else if (genType == "numberFloat") {
            const colVal = parseFloat(row[column]);
            accumulator[`${column}${index}`] = colVal;
          } else {
            accumulator[`${column}${index}`] = row[column];
          }
        });
        arrDelParam.push(row);
        rowCntDel += 1;
        return accumulator;
      }, {});
      const options = {
        query: sDelSQL,
        location: loc,
        params: parametersDel,
      };
      const [result] = await bqCli.query(options);
      totalRowCount += rowCntDel;

      if (logSteps == true) {
        // Edit the main log entry after the delete step:
        description = rowCntDel + " deletes done.";
        logStatus = "Running";
        await edit_log_main_entry(
          bqCli,
          prjID,
          loc,
          logMainID,
          logStatus,
          description,
        );
      }
    } catch (error) {
      const errorMessage = `The following error occurred at delete: ${error}`;
      description = errorMessage;
      logStatus = "Error";
      if (verbose == true) {
        console.log(description);
      }
      await edit_log_main_entry(
        bqCli,
        prjID,
        loc,
        logMainID,
        logStatus,
        description,
      );
      throw new BqDeleteError(errorMessage, 500);
    }
  }

  // --------------------------------------------------
  // 2. Insert:
  // This needs a needs a list of all Columns and a list containg all values.
  // For that purpose a prepared statement will be used.
  const rowCntIns = insValues.length;
  if (insValues.length > 0) {
    if (verbose == true) {
      console.dir(insValues);
    }
    try {
      // Do we have system columns in this table schema?
      // If so, the sysColumns are not included in the insValues array sent from the frontend and thus need to be added:
      let datNow = new Date();
      if (sysColumns.length > 0) {
        // format the timestamp for insertion at bq:
        datNow =
          datNow.toISOString().split("T")[0] +
          " " +
          datNow.toTimeString().split(" ")[0];
        for (const objcol of schema) {
          if (objcol.systemColumn == true) {
            const sColName = objcol.fieldName;
            let sysColVal = "";
            if (
              sColName == "sys_timestamp" &&
              objcol.genericType == "dateTime"
            ) {
              sysColVal = `${datNow}`;
            } else if (
              sColName == "sys_user" &&
              objcol.genericType == "string" &&
              objcol.defaultValue == "userId"
            ) {
              sysColVal = `${userId}`;
            }
            if (verbose == true) {
              console.log("Added Property:", sColName, ": ", sysColVal);
            }
            let rowCounter = 0;
            for (let arrRow = 0; arrRow < insValues.length; arrRow++) {
              // create a new system column property with the corresponding value and add it to the change:
              insValues[arrRow][sColName] = sysColVal;
              rowCounter++;
            }
          }
        }
      }

      if (rowCntIns <= largeDataAmountLimit) {
        // placeholdersIns is a string of this kind, numbers starting at 0:
        // '(@kennzahl0, @Jan0, @Feb0, @Mar0, @Apr0, @May0, @Jun0, @Jul0, @Aug0, @Sep0, @Oct0, @Nov0, @Dec0)
        // nonBeDataCols contains all columns which are not backendGenerated:
        const nonBeDataCols = tableColumns.filter(function (column) {
          {
            return !isColumnBackendGenerated(column);
          }
        });
        const placeholdersIns = insValues
          .map(
            (_, index) =>
              `(${nonBeDataCols
                .map((column) => `@${column}${index}`)
                .join(", ")})`,
          )
          .join(", ");
        // build the statement with parameters:
        const sInsSQL = `INSERT INTO \`${prjID}.${datasetName}.${tabName}\` (${nonBeDataCols.join(
          ", ",
        )}) VALUES ${placeholdersIns};`;
        // create an object containing all columns and their types:
        const arrRowTypes = [];
        const arrInsTypes = insValues.reduce((accumulator, row, index) => {
          nonBeDataCols.forEach((column) => {
            let paramType = getColumnParameterType(column);
            if (paramType.indexOf("NUMERIC") > -1) {
              paramType = "NUMERIC";
            } else if (paramType.indexOf("STRING") > -1) {
              paramType = "STRING";
            } else if (paramType.indexOf("DATETIME") > -1) {
              paramType = "DATETIME";
            } else if (paramType.indexOf("TIMESTAMP") > -1) {
              paramType = "TIMESTAMP";
            }
            accumulator[`${column}${index}`] = paramType;
          });
          arrRowTypes.push(row);
          return accumulator;
        }, {});

        // prepare the query (sInsSQL) parameters based on the placeholdersIns
        const arrInsParam = [];
        const paramIns = insValues.reduce((accumulator, row, index) => {
          nonBeDataCols.forEach((column) => {
            const genType = getColumnGenericType(column);
            if (genType.toUpperCase() == "DATE") {
              const colVal = { value: row[column] };
              accumulator[`${column}${index}`] = colVal;
            } else if (genType.toUpperCase() == "DATETIME") {
              const colVal = { value: row[column] };
              accumulator[`${column}${index}`] = colVal;
            } else if (genType.toUpperCase() == "TIMESTAMP") {
              const colVal = { value: row[column] };
              accumulator[`${column}${index}`] = colVal;
            } else if (genType.toUpperCase() == "NUMBERINT") {
              const colVal = parseInt(row[column]);
              accumulator[`${column}${index}`] = colVal;
            } else if (genType.toUpperCase() == "NUMBERFLOAT") {
              const colVal = row[column];
              accumulator[`${column}${index}`] = colVal;
            } else if (genType.toUpperCase() == "STRING") {
              const colVal = row[column];
              accumulator[`${column}${index}`] = colVal;
            } else {
              const colVal = row[column];
              accumulator[`${column}${index}`] = colVal;
            }
          });
          arrInsParam.push(row);
          return accumulator;
        }, {});
        if (verbose == true) {
          console.log(sInsSQL);
          console.log("paramIns:", paramIns);
          console.log("types:", arrInsTypes);
        }
        const options = {
          query: sInsSQL,
          location: loc,
          useLegacySql: false,
          params: paramIns,
          types: arrInsTypes,
        };
        await bqCli.query(options);
        description = "Insert: details will be logged.";
      } else {
        // Insert data via stream:
        await bqCli.dataset(datasetName).table(tabName).insert(insValues);
        description = `More than ${largeDataAmountLimit} inserts, no details will be logged.`;
      }
      totalRowCount += rowCntIns;

      if (logSteps == true) {
        // Edit the main log entry after the insert step:
        description += " " + rowCntIns + " inserts done.";
        logStatus = "Running";
        await edit_log_main_entry(
          bqCli,
          prjID,
          loc,
          logMainID,
          logStatus,
          description,
        );
      }
    } catch (error) {
      const errorMessage = `The following error occurred at insert: ${error}`;
      logStatus = "Error";
      description = errorMessage;
      console.log(logStatus, description);
      await edit_log_main_entry(
        bqCli,
        prjID,
        loc,
        logMainID,
        logStatus,
        description,
      );
      throw new BqInsertError(errorMessage, 500);
    }
  }

  // --------------------------------------------------
  // 3. Update:
  // Needs a list of all PK-Columns as where clause and a list of the columns and values that changed:
  const arrUpdSQL = [];
  let rowCntUpd = 0;
  if (updValues.length > 0) {
    // Multiple updates cannot be done by prepared statement, thus we have to build multiple upd statements:
    for (let i = 0; i < updValues.length; i++) {
      let sUpdSQL = "";
      let sPkVals = "";
      let sNonPkVals = "";
      for (const objcol of schema) {
        if (objcol.backendGenerated == false) {
          if (objcol.primaryKey == true) {
            // sPkVals are put together for the where clause:
            if (sPkVals != "") {
              sPkVals += " AND ";
            }
            if (objcol.genericType.toUpperCase() == "DATE") {
              sPkVals +=
                "(" +
                objcol.fieldName +
                ` = '${updValues[i][objcol.fieldName]}')`;
            } else if (objcol.genericType.toUpperCase() == "DATETIME") {
              sPkVals +=
                "(" +
                objcol.fieldName +
                ` = '${updValues[i][objcol.fieldName]}')`;
            } else if (objcol.genericType.toUpperCase() == "STRING") {
              sPkVals +=
                "(" +
                objcol.fieldName +
                ` = '${updValues[i][objcol.fieldName]}')`;
            } else if (objcol.genericType.toUpperCase() == "NUMBERFLOAT") {
              sPkVals +=
                "(" +
                objcol.fieldName +
                ` = ${updValues[i][objcol.fieldName]})`;
            } else if (objcol.genericType.toUpperCase() == "NUMBERINT") {
              sPkVals +=
                "(" +
                objcol.fieldName +
                ` = ${updValues[i][objcol.fieldName]})`;
            } else {
              sPkVals +=
                "(" +
                objcol.fieldName +
                ` = ${updValues[i][objcol.fieldName]})`;
            }
          } else if (
            objcol.primaryKey == false &&
            objcol.systemColumn == false
          ) {
            // sNonPkVals contain the fieldnames and values for the set clause (null values are not yet handeled):
            if (sNonPkVals != "") {
              sNonPkVals += ", ";
            }
            if (`${updValues[i][objcol.fieldName]}` == "") {
              // Null-value:
              sNonPkVals += "" + objcol.fieldName + " = null ";
            } else {
              if (objcol.genericType.toUpperCase() == "DATE") {
                sNonPkVals +=
                  "" +
                  objcol.fieldName +
                  ` = '${updValues[i][objcol.fieldName]}'`;
              } else if (objcol.genericType.toUpperCase() == "DATETIME") {
                sNonPkVals +=
                  "" +
                  objcol.fieldName +
                  ` = '${updValues[i][objcol.fieldName]}'`;
              } else if (objcol.genericType.toUpperCase() == "STRING") {
                sNonPkVals +=
                  "" +
                  objcol.fieldName +
                  ` = '${updValues[i][objcol.fieldName]}'`;
              } else if (objcol.genericType.toUpperCase() == "NUMBERFLOAT") {
                sNonPkVals +=
                  "" +
                  objcol.fieldName +
                  ` = ${updValues[i][objcol.fieldName]}`;
              } else if (objcol.genericType.toUpperCase() == "NUMBERINT") {
                sNonPkVals +=
                  "" +
                  objcol.fieldName +
                  ` = ${updValues[i][objcol.fieldName]}`;
              } else {
                sNonPkVals +=
                  "" +
                  objcol.fieldName +
                  ` = ${updValues[i][objcol.fieldName]}`;
              }
            }
          }
        }
      }

      // Build the update statement for this row:
      sUpdSQL = `UPDATE  ${prjID}.${datasetName}.${tabName} `;
      sUpdSQL += `SET ${sNonPkVals} `;
      sUpdSQL += `WHERE(${sPkVals}) `;
      // User-KDF-grants:
      if (kdfNumberList.length > 0) {
        sUpdSQL += `AND (KDF IN(${kdfNumberList}))`;
      }
      sUpdSQL += ";";
      arrUpdSQL.push(sUpdSQL);
    }

    try {
      let sUpdSQL = "";
      for (let j = 0; j < arrUpdSQL.length; j++) {
        sUpdSQL = arrUpdSQL[j];
        const options = {
          query: sUpdSQL,
          location: loc,
        };
        const [result] = await bqCli.query(options);
        rowCntUpd += 1;
      }
      totalRowCount += rowCntUpd;

      if (logSteps == true) {
        // Edit the main log entry after the update step:
        logStatus = "Running";
        description = rowCntUpd + " updates done.";
        await edit_log_main_entry(
          bqCli,
          prjID,
          loc,
          logMainID,
          logStatus,
          description,
        );
      }
    } catch (error) {
      const errorMessage = `The following error occurred at update: ${error}`;
      logStatus = "Error";
      description = errorMessage;
      console.log(logStatus, description);
      await edit_log_main_entry(
        bqCli,
        prjID,
        loc,
        logMainID,
        logStatus,
        description,
      );
      throw new BqUpdateError(errorMessage, 500);
    }
  }

  // Log all changes after those have been successfully processed (if there are less than <largeDataAmountLimit> changes):
  if (totalRowCount <= largeDataAmountLimit) {
    // logDetailsSuccess = await log_all_details(bqCli, prjID, loc, logMainID, changes);
    // Remove system- and backend generated Columns before logging the details:
    insValues.forEach((object) => {
      for (const prop in object) {
        if (object.hasOwnProperty(prop)) {
          if (
            isColumnSystemCol(prop) == true ||
            isColumnBackendGenerated(prop) == true
          ) {
            // console.log(`Insert, Entsorge: ${prop}`);
            delete object[prop];
          }
        }
      }
    });
    // Remove system- and backend generated Columns before logging the details:
    updValues.forEach((object) => {
      for (const prop in object) {
        if (object.hasOwnProperty(prop)) {
          if (
            isColumnSystemCol(prop) == true ||
            isColumnBackendGenerated(prop) == true
          ) {
            // console.log(`Update, Entsorge: ${prop}`);
            delete object[prop];
          }
        }
      }
    });

    logDetailsSuccess = await log_all_details(
      bqCli,
      prjID,
      loc,
      logMainID,
      changes,
    );
  } else {
    logDetailsSuccess = true;
    description = `More than ${largeDataAmountLimit} changes: no details will be logged.`;
    if (verbose == true) {
      console.log(description);
    }
  }

  if (logDetailsSuccess == true) {
    logStatus = "Success";
    description += `Finished successfull: ${rowCntDel} deletes, ${rowCntIns} inserts and ${rowCntUpd} updates.`;
  } else {
    logStatus = "Error";
    description += "Error at logging details orrcurred.";
  }

  // ... and now finalize the main log entry:
  await edit_log_main_entry(
    bqCli,
    prjID,
    loc,
    logMainID,
    logStatus,
    description,
  );
  console.log(logStatus, description);
  return totalRowCount;
}
