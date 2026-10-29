-- ==============================================================================
-- DATABASE RESMI: JAYA WIJAYA (MySQL / MariaDB)
-- Untuk XAMPP phpMyAdmin (Localhost)
-- Manufaktur, Distribusi & Grosir Alat Kebersihan Berbahan Kayu
-- Slogan: "Produksi Berkualitas, Harga Bersahabat, Mitra Terpercaya."
-- ==============================================================================
-- CARA IMPORT DI PHPMYADMIN:
-- 1. Nyalakan Apache dan MySQL di XAMPP Control Panel.
-- 2. Buka browser: http://localhost/phpmyadmin
-- 3. Klik tab "Import" pada menu atas (atau buat database baru lalu klik Import).
-- 4. Pilih file "jaya_wijaya_mysql.sql" ini, lalu klik tombol "Import" / "Kirim".
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `jaya_wijaya`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `jaya_wijaya`;

-- Nonaktifkan pemeriksaan foreign key sementara untuk inisialisasi ulang yang aman
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `payroll_payouts`;
DROP TABLE IF EXISTS `payroll_records`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `cash_transactions`;
DROP TABLE IF EXISTS `inventory_movements`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. TABEL: PENGGUNA SISTEM & OTORISASI (users)
-- ==============================================================================
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'operator', 'kasir') NOT NULL DEFAULT 'operator',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 2. TABEL: KATALOG PRODUK & BAHAN BAKU (products)
-- ==============================================================================
CREATE TABLE `products` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `sku` VARCHAR(50) DEFAULT NULL,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'pcs',
  `purchase_price` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 3. TABEL: MUTASI STOK BARANG & GUDANG (inventory_movements)
