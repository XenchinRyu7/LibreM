-- ============================================================================
-- SEED MASTER DATA FOR LIBREM
-- Standard Indonesian School / University Library Catalog & Reference Data
-- ============================================================================

-- Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'SUPERADMIN', 'Administrator Sistem Tertinggi'),
(2, 'LIBRARIAN', 'Pustakawan Pelaksana Layanan')
ON CONFLICT (id) DO NOTHING;

-- Default Member Types
INSERT INTO mst_member_types (id, name, loan_limit, loan_periode_days, reborrow_limit, fine_each_day, grace_periode_days, membership_duration_days) VALUES
(1, 'Siswa Reguler', 3, 7, 1, 1000.00, 0, 365),
(2, 'Guru & Tenaga Pendidik', 10, 30, 2, 0.00, 3, 730),
(3, 'Staf Karyawan', 5, 14, 1, 500.00, 1, 365),
(4, 'Anggota Khusus/Umum', 2, 7, 0, 1500.00, 0, 180)
ON CONFLICT (id) DO NOTHING;

-- GMD (General Material Designation)
INSERT INTO mst_gmd (id, code, name) VALUES
(1, 'TXT', 'Buku Teks / Cetak'),
(2, 'ER', 'Electronic Resource / Digital'),
(3, 'JRN', 'Jurnal Ilmiah'),
(4, 'REF', 'Koleksi Referensi')
ON CONFLICT (id) DO NOTHING;

-- Collection Types
INSERT INTO mst_coll_types (id, name) VALUES
(1, 'Koleksi Sirkulasi (Dapat Dipinjam)'),
(2, 'Koleksi Referensi (Hanya Baca di Tempat)'),
(3, 'Koleksi Tandon / Cadangan')
ON CONFLICT (id) DO NOTHING;

-- Item Statuses
INSERT INTO mst_item_statuses (id, name, no_loan, skip_stock_take) VALUES
('AV', 'Tersedia di Rak', FALSE, FALSE),
('RD', 'Rusak Ringan', FALSE, FALSE),
('DM', 'Rusak Berat', TRUE, FALSE),
('MS', 'Hilang', TRUE, TRUE),
('RR', 'Hanya Baca di Ruang Baca', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO mst_locations (id, name) VALUES
('RAK-01', 'Rak 01 - Karya Umum & Komputer (000)'),
('RAK-02', 'Rak 02 - Filsafat & Psikologi (100)'),
('RAK-03', 'Rak 03 - Agama & Spiritualitas (200)'),
('RAK-04', 'Rak 04 - Ilmu Sosial & Hukum (300)'),
('RAK-05', 'Rak 05 - Bahasa & Linguistik (400)'),
('RAK-06', 'Rak 06 - Sains & Matematika (500)'),
('RAK-07', 'Rak 07 - Teknologi & Terapan (600)'),
('RAK-08', 'Rak 08 - Kesenian & Rekreasi (700)'),
('RAK-09', 'Rak 09 - Sastra & Fiksi (800)'),
('RAK-10', 'Rak 10 - Sejarah & Geografi (900)')
ON CONFLICT (id) DO NOTHING;

-- Publishers
INSERT INTO mst_publishers (id, name) VALUES
(1, 'Bentang Pustaka'),
(2, 'Gramedia Pustaka Utama'),
(3, 'Informatika Bandung'),
(4, 'Balai Pustaka'),
(5, 'Erlangga')
ON CONFLICT (id) DO NOTHING;

-- Places
INSERT INTO mst_places (id, name) VALUES
(1, 'Jakarta'),
(2, 'Bandung'),
(3, 'Yogyakarta'),
(4, 'Surabaya')
ON CONFLICT (id) DO NOTHING;

-- Languages
INSERT INTO mst_languages (code, name) VALUES
('id', 'Bahasa Indonesia'),
('en', 'English'),
('ar', 'Arabic')
ON CONFLICT (code) DO NOTHING;

-- Authors
INSERT INTO mst_authors (id, name, authority_type) VALUES
(1, 'Andrea Hirata', 'personal_name'),
(2, 'Budi Raharjo', 'personal_name'),
(3, 'Pramoedya Ananta Toer', 'personal_name'),
(4, 'Tere Liye', 'personal_name'),
(5, 'Achmad Zaky', 'personal_name')
ON CONFLICT (id) DO NOTHING;

-- Topics
INSERT INTO mst_topics (id, topic, topic_type) VALUES
(1, 'Sastra Indonesia - Novel', 'topical'),
(2, 'Pemrograman Komputer - Golang', 'topical'),
(3, 'Struktur Data & Algoritma', 'topical'),
(4, 'Sejarah Indonesia', 'topical'),
(5, 'Teknologi Informasi & Jaringan', 'topical')
ON CONFLICT (id) DO NOTHING;

-- Default System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('library_info', '{"name": "Perpustakaan LibreM", "sub_name": "Sistem Otomasi Perpustakaan", "address": "Jl. Pendidikan No. 1", "phone": "-", "theme_color": "#09090b"}', 'Profil identitas perpustakaan'),
('circulation_rules', '{"ignore_holidays_fine_calc": true, "max_fine_allowed": 10000.00, "allow_reserve": true}', 'Konfigurasi sirkulasi dan denda global'),
('system_init', '{"initialized": true, "version": "1.0.0", "engine": "PostgreSQL 15 ACID"}', 'Status inisialisasi sistem')
ON CONFLICT (setting_key) DO NOTHING;

-- Default Superadmin User (password: admin123, Bcrypt hash: $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR5e0WvU0i21B66fK89q45K0jM2k2)
-- Note: Installer and AutoMigrate can override or insert custom superadmin from wizard
INSERT INTO users (id, username, full_name, email, password_hash, role_id, is_active) VALUES
(1, 'admin', 'Administrator Perpustakaan', 'admin@librem.local', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR5e0WvU0i21B66fK89q45K0jM2k2', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Advance sequences for clean production usage
SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('mst_member_types_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_member_types));
SELECT setval('mst_gmd_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_gmd));
SELECT setval('mst_coll_types_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_coll_types));
SELECT setval('mst_publishers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_publishers));
SELECT setval('mst_places_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_places));
SELECT setval('mst_authors_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_authors));
SELECT setval('mst_topics_id_seq', (SELECT COALESCE(MAX(id), 1) FROM mst_topics));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('biblios_id_seq', 1, false);
SELECT setval('items_id_seq', 1, false);
SELECT setval('loans_id_seq', 1, false);
