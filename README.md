# LibreM

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64%20%7C%20Linux-lightgrey?style=flat-square)]()
[![License](https://img.shields.io/badge/License-AGPLv3-blue.svg?style=flat-square)](LICENSE)

LibreM is a high-performance, embedded-first Integrated Library System (ILS) engineered as a modern architectural evolution of SLiMS (Senayan Library Management System). 

Designed specifically for educational institutions, schools, and universities, LibreM replaces legacy PHP/Apache/XAMPP stacks with a unified, single-binary Go core, an embedded portable PostgreSQL engine, and a desktop launcher interface built with React and Tailwind CSS.

---

## Architecture Overview

```
+------------------------------------------------------------------------+
|                     LibreM Desktop Runtime                             |
|                                                                        |
|  +---------------------------+       +-------------------------------+ |
|  |     React 18 Frontend     |       |    Frameless Window Wrapper   | |
|  | (Vite + Tailwind + Lucide)| <---> | (Dedicated Chromium Profile)  | |
|  +---------------------------+       +-------------------------------+ |
|                | REST API (HTTP loopback)                              |
|                v                                                       |
|  +-------------------------------------------------------------------+ |
|  |                     Go Core Engine (Fiber v2)                     | |
|  |  * License & Machine Fingerprinting                               | |
|  |  * Circulation Engine & Cataloging (ACID Transactions)            | |
|  |  * Static Asset & SPA Embedding (go:embed)                        | |
|  +-------------------------------------------------------------------+ |
|                | pgx Connection Pool                                   |
|                v                                                       |
|  +-------------------------------------------------------------------+ |
|  |                 Embedded Portable PostgreSQL 15                   | |
|  |  * Automatic silent initdb & process supervision                  | |
|  |  * Zero-config auto-migration and master data seeding              | |
|  +-------------------------------------------------------------------+ |
+------------------------------------------------------------------------+
```

---

## Core Capabilities

- **Single-Binary & Portable Database**: Bundles a dedicated PostgreSQL 15 cluster inside the application tree. Requires no pre-existing database installations or administrative Windows service registrations.
- **Frameless Launcher UI**: Sleek, distraction-free desktop interface modeled after modern desktop software (Epic Games Launcher, Discord) with custom window controls and dark theme aesthetics.
- **Headless LAN Mode**: Can operate as a background server (`--server`) providing full local network access to library OPAC and administrative portals across school computer laboratories.
- **Automated Data Seeding**: Automatically provisions schema definitions, relational indices, DDC master classifications, Indonesian publisher tables, and default administrative credentials on initial startup.
- **Sub-Millisecond Response Latency**: Replaces interpreted scripting overhead with compiled Go Fiber microservices, reducing catalog search and circulation transaction latency to sub-millisecond durations.
- **ACID Transactional Safety**: Zero data corruption risks during sudden power outages or improper workstation shutdowns, backed by PostgreSQL Write-Ahead Logging (WAL).

---

## Downloads & Releases (v1.0.0)

Pre-built binaries, installers, and standalone archives are available directly from the [GitHub Releases v1.0.0](https://github.com/XenchinRyu7/LibreM/releases/tag/v1.0.0) page:

| Operating System | Package Type | Artifact | Download Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Windows x64** | **Setup Installer** | `LibreM_Setup_v1.0.0.exe` | [Download Installer](https://github.com/XenchinRyu7/LibreM/releases/download/v1.0.0/LibreM_Setup_v1.0.0.exe) | Complete offline setup with embedded PostgreSQL portable |
| **Windows x64** | **Standalone Portable** | `LibreM-v1.0.0-windows-amd64.zip` | [Download .zip](https://github.com/XenchinRyu7/LibreM/releases/download/v1.0.0/LibreM-v1.0.0-windows-amd64.zip) | Portable single binary with embedded frontend SPA |
| **Linux x86_64** | **Server / Desktop** | `LibreM-v1.0.0-linux-amd64.tar.gz` | [Download .tar.gz](https://github.com/XenchinRyu7/LibreM/releases/download/v1.0.0/LibreM-v1.0.0-linux-amd64.tar.gz) | Headless server and workstation executable |
| **macOS Apple Silicon** | **ARM64 (M1-M4)** | `LibreM-v1.0.0-darwin-arm64.tar.gz` | [Download .tar.gz](https://github.com/XenchinRyu7/LibreM/releases/download/v1.0.0/LibreM-v1.0.0-darwin-arm64.tar.gz) | Optimized for modern Apple Silicon chips |
| **macOS Intel** | **x86_64** | `LibreM-v1.0.0-darwin-amd64.tar.gz` | [Download .tar.gz](https://github.com/XenchinRyu7/LibreM/releases/download/v1.0.0/LibreM-v1.0.0-darwin-amd64.tar.gz) | For Intel-based Mac hardware |
| **Source Code** | **Archive** | `Source code (zip / tar.gz)` | [Source .zip](https://github.com/XenchinRyu7/LibreM/archive/refs/tags/v1.0.0.zip) · [Source .tar.gz](https://github.com/XenchinRyu7/LibreM/archive/refs/tags/v1.0.0.tar.gz) | Full project source repository |

### SHA-256 Checksums

```text
05362f9ed99ec95bfc289f717a235060b4860581d097fb33eefac90eca89c173  LibreM_Setup_v1.0.0.exe
df9a7dd2edeeb5f2ba310a755fc7e9109664d7c472bdbefce83cc627c8449967  LibreM-v1.0.0-windows-amd64.zip
9bfb378337549217ee0396e5b4fd5852acc39e71c3f67ca72d96d4abb4c79093  LibreM-v1.0.0-linux-amd64.tar.gz
132d2df232d393ce422ce6b84f4258be9f189faec5690064bb2d991d1db8b19c  LibreM-v1.0.0-darwin-arm64.tar.gz
97342fc54ca1e3288afff17fcbe5d7e4b8cb5bf8fb5c438bd1c76b2a844b27c8  LibreM-v1.0.0-darwin-amd64.tar.gz
```

---

## Quick Start

### 1. Windows Desktop Installer (Production)

Download the latest installer from the [Releases](https://github.com/XenchinRyu7/LibreM/releases/tag/v1.0.0) section:

1. Execute `LibreM_Setup_v1.0.0.exe`.
2. Follow the setup wizard to configure:
   - Library / School Name
   - Superadmin Username
   - Superadmin Password
3. Click **Finish**. LibreM initializes the embedded database silently and launches the desktop environment.

Default local endpoints:
- **Administrative Portal**: `http://127.0.0.1:8080/admin`
- **Public Catalog (OPAC)**: `http://127.0.0.1:8080/opac`
- **Visitor Kiosk (Buku Tamu)**: `http://127.0.0.1:8080/visitor`

---

### 2. Development Setup

#### Prerequisites
- Go 1.22 or higher
- Node.js 18+ and npm
- PostgreSQL 15+ (or bundled portable distribution)

#### Clone and Install Dependencies

```bash
git clone https://github.com/XenchinRyu7/LibreM.git
cd LibreM

# Install frontend dependencies
cd frontend
npm install
cd ..

# Download Go module dependencies
go mod download
```

#### Running the Development Server

1. **Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Backend Engine**:
   ```bash
   go run ./cmd/server --server --port=8080
   ```

#### Building Desktop Binary & Installer

```powershell
# Execute the automated PowerShell build pipeline
.\build_installer.ps1
```

The script compiles the production web bundle, builds the Go GUI binary with embedded assets, and generates the self-contained installer at `dist/LibreM_Setup_v1.0.0.exe`.

---

## Configuration Reference

LibreM reads configuration from environment variables or a local `.env` file in the working directory:

| Parameter | Default | Description |
|:---|:---|:---|
| `PORT` | `8080` | HTTP port for the web service and API engine |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host address |
| `DB_PORT` | `5432` | PostgreSQL TCP port |
| `DB_USER` | `postgres` | Database user account |
| `DB_PASSWORD` | `LibremDB92342` | Database authentication password |
| `DB_NAME` | `librem_db` | Primary database name |
| `DB_SSLMODE` | `disable` | SSL connection mode |
| `JWT_SECRET` | *randomized* | Secret key for signing authentication tokens |
| `STORAGE_PATH` | `./uploads` | Directory for uploaded covers and member photos |
| `SCHOOL_NAME` | `Perpustakaan Sekolah` | Institutional title displayed on headers & OPAC |
| `ADMIN_INITIAL_USERNAME` | `admin` | Initial superadministrator username |
| `ADMIN_INITIAL_PASSWORD` | `admin123` | Initial superadministrator password |

---

## Project Structure

```
LibreM/
├── build/                 # Packaging configurations & NSIS installer scripts
│   └── installer/         # NSIS script definitions and assets
├── cmd/
│   └── server/            # Application entrypoint & desktop process orchestrator
├── config/                # Environment configuration loader & DB connection pools
├── frontend/              # Modern React 18 single-page application
│   ├── src/
│   │   ├── components/    # Reusable UI widgets & frameless window chrome
│   │   ├── pages/         # OPAC, circulation desk, inventory, and auth views
│   │   └── services/      # Axios API client integrations
├── internal/
│   ├── domain/            # Core business models & contract definitions
│   ├── handler/           # Fiber HTTP handlers & JSON serializers
│   ├── middleware/        # JWT auth, CORS, and logging interceptors
│   ├── repository/        # PostgreSQL SQL repository queries & migrations
│   └── service/           # Business logic & domain workflows
├── pkg/
│   └── database/          # Portable PostgreSQL supervisor & auto-migrator
├── tools/                 # Build utilities (makensis binary)
└── build_installer.ps1    # Automated one-step compilation script
```

---

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - In-depth breakdown of process orchestration, database supervision, and security boundaries.
- [Contributing Guidelines](CONTRIBUTING.md) - Contribution workflows, coding conventions, and pull request procedures.
- [Security Policy](SECURITY.md) - Vulnerability disclosure process and supported versions.
- [Sponsorship & Support](SPONSORS.md) - How to support ongoing development and community maintenance.

---

## License

LibreM is open-source software licensed under the [GNU Affero General Public License v3.0 (AGPLv3)](LICENSE).
Modernized with respect to the pioneering contributions of the Senayan Developers Community (SDC).
