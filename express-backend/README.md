# express-backend

Node.js API for loading editable table metadata and data from BigQuery, validating user edits, and writing changes back with audit logging.

## Main endpoints

- GET /api/large-data-amount-limit
- GET /api/list-subsystems
- GET /api/list-granted-kdf
- GET /api/list-subsystem-tables/:subSystem
- GET /api/table-metadata-full/:subSystem/:tableName
- GET /api/table-content/:subSystem/:tableName
- GET /api/list-log-main
- GET /api/list-log-details/:logID
- POST /api/:subSystem/:tableName

## Local run

1. Install dependencies: npm install
2. Authenticate for BigQuery access:
   - gcloud auth application-default login
3. Set project id (optional):
   - export GCP_PROJECT_ID=your-project-id
4. Start backend:
   - ./start.sh

Server listens on port 8080.

## Deployment helper

Run ./deploy.sh to submit a container build to Artifact Registry. Configure GCP_PROJECT_ID before running.
