variable "project" {
  description = "GCP project ID"
  type        = string
}

variable "credentials_file" {
  description = "Path to a service account key file (kept outside version control)"
  type        = string
}

variable "region" {
  default = "europe-west3"
}

variable "zone" {
  default = "europe-west3-c"
}
