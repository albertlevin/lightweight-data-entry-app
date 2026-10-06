const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mysql = require('mysql2')

const app = express()

// Middleware
app.use(cors()) // allows cross-origin resource sharing
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// the port where the back-end is listening on
const PORT = 3000

// Database connection configuration (override via environment variables)
const databaseHost = process.env.DB_HOST || 'localhost'
const databaseName = process.env.DB_NAME || 'test_db'
const databaseUser = process.env.DB_USER || 'root'
const databasePassword = process.env.DB_PASSWORD || ''

const db = mysql.createConnection({
  host: databaseHost,
  user: databaseUser,
  password: databasePassword,
  database: databaseName
})

db.connect((err) => {
  if (err) throw err
  console.log(`Connected to database ${databaseName} on host ${databaseHost}.`)
})

// set the database to use
db.query(`USE ${databaseName};`, (err, results) => {
  if (err) throw err
  console.log(`Using database: ${results.stateChanges.schema}`)
})

// get the tables in the database
// how to cache the most commonly accessed tables?
// dbTables is a list ['pl', 'balance']
app.get('/api/list-tables', (req, res) => {
  db.query('SHOW TABLES;', (err, results) => {
    if (err) {
      console.error('Error executing query', err.stack)
      res.status(500).json({ error: 'Internal server error' })
    } else {
      const tablesDB = Object.keys(results[0])
      const dbTables = results.map((item) => item[tablesDB])
      res.json(dbTables)
    }
  })
})

app.get('/api/:tableName/table-metadata', (req, res) => {
  const { tableName } = req.params
  db.query(`DESCRIBE ${tableName};`, (err, results) => {
    if (err) {
      console.error('Error executing query', err.stack)
      res.status(500).json({ error: 'Internal server error' })
    } else {
      res.json(results)
    }
  })
})

app.get('/api/:tableName/data', (req, res) => {
  const { tableName } = req.params
  db.query(`SELECT * FROM ${tableName};`, (err, results) => {
    if (err) {
      console.error('Error executing query', err.stack)
      res.status(500).json({ error: 'Internal server error' })
    } else {
      res.json(results)
    }
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`)
})
