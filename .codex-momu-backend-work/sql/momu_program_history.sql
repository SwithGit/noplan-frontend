CREATE TABLE IF NOT EXISTS momu_device_program_setting_histories (
  historySeq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id VARCHAR(255) NOT NULL,
  deviceSeq INT NOT NULL,
  scheduleSeq INT NULL,
  executionType VARCHAR(20) NOT NULL,
  executionStatus VARCHAR(20) NOT NULL DEFAULT 'success',
  executedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deviceName VARCHAR(255) NOT NULL,
  companyName VARCHAR(255) NULL,
  companyLogo VARCHAR(2048) NULL,
  managerName VARCHAR(255) NULL,
  managerPhone VARCHAR(50) NULL,
  changedPrograms JSON NOT NULL,
  changeSummary TEXT NOT NULL,
  changes JSON NOT NULL,
  beforeConfig JSON NOT NULL,
  afterConfig JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (historySeq),
  INDEX idx_momu_program_history_owner_time (id, executedAt),
  INDEX idx_momu_program_history_device_time (id, deviceSeq, executedAt),
  INDEX idx_momu_program_history_schedule (scheduleSeq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT COUNT(*) INTO @has_history_company_logo
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'momu_device_program_setting_histories'
  AND COLUMN_NAME = 'companyLogo';
SET @sql = IF(
  @has_history_company_logo = 0,
  'ALTER TABLE momu_device_program_setting_histories ADD COLUMN companyLogo VARCHAR(2048) NULL AFTER companyName',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS momu_device_program_setting_schedules (
  scheduleSeq INT NOT NULL AUTO_INCREMENT,
  id VARCHAR(255) NOT NULL,
  deviceSeq INT NOT NULL,
  scheduledAt VARCHAR(40) NOT NULL,
  scheduleStatus VARCHAR(20) NOT NULL DEFAULT 'pending',
  config JSON NOT NULL,
  executedAt DATETIME NULL,
  errorMessage TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (scheduleSeq),
  INDEX idx_momu_device_program_setting_schedules_device (id, deviceSeq),
  INDEX idx_momu_device_program_setting_schedules_time (scheduledAt),
  INDEX idx_momu_device_program_setting_schedules_status (scheduleStatus),
  INDEX idx_momu_program_schedules_status_time (scheduleStatus, scheduledAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing installations already have the schedule table. Add the worker
-- result columns only when they do not exist so this migration is rerunnable.
SET @schema_name = DATABASE();

SELECT COUNT(*) INTO @has_executed_at
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'momu_device_program_setting_schedules'
  AND COLUMN_NAME = 'executedAt';
SET @sql = IF(
  @has_executed_at = 0,
  'ALTER TABLE momu_device_program_setting_schedules ADD COLUMN executedAt DATETIME NULL AFTER config',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_error_message
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'momu_device_program_setting_schedules'
  AND COLUMN_NAME = 'errorMessage';
SET @sql = IF(
  @has_error_message = 0,
  'ALTER TABLE momu_device_program_setting_schedules ADD COLUMN errorMessage TEXT NULL AFTER executedAt',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_status_time_index
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'momu_device_program_setting_schedules'
  AND INDEX_NAME = 'idx_momu_program_schedules_status_time';
SET @sql = IF(
  @has_status_time_index = 0,
  'ALTER TABLE momu_device_program_setting_schedules ADD INDEX idx_momu_program_schedules_status_time (scheduleStatus, scheduledAt)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
