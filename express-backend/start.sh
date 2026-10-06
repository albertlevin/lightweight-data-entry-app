#!/bin/bash
# Starts the backend locally. Credentials come from `gcloud auth application-default login`
# or GOOGLE_APPLICATION_CREDENTIALS in your shell.
export GCP_PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
gcloud config set project "$GCP_PROJECT_ID"

node server_bq.js
