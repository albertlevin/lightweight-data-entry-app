import {
  existsTableInSubsystem,
  getTableContent,
  getSubsystemList,
  getSubsystemTableList,
  getUserKdfList,
  getTableSchemaFull,
  getLargeDataAmountLimit,
  hasUserTableGrant,
  uploadChanges,
  get_log_main_entries,
  get_log_detail_entries
} from './construct_query.js'

import { BigQuery } from '@google-cloud/bigquery'
import { GoogleAuth } from 'google-auth-library'
import path from 'path'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import {
  DB_SYS_USER,
  DB_LOCATION,
  DEFAULT_PROJECT_ID,
  CLIENT_URL
} from './global_vars.js'
import fs from 'fs'
import { error } from 'console'

const app = express()

// Only these origins may call the API from a browser.
const allowedOrigins = [
  CLIENT_URL, // Frontend for local development
  process.env.FRONTEND_URL // Deployed frontend URL
].filter(Boolean)

// CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin

  // Check if the origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  // Always allow specific headers and methods
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Allow cookies or credentials (if needed)
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(204) // No Content
  } else {
    next() // Pass control to the next middleware or route handler
  }
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// the port where the back-end is listening on
const PORT = 8080 // 8080 is the app engine requirement

// global settings
const loc = DB_LOCATION

let prjID = DEFAULT_PROJECT_ID
if (prjID == undefined) {
  prjID = DEFAULT_PROJECT_ID
  console.log('No quota_project_id found, using default:', prjID)
}

// create a gcloud client:
// const auth = new GoogleAuth({
//   scopes: ['https://www.googleapis.com/auth/cloud-platform']
// });

// until now:
const bqCli = new BigQuery({ projectId: prjID })
// with auth and project-ID:
// const client = await auth.getIdTokenClient(DB_SYS_USER);
// const bqCli = new BigQuery({ auth: client, projectId: prjID });
bqCli.projectId = prjID
bqCli.userId = DB_SYS_USER

// ----------------------------------------------------------------------------------------------------
// Get the limit value for a large data Amount:
app.get('/api/large-data-amount-limit', async (req, res) => {
  try {
    const largeDataAmLim = await getLargeDataAmountLimit()
    res.json(largeDataAmLim)
  } catch (error) {
    res.status(500).json({ error: `Internal server error: ${error}` })
  }
})

// ----------------------------------------------------------------------------------------------------
// List all subsystems defined in the data entry meta tables
app.get('/api/list-subsystems', async (req, res) => {
  try {
    const subsystems = await getSubsystemList(bqCli, prjID, loc)
    function checkString (element, index) {
      return element.subsystem
    }
    const subsystemList = subsystems.map(checkString)
    res.json(subsystemList)
  } catch (error) {
    res.status(500).json({ error: `Internal server error: ${error}` })
  }
})

