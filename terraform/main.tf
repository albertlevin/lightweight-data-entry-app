terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "4.51.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "5.16.0"
    }
  }
}

provider "google" {
  credentials = file(var.credentials_file)
  project     = var.project
  region      = var.region
  zone        = var.zone
}

provider "google-beta" {
  credentials = file(var.credentials_file)
  project     = var.project
  region      = var.region
  zone        = var.zone
}

resource "google_compute_network" "private_network" {
  provider = google-beta
  name     = "private-network"
}

resource "google_compute_global_address" "private_ip_address" {
  provider      = google-beta
  name          = "private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.private_network.id
}

# service networking for VPC peering
resource "google_service_networking_connection" "private_vpc_connection" {
  provider                = google-beta
  network                 = google_compute_network.private_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

resource "google_artifact_registry_repository" "main-repository" {
  location      = var.region
  repository_id = "main-repository"
  description   = "Docker repository"
  format        = "DOCKER"
}

# VPC access connector for backend service
resource "google_vpc_access_connector" "backend_connector" {
  name = "backend-connector"
  network = google_compute_network.private_network.name
  region = var.region
  ip_cidr_range = "10.8.0.0/28"
}

# Firewall Rules for Private Network
resource "google_compute_firewall" "allow_health_checks" {
  name    = "allow-health-checks"
  network = google_compute_network.private_network.id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
}

# resource "google_compute_firewall" "allow_backend_to_bigquery" {
#   name = "allow-backend-to-bigquery"
#   network = google_compute_network.private_network.id
#   allow {
#     protocol = "tcp"
#     ports = ["443"]
#
#   }
#   destination_ranges = ["0.0.0.0/0"]
#
# }
