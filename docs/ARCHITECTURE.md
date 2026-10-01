# LibreM Architecture Specification

This document details the system design, process lifecycle, database mechanics, and desktop orchestration model of LibreM.

---

## 1. System Topology

LibreM operates under a hybrid architecture designed to deliver the responsiveness of a native desktop application while maintaining the multi-client network capabilities of an enterprise client-server system.

```
+-------------------------------------------------------------------------+
|                           Host Workstation                              |
|                                                                         |
|  +---------------------------+        +------------------------------+  |
|  |    Edge/Chrome Window     |        |      LAN Client Browsers     |  |
|  |   (--app mode, isolated)  |        |     (OPAC & Member Access)   |  |
|  +---------------------------+        +------------------------------+  |
|                |                                      |                 |
|                v                                      v                 |
|  +-------------------------------------------------------------------+  |
|  |                 LibreM.exe (Go Core Process)                      |  |
|  |                                                                   |  |
|  |   - HTTP Server (Fiber v2): Port 8080 (0.0.0.0 Dual-Stack)        |  |
|  |   - Embedded SPA File System (go:embed React Dist)                |  |
|  |   - JWT Authentication & RBAC Middleware                          |  |
|  |   - Machine Fingerprinting & Licensing Engine                     |  |
|  |   - Desktop Window Supervisor (Win32 API)                         |  |
|  +-------------------------------------------------------------------+  |
|                                |                                        |
|                                v                                        |
|  +-------------------------------------------------------------------+  |
|  |                Supervised PostgreSQL 15 Child Process             |  |
|  |                                                                   |  |
|  |   - Portable Binary Distribution (pgsql/bin/postgres.exe)         |  |
|  |   - Local Loopback Binding: 127.0.0.1:5432                        |  |
|  |   - Auto Data Directory Resolution (%LOCALAPPDATA% / ./pgdata)    |  |
|  |   - Write-Ahead Logging (WAL) & ACID Isolation                    |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Desktop Mode vs. Headless LAN Server

LibreM binary supports two operational modes controlled via flags:

### A. Desktop Mode (Default: `LibreM.exe`)
1. **Portable Process Initialization**: The supervisor checks if PostgreSQL is active on port `5432`. If inactive, it verifies cluster initialization and starts `postgres.exe` in background without console window (`CREATE_NO_WINDOW`).
2. **Schema & Migration Verification**: Automatically executes embedded DDL and seed migrations (`pkg/database/auto_migrate.go`) before accepting requests.
3. **Fiber Server Startup**: Starts HTTP engine on `0.0.0.0:8080`.
4. **Health Check Polling**: Actively probes `http://127.0.0.1:8080/api/v1/health` until HTTP 200 is confirmed.
5. **Window Spawn**: Launches Microsoft Edge or Google Chrome using `--app=http://127.0.0.1:8080` with a dedicated profile directory (`--user-data-dir=%LOCALAPPDATA%\LibreM\browser_profile`). This prevents interference with user browsing sessions and isolates session storage.
6. **Graceful Teardown**: Upon window closure or TitleBar exit trigger, Fiber cleanly closes connection pools and commands PostgreSQL to terminate via `pg_ctl stop -m fast`.

### B. Headless LAN Mode (`LibreM.exe --server`)
- Omits desktop window spawning.
- Listens on `0.0.0.0:8080` indefinitely.
- Designed for dedicated library server computers, enabling concurrent access across school network workstations and mobile OPAC terminals.

---

## 3. Database Layer & Reliability Guarantees

### Embedded Engine
- **Binary Footprint**: Minimalist PostgreSQL 15 engine stripped of unnecessary developer docs and debug symbols.
- **Data Persistence**: Stored in `./pgdata` for portable runs, with automatic failover to `%LOCALAPPDATA%\LibreM\pgdata` when running from write-protected directories (such as `C:\Program Files\LibreM`).
- **Connection Pooling**: Managed via `jackc/pgxpool` with configured min/max pool limits, idle timeouts, and connection recycling.

### Auto-Migration
Embedded schema SQL (`000001_init_schema.up.sql`) and master reference seed (`000002_seed_data.up.sql`) compile directly into the Go binary. On startup, LibreM validates table existence and performs zero-downtime execution if initializing fresh instances.

---

## 4. Frontend Architecture

- **Technology Stack**: React 18, TypeScript, Tailwind CSS, Lucide React, and Radix UI primitives.
- **Single-Page Application (SPA)**: Packaged into Go static binary using `go:embed frontend/dist/*`.
- **Frameless Window Chrome**: `TitleBar.tsx` integrates directly with backend Win32 endpoints (`/api/v1/window/minimize`, `/maximize`, `/close`), emulating native desktop application window behavior.
- **Context Isolation**: Text selection and browser right-click context menus are suppressed globally to prevent accidental navigation away from the application workspace.