-- ==============================================================================
CREATE TABLE `inventory_movements` (
  `id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `direction` ENUM('in', 'out') NOT NULL,
  `quantity` DECIMAL(14, 2) NOT NULL,
  `occurred_on` DATE NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inv_product_date` (`product_id`, `occurred_on` DESC),
  CONSTRAINT `fk_inv_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inv_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. TABEL: ARUS KAS & BUKU KEUANGAN (cash_transactions)
-- ==============================================================================
CREATE TABLE `cash_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `direction` ENUM('in', 'out') NOT NULL,
  `amount` DECIMAL(16, 2) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `occurred_on` DATE NOT NULL,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cash_date` (`occurred_on` DESC),
  CONSTRAINT `fk_cash_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 5. TABEL: MASTER DATA KARYAWAN & TENAGA KERJA (employees)
-- ==============================================================================
CREATE TABLE `employees` (
  `id` VARCHAR(36) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `position` VARCHAR(100) NOT NULL DEFAULT 'Produksi',
  `daily_salary` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `monthly_salary` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `overtime_rate` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `incentive_per_unit` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 6. TABEL: LOG ABSENSI HARIAN & PRODUKTIVITAS (payroll_records)
-- ==============================================================================
CREATE TABLE `payroll_records` (
  `id` VARCHAR(36) NOT NULL,
  `employee_id` VARCHAR(36) NOT NULL,
  `work_date` DATE NOT NULL,
  `period` DATE NOT NULL,
  `attendance_status` ENUM('present', 'half_day', 'permit', 'sick', 'absent') NOT NULL DEFAULT 'present',
  `daily_wage` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `overtime_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `overtime_pay` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `base_salary` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `production_quantity` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `incentive_rate` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `incentive_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_work_date` (`employee_id`, `work_date`),
  KEY `idx_payroll_work_date` (`work_date` DESC),
  CONSTRAINT `fk_payroll_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 7. TABEL: REKAPITULASI PELUNASAN GAJI BULANAN (payroll_payouts)
-- ==============================================================================
CREATE TABLE `payroll_payouts` (
  `id` VARCHAR(36) NOT NULL,
  `employee_id` VARCHAR(36) NOT NULL,
  `period` VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  `effective_days` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `present_days` INT NOT NULL DEFAULT 0,
  `half_days` INT NOT NULL DEFAULT 0,
  `overtime_hours` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `overtime_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `base_amount` DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  `production_quantity` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `incentive_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'paid') NOT NULL DEFAULT 'paid',
  `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_payout_period` (`employee_id`, `period`),
  KEY `idx_payout_period` (`period` DESC),
  CONSTRAINT `fk_payout_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 8. TRIGGER: PENCEGAHAN MUTASI STOK MINUS
-- ==============================================================================
DELIMITER //

DROP TRIGGER IF EXISTS `trg_prevent_negative_stock`//

CREATE TRIGGER `trg_prevent_negative_stock`
BEFORE INSERT ON `inventory_movements`
FOR EACH ROW
BEGIN
  DECLARE available_stock DECIMAL(14, 2) DEFAULT 0.00;

  IF NEW.direction = 'out' THEN
    SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END), 0)
    INTO available_stock
    FROM `inventory_movements`
    WHERE `product_id` = NEW.product_id;

    IF NEW.quantity > available_stock THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Stok gudang tidak mencukupi untuk mutasi barang keluar!';
    END IF;
  END IF;
END//

DELIMITER ;

-- ==============================================================================
-- 9. DATA AWAL (SEED DATA RESMI JAYA WIJAYA)
-- ==============================================================================

-- Akun Pengguna / Staf
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `role`) VALUES
('usr-001', 'admin', 'admin@jayawijaya.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Pimpinan Jaya Wijaya', 'admin'),
('usr-002', 'mandor', 'mandor@jayawijaya.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mandor Gudang Produksi', 'operator')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Master Produk Sapu & Alat Kebersihan Kayu
INSERT INTO `products` (`id`, `name`, `sku`, `unit`, `purchase_price`, `selling_price`) VALUES
('prod-001', 'Sapu Rayung Premium Gagang Kayu Mahoni', 'JW-SR-01', 'pcs', 11500.00, 18500.00),
('prod-002', 'Sapu Ijuk Super Tebal Gagang Kayu Halus', 'JW-SI-02', 'pcs', 13500.00, 21500.00),
('prod-003', 'Gagang Kayu Bubut Halus 120cm (Bahan Baku)', 'JW-GK-03', 'batang', 4000.00, 7000.00),
('prod-004', 'Sapu Lidi Taman Gagang Kayu Panjang', 'JW-SL-04', 'pcs', 9000.00, 15000.00),
('prod-005', 'Pel Strip Katun Gagang Kayu Kokoh', 'JW-PL-05', 'pcs', 16500.00, 26000.00),
('prod-006', 'Pengki Serokan Sampah Gagang Kayu', 'JW-PK-06', 'pcs', 10500.00, 17000.00)
ON DUPLICATE KEY UPDATE `selling_price` = VALUES(`selling_price`);

-- Data Karyawan Produksi
INSERT INTO `employees` (`id`, `full_name`, `position`, `daily_salary`, `overtime_rate`, `incentive_per_unit`, `is_active`) VALUES
('emp-001', 'Bambang Sutrisno', 'Operator Mesin Bubut & Pembentukan Kayu', 135000.00, 22000.00, 150.00, 1),
('emp-002', 'Siti Rahmawati', 'Perakitan & Finishing Sapu Rayung', 120000.00, 19000.00, 120.00, 1),
('emp-003', 'Agus Setiawan', 'Quality Control & Packing Grosir', 110000.00, 17000.00, 100.00, 1)
ON DUPLICATE KEY UPDATE `position` = VALUES(`position`);

-- Catatan Mutasi Stok Awal
INSERT INTO `inventory_movements` (`id`, `product_id`, `direction`, `quantity`, `occurred_on`, `notes`, `created_by`) VALUES
('inv-001', 'prod-001', 'in', 1200.00, CURRENT_DATE, 'Hasil produksi perakitan sapu rayung batch #101', 'usr-002'),
('inv-002', 'prod-001', 'out', 400.00, CURRENT_DATE, 'Pengiriman pesanan grosir Toko Berkah Kebersihan', 'usr-002'),
('inv-003', 'prod-002', 'in', 800.00, CURRENT_DATE, 'Selesai produksi sapu ijuk super', 'usr-002'),
('inv-004', 'prod-003', 'in', 2500.00, CURRENT_DATE, 'Penerimaan bahan baku gagang kayu bubut mahoni', 'usr-002'),
('inv-005', 'prod-004', 'in', 350.00, CURRENT_DATE, 'Stok masuk pel strip katun', 'usr-002')
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);

-- Catatan Arus Kas Awal
INSERT INTO `cash_transactions` (`id`, `direction`, `amount`, `category`, `description`, `occurred_on`, `created_by`) VALUES
('cash-001', 'in', 14500000.00, 'Penjualan', 'Pelunasan faktur pesanan grosir INV-JW-2026-081', CURRENT_DATE, 'usr-001'),
('cash-002', 'out', 5200000.00, 'Bahan Baku', 'Pengadaan bahan baku kayu mahoni & serat rayung', CURRENT_DATE, 'usr-001'),
('cash-003', 'in', 9200000.00, 'Penjualan', 'Pesanan kulakan sapu rayung & pel lantai', CURRENT_DATE, 'usr-001'),
('cash-004', 'out', 1650000.00, 'Operasional', 'Biaya listrik & utilitas mesin bengkel kayu', CURRENT_DATE, 'usr-001')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

