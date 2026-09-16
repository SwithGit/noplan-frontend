CREATE TABLE IF NOT EXISTS momu_device_program_settings (
  id VARCHAR(255) NOT NULL,
  deviceSeq INT NOT NULL,
  config JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, deviceSeq),
  INDEX idx_momu_device_program_settings_device (deviceSeq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS momu_device_program_setting_schedules (
  scheduleSeq INT NOT NULL AUTO_INCREMENT,
  id VARCHAR(255) NOT NULL,
  deviceSeq INT NOT NULL,
  scheduledAt VARCHAR(40) NOT NULL,
  scheduleStatus VARCHAR(20) NOT NULL DEFAULT 'pending',
  config JSON NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (scheduleSeq),
  INDEX idx_momu_device_program_setting_schedules_device (id, deviceSeq),
  INDEX idx_momu_device_program_setting_schedules_time (scheduledAt),
  INDEX idx_momu_device_program_setting_schedules_status (scheduleStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
