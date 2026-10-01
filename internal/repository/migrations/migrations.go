package migrations

import _ "embed"

//go:embed 000001_init_schema.up.sql
var SchemaSQL string

//go:embed 000002_seed_data.up.sql
var SeedSQL string
