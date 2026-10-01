-- ============================================================================
-- LIBREM DATABASE SCHEMA (POSTGRESQL 15+)
-- Modernized from SLiMS 9 Bulian Legacy Architecture
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- SYSTEM SETTINGS & AUTHENTICATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    can_read BOOLEAN NOT NULL DEFAULT FALSE,
    can_write BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (role_id, resource)
);

CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    log_type VARCHAR(30) NOT NULL DEFAULT 'STAFF',
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- BIBLIOGRAFI & MASTER KATALOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS mst_gmd (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS mst_publishers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS mst_places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS mst_languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS mst_authors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    authority_type VARCHAR(50) DEFAULT 'personal_name',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mst_topics (
    id BIGSERIAL PRIMARY KEY,
    topic VARCHAR(150) NOT NULL UNIQUE,
    topic_type VARCHAR(50) DEFAULT 'topical'
);

CREATE TABLE IF NOT EXISTS biblios (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    sor VARCHAR(255),
    edition VARCHAR(50),
    isbn_issn VARCHAR(50),
    publisher_id INT REFERENCES mst_publishers(id) ON DELETE SET NULL,
    publish_place_id INT REFERENCES mst_places(id) ON DELETE SET NULL,
    publish_year VARCHAR(20),
    "collation" VARCHAR(100),
    series_title VARCHAR(255),
    call_number VARCHAR(100),
    language_code VARCHAR(10) REFERENCES mst_languages(code) ON DELETE SET NULL,
    classification VARCHAR(50),
    notes TEXT,
    cover_image VARCHAR(500),
    gmd_id INT REFERENCES mst_gmd(id) ON DELETE SET NULL,
    opac_hide BOOLEAN NOT NULL DEFAULT FALSE,
    promoted BOOLEAN NOT NULL DEFAULT FALSE,
    labels JSONB DEFAULT '[]'::jsonb,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS biblio_authors (
    biblio_id BIGINT NOT NULL REFERENCES biblios(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES mst_authors(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1,
    PRIMARY KEY (biblio_id, author_id)
);

CREATE TABLE IF NOT EXISTS biblio_topics (
    biblio_id BIGINT NOT NULL REFERENCES biblios(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES mst_topics(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1,
    PRIMARY KEY (biblio_id, topic_id)
);

CREATE TABLE IF NOT EXISTS biblio_attachments (
    id BIGSERIAL PRIMARY KEY,
    biblio_id BIGINT NOT NULL REFERENCES biblios(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    access_type VARCHAR(20) NOT NULL DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ITEM / EKSEMPLAR
-- ============================================================================
CREATE TABLE IF NOT EXISTS mst_locations (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS mst_item_statuses (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    no_loan BOOLEAN NOT NULL DEFAULT FALSE,
    skip_stock_take BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mst_coll_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    biblio_id BIGINT NOT NULL REFERENCES biblios(id) ON DELETE RESTRICT,
    barcode VARCHAR(50) NOT NULL UNIQUE,
    inventory_code VARCHAR(100),
    call_number VARCHAR(100),
    coll_type_id INT REFERENCES mst_coll_types(id) ON DELETE SET NULL,
    location_id VARCHAR(20) REFERENCES mst_locations(id) ON DELETE SET NULL,
    item_status_id VARCHAR(20) REFERENCES mst_item_statuses(id) ON DELETE SET NULL,
    received_date DATE,
    order_no VARCHAR(50),
    price NUMERIC(15,2) DEFAULT 0.00,
    source INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- KEANGGOTAAN / PATRON
-- ============================================================================
CREATE TABLE IF NOT EXISTS mst_member_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    loan_limit INT NOT NULL DEFAULT 3,
    loan_periode_days INT NOT NULL DEFAULT 7,
    reborrow_limit INT NOT NULL DEFAULT 1,
    fine_each_day NUMERIC(15,2) NOT NULL DEFAULT 1000.00,
    grace_periode_days INT NOT NULL DEFAULT 0,
    membership_duration_days INT NOT NULL DEFAULT 365,
    enable_reserve BOOLEAN NOT NULL DEFAULT TRUE,
    reserve_limit INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    gender CHAR(1) CHECK (gender IN ('M', 'F')),
    birth_date DATE,
    member_type_id INT NOT NULL REFERENCES mst_member_types(id) ON DELETE RESTRICT,
    address TEXT,
    email VARCHAR(150),
    phone VARCHAR(30),
    institution VARCHAR(150),
    avatar_url VARCHAR(255),
    password_hash VARCHAR(255),
    register_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expire_date DATE NOT NULL,
    is_pending BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SIRKULASI, DENDA & HARI LIBUR
-- ============================================================================
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    day_name VARCHAR(10),
    specific_date DATE,
    description VARCHAR(255) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mst_loan_rules (
    id SERIAL PRIMARY KEY,
    member_type_id INT NOT NULL REFERENCES mst_member_types(id) ON DELETE CASCADE,
    coll_type_id INT REFERENCES mst_coll_types(id) ON DELETE CASCADE,
    gmd_id INT REFERENCES mst_gmd(id) ON DELETE CASCADE,
    loan_limit INT NOT NULL DEFAULT 3,
    loan_periode_days INT NOT NULL DEFAULT 7,
    reborrow_limit INT NOT NULL DEFAULT 1,
    fine_each_day NUMERIC(15,2) NOT NULL DEFAULT 1000.00,
    grace_periode_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    member_id VARCHAR(50) NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    loan_rules_id INT REFERENCES mst_loan_rules(id) ON DELETE SET NULL,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    actual_return_date DATE,
    renewed_count INT NOT NULL DEFAULT 0,
    is_lent BOOLEAN NOT NULL DEFAULT TRUE,
    is_return BOOLEAN NOT NULL DEFAULT FALSE,
    staff_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fine_ledgers (
    id BIGSERIAL PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    loan_id BIGINT REFERENCES loans(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    debit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    description VARCHAR(255) NOT NULL,
    staff_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    member_id VARCHAR(50) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    reserve_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expire_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitor_logs (
    id BIGSERIAL PRIMARY KEY,
    member_id VARCHAR(50) REFERENCES members(id) ON DELETE SET NULL,
    visitor_name VARCHAR(150) NOT NULL,
    institution VARCHAR(150),
    gender CHAR(1),
    purpose VARCHAR(100),
    checkin_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES UNTUK HIGH-PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_loans_active ON loans (item_id) WHERE is_return = FALSE;
CREATE INDEX IF NOT EXISTS idx_loans_member_active ON loans (member_id) WHERE is_return = FALSE;
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans (due_date) WHERE is_return = FALSE;
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items (barcode);
CREATE INDEX IF NOT EXISTS idx_members_name ON members (full_name);
CREATE INDEX IF NOT EXISTS idx_trgm_biblio_title ON biblios USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trgm_biblio_isbn ON biblios USING gin (isbn_issn gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trgm_author_name ON mst_authors USING gin (name gin_trgm_ops);
