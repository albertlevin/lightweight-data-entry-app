#!/bin/bash
# Has to be run in the vue-frontend directory so Cloud Build can find the Dockerfile.
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
gcloud config set project "$PROJECT_ID"

gcloud builds submit --tag "europe-west3-docker.pkg.dev/$PROJECT_ID/vue-frontend/vue-frontend:v1"