// ----------------------------------------------------------------------------------------------------
// Get a list of all KDF (tenants) which the user is allowed to see data of.
app.get('/api/list-granted-kdf', async (req, res) => {
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  try {
    if (userId.length > 0) {
      const kdfList = await getUserKdfList(bqCli, prjID, loc, userId)
      function checkString (element, index) {
        return element.kdf
      }
      const kdfNumberList = kdfList.map(checkString)
      console.log(`KDFs granted to '${userId}': ` + kdfNumberList)
      res.json(kdfNumberList)
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    res.status(500).json({ error: `Internal server error: ${error}` })
  }
})

// ----------------------------------------------------------------------------------------------------
// List all tables of a given subsystem as define in the data_entry metadata
app.get('/api/list-subsystem-tables/:subSystem', async (req, res) => {
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  try {
    if (userId.length > 0) {
      const subSystem = req.params.subSystem.toUpperCase()
      const tables = await getSubsystemTableList(
        bqCli,
        prjID,
        loc,
        userId,
        subSystem
      )
      function checkString (element, index) {
        return element.table_name
      }
      const tableList = tables.map(checkString)
      res.json(tableList)
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    res.status(500).json({ error: `Internal server error: ${error}` })
  }
})

// ----------------------------------------------------------------------------------------------------
// get table schema, including primary keys
app.get('/api/table-metadata-full/:subSystem/:tableName', async (req, res) => {
  const subSystem = req.params.subSystem.toUpperCase()
  const tableName = req.params.tableName
  console.log(`Requested metadata for '${subSystem}/${tableName}'`)
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  try {
    if (userId.length > 0) {
      const tabExists = await existsTableInSubsystem(
        bqCli,
        prjID,
        loc,
        subSystem,
        tableName
      )
      if (tabExists == true) {
        const ysnUsrGrt2Tab = await hasUserTableGrant(
          bqCli,
          prjID,
          loc,
          userId,
          subSystem,
          tableName
        )
        if (ysnUsrGrt2Tab == true) {
          const renamedRows = await getTableSchemaFull(
            bqCli,
            prjID,
            loc,
            userId,
            subSystem,
            tableName,
            false
          )
          if (renamedRows.length > 0) {
            res.json(renamedRows)
          } else {
            res.status(500).json({
              error: `Table '${tableName}' does not exist in subsystem '${subSystem}'.`
            })
          }
        } else {
          res.status(500).json({
            error: `Table '${subSystem}/${tableName}' is not granted to the user.`
          })
        }
      } else {
        res.status(500).json({
          error: `Table '${tableName}' does not exist in subsystem '${subSystem}'.`
        })
      }
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    if (error.message.indexOf('was not found in') > 0) {
      res.status(500).json({
        error: `Table '${tableName}' does not exist in subsystem '${subSystem}'.`
      })
    } else {
      res.status(500).json({ error: `Internal server error: ${error}` })
    }
  }
})

// ----------------------------------------------------------------------------------------------------
// Download content of the data entry table:
app.get('/api/table-content/:subSystem/:tableName', async (req, res) => {
  const subSystem = req.params.subSystem.toUpperCase()
  const tableName = req.params.tableName
  console.log(`Requested content data of '${subSystem}/${tableName}'`)
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  try {
    if (userId.length > 0) {
      const tabExists = await existsTableInSubsystem(
        bqCli,
        prjID,
        loc,
        subSystem,
        tableName
      )
      if (tabExists == true) {
        const ysnUsrGrt2Tab = await hasUserTableGrant(
          bqCli,
          prjID,
          loc,
          userId,
          subSystem,
          tableName
        )
        if (ysnUsrGrt2Tab == true) {
          console.log(
            `Table ${subSystem}/ ${tableName} is granted to '${userId}'`
          )
          const rows = await getTableContent(
            bqCli,
            prjID,
            loc,
            userId,
            subSystem,
            tableName
          )
          res.json(rows)
        } else {
          res.status(500).json({
            error: `Table ${subSystem}/${tableName} is not granted to the user.`
          })
        }
      } else {
        res.status(500).json({
          error: `Table '${tableName}' does not exist in subsystem '${subSystem}'.`
        })
      }
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    if (error.message.indexOf('was not found in') > 0) {
      res.status(500).json({ error: `No table '${tableName}/${subSystem}'` })
    } else {
      res.status(500).json({ error: `Internal server error: ${error}` })
    }
  }
})

// ----------------------------------------------------------------------------------------------------
// Delivers a list of log main entries, ordered by log_id desc.
app.get('/api/list-log-main/', async (req, res) => {
  console.log('Requested list of log main entries.')
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  try {
    if (userId.length > 0) {
      const rows = await get_log_main_entries(bqCli, prjID, loc, userId)
      res.json(rows)
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    console.log(`${error.name}: ${error._number}: '${error.message}'.`)
    res.status(500).send({ message: `Internal server error: ${error}` })
  }
})

// ----------------------------------------------------------------------------------------------------
// Delivers a list of log detail entries, ordered by detail_no desc.
app.get('/api/list-log-details/:logID', async (req, res) => {
  const log_ID = req.params.logID
  console.log(`Requested log details of logID ${log_ID}.`)
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  try {
    if (userId.length > 0) {
      const rows = await get_log_detail_entries(
        bqCli,
        prjID,
        loc,
        userId,
        log_ID
      )
      res.json(rows)
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    console.log(`${error.name}: ${error._number}: '${error.message}'.`)
    res.status(500).send({ message: `Internal server error: ${error}` })
  }
})

// ----------------------------------------------------------------------------------------------------
// Upload changes from frontend to the backend
app.post('/api/:subSystem/:tableName', async (req, res) => {
  let userId = req.headers.authorization
  if (userId == undefined || userId == '') {
    userId = DB_SYS_USER
    console.log(
      `No authorization found in request, using default user ${userId}`
    )
  }
  const subSystem = req.params.subSystem.toUpperCase()
  const tableName = req.params.tableName
  const changes = req.body
  const rowsDel = changes.deletedRows.length
  const rowsIns = changes.insertedRows.length
  const rowsUpd = changes.updatedRows.length
  try {
    if (userId.length > 0) {
      let resultMessage = 'started...'
      // verify the input to make sure it's a non-empty array of objects
      let description = `Received ${rowsDel} deletes, ${rowsIns} inserts and ${rowsUpd} updates`
      description += ` for table ${subSystem}/${tableName} from user '${userId}'...`
      console.log(description)
      if (
        (!Array.isArray(changes.insertedRows) &&
          !Array.isArray(changes.updatedRows) &&
          !Array.isArray(changes.deletedRows)) ||
        (!rowsIns && !rowsDel && !rowsUpd)
      ) {
        return res.status(400).send({
          message: 'Request body must be a non-empty array of JSON objects.'
        })
      }
      const tabExists = await existsTableInSubsystem(
        bqCli,
        prjID,
        loc,
        subSystem,
        tableName
      )
      if (tabExists == true) {
        const ysnUsrGrt2Tab = await hasUserTableGrant(
          bqCli,
          prjID,
          loc,
          userId,
          subSystem,
          tableName
        )
        if (ysnUsrGrt2Tab == true) {
          console.log(`User is granted to ${subSystem}/${tableName}.`)
          const result = await uploadChanges(
            bqCli,
            prjID,
            loc,
            userId,
            subSystem,
            tableName,
            changes
          )

          const totalExpectedCnt = rowsDel + rowsIns + rowsUpd
          if (result == totalExpectedCnt) {
            resultMessage += `done. Successfully proceeded ${rowsDel} deletes, ${rowsIns} inserts and ${rowsUpd} updates.`
          } else {
            resultMessage += `failed: ${result} rows proceeded, expected were: ${totalExpectedCnt} rows.`
          }
          console.log(resultMessage)
          res.status(200).send({ message: resultMessage })
        } else {
          res.status(500).json({
            error: `Table '${subSystem}/${tableName}' is not granted to the user.`
          })
        }
      } else {
        res.status(500).json({
          error: `Table '${tableName}' does not exist in subsystem '${subSystem}'.`
        })
      }
    } else {
      const retMessage = 'No access without authorization!'
      console.log(retMessage)
      res.json(retMessage)
    }
  } catch (error) {
    console.log(`${error.name}: ${error._number}: '${error.message}'.`)
    res.status(500).send({ message: `Internal server error: ${error}` })
  }
})

// ------------------------------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`)
})
