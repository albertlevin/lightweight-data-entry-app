#!/bin/bash
# Builds the backend image with Cloud Build. Credentials come from `gcloud auth login`
# or GOOGLE_APPLICATION_CREDENTIALS in your shell.
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
gcloud config set project "$PROJECT_ID"

gcloud builds submit --tag "europe-west3-docker.pkg.dev/$PROJECT_ID/express-backend/express-backend:v1"
