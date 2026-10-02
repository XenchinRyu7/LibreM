# LibreM Test Suite Architecture

This directory houses the end-to-end integration tests, test fixtures, and automated test runners for the LibreM ILS platform.

Following the standard Go project layout conventions, unit tests reside alongside the respective source packages as `*_test.go`, while top-level integration and E2E suites reside in `test/`.

---

## Directory Layout

```text
test/
├── e2e/                     # End-to-End API integration tests
│   └── api_e2e_test.go      # Native Go E2E suite covering complete circulation lifecycle
├── fixtures/                # Canonical test mock payloads & seed records
│   ├── sample_biblio.json   # Sample Indonesian bibliography record
│   └── sample_member.json   # Sample library patron record
├── scripts/                 # Automated cross-platform test runners
│   └── test_e2e.ps1         # 25-point comprehensive regression test runner
└── README.md                # Test documentation (this file)
```

---

## Running Tests

### 1. Unit Tests (Pure Go, Fast)
Run all unit tests across the service and domain packages:

```bash
go test -v ./internal/service/...
```

### 2. End-to-End API Integration Suite (Native Go)
Requires the LibreM application server to be running on `http://127.0.0.1:8080`:

```bash
go test -v ./test/e2e/...
```

### 3. Comprehensive 25-Point Integration Script (PowerShell)
Executes the full automated audit (Auth, Setup, Biblios, Items, Circulation, Overdues, Fines, Visitors, and ACID Deletion constraints):

```powershell
powershell -ExecutionPolicy Bypass -File .\test\scripts\test_e2e.ps1
```
