-- Company logos belong to an account, not to a device.
-- Run this once before deploying the updated Backend.
-- Preserve the existing INT/UNSIGNED type while making only NULLability
-- optional, so an existing device foreign key remains compatible.
SET @momu_assets_device_seq_type = (
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'momu_assets'
    AND COLUMN_NAME = 'deviceSeq'
  LIMIT 1
);
SET @alter_momu_assets_device_seq_sql = IF(
  @momu_assets_device_seq_type IS NULL,
  'SELECT 1',
  CONCAT(
    'ALTER TABLE momu_assets MODIFY COLUMN deviceSeq ',
    @momu_assets_device_seq_type,
    ' NULL'
  )
);
PREPARE alter_momu_assets_device_seq
  FROM @alter_momu_assets_device_seq_sql;
EXECUTE alter_momu_assets_device_seq;
DEALLOCATE PREPARE alter_momu_assets_device_seq;

-- A company logo can be uploaded before momu_users is created. If the
-- current schema links momu_assets.id to momu_users.id, remove only that
-- foreign key. Ownership is still checked by the Backend using the id text.
SET @momu_assets_user_fk = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'momu_assets'
    AND COLUMN_NAME = 'id'
    AND REFERENCED_TABLE_NAME = 'momu_users'
  LIMIT 1
);
SET @drop_momu_assets_user_fk_sql = IF(
  @momu_assets_user_fk IS NULL,
  'SELECT 1',
  CONCAT(
    'ALTER TABLE momu_assets DROP FOREIGN KEY `',
    REPLACE(@momu_assets_user_fk, '`', '``'),
    '`'
  )
);
PREPARE drop_momu_assets_user_fk
  FROM @drop_momu_assets_user_fk_sql;
EXECUTE drop_momu_assets_user_fk;
DEALLOCATE PREPARE drop_momu_assets_user_fk;

-- Existing pending rows already represent orphan uploads. They can be
-- removed periodically after the presigned upload lifetime has elapsed.
-- Example cleanup query (run from a scheduled job when desired):
-- DELETE FROM momu_assets
-- WHERE category = 'company-logo'
--   AND status = 'pending'
--   AND createdAt < CURRENT_TIMESTAMP - INTERVAL 1 DAY;
