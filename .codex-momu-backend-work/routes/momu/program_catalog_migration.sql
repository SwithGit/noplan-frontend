-- MOMU program catalog migration
-- MySQL 8.x / utf8mb4
--
-- Execution order:
--   1. Create momu_programs.
--   2. Create momu_device_programs.
--   3. Seed the three initial programs.
--   4. Assign the programs to existing devices.
--   5. Replace NULL image URLs with actual public URLs.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS momu_programs (
  programSeq INT NOT NULL AUTO_INCREMENT,
  programKey VARCHAR(64) NOT NULL,
  nameKo VARCHAR(100) NOT NULL,
  nameEn VARCHAR(100) NOT NULL,
  descriptionKo TEXT NOT NULL,
  descriptionEn TEXT NOT NULL,
  thumbnailImageUrl VARCHAR(2048) NULL,
  contentsImageUrl VARCHAR(2048) NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (programSeq),
  UNIQUE KEY uq_momu_programs_program_key (programKey),
  KEY idx_momu_programs_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS momu_device_programs (
  deviceProgramSeq BIGINT NOT NULL AUTO_INCREMENT,
  deviceSeq INT NOT NULL,
  programSeq INT NOT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  isEnabled TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (deviceProgramSeq),
  UNIQUE KEY uq_momu_device_program (deviceSeq, programSeq),
  KEY idx_momu_device_program_order (deviceSeq, isEnabled, sortOrder),
  KEY idx_momu_device_program_program (programSeq),
  CONSTRAINT fk_momu_device_program_device
    FOREIGN KEY (deviceSeq) REFERENCES momu_devices (deviceSeq)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_momu_device_program_program
    FOREIGN KEY (programSeq) REFERENCES momu_programs (programSeq)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO momu_programs (
  programKey,
  nameKo,
  nameEn,
  descriptionKo,
  descriptionEn,
  thumbnailImageUrl,
  contentsImageUrl,
  isActive
)
VALUES
  (
    'vividFriends',
    '비비드 프렌즈',
    'Vivid Friends',
    '터치모니터에서 직접 색칠한 그림을 대형 화면으로 띄워 함께 즐기는 참여형 인터랙티브 콘텐츠입니다.',
    'An interactive content experience where drawings colored on a touch monitor are displayed on a large projection screen for everyone to enjoy together.',
    NULL,
    NULL,
    1
  ),
  (
    'immersiveLibrary',
    '이머시브 라이브러리',
    'Immersive Library',
    '터치모니터에서 원하는 콘텐츠를 선택해 대형 화면의 이미지와 영상을 감상하는 실감형 미디어 전시 콘텐츠입니다.',
    'An immersive media exhibition where users select content on a touch monitor and enjoy images and videos on a large screen.',
    NULL,
    NULL,
    1
  ),
  (
    'hereMyPhoto',
    '히어 마이 포토',
    'Here My Photo',
    '웹캠으로 촬영한 사진을 터치모니터에서 꾸미고 완성 이미지를 저장할 수 있는 참여형 포토 콘텐츠입니다.',
    'An interactive photo experience where users capture a picture with a webcam, decorate it on a touch monitor, and save the finished image.',
    NULL,
    NULL,
    1
  )
ON DUPLICATE KEY UPDATE
  nameKo = VALUES(nameKo),
  nameEn = VALUES(nameEn),
  descriptionKo = VALUES(descriptionKo),
  descriptionEn = VALUES(descriptionEn),
  isActive = VALUES(isActive);

-- Initial policy: make all three programs available to every existing device.
-- Change isEnabled after this migration when a device must not expose a program.
INSERT INTO momu_device_programs (deviceSeq, programSeq, sortOrder, isEnabled)
SELECT
  d.deviceSeq,
  p.programSeq,
  CASE p.programKey
    WHEN 'vividFriends' THEN 1
    WHEN 'immersiveLibrary' THEN 2
    WHEN 'hereMyPhoto' THEN 3
    ELSE 999
  END AS sortOrder,
  1 AS isEnabled
FROM momu_devices d
JOIN momu_programs p
  ON p.programKey IN ('vividFriends', 'immersiveLibrary', 'hereMyPhoto')
ON DUPLICATE KEY UPDATE
  sortOrder = VALUES(sortOrder);

COMMIT;

-- Set the actual public image URLs after uploading the images.
-- Example:
-- UPDATE momu_programs
-- SET thumbnailImageUrl = 'https://cdn.example.com/momu/vivid-thumb.png',
--     contentsImageUrl = 'https://cdn.example.com/momu/vivid-detail.png'
-- WHERE programKey = 'vividFriends';

-- Verification query used by the Unity Title scene API.
SELECT
  dp.deviceSeq,
  p.programSeq,
  p.programKey,
  p.nameKo,
  p.nameEn,
  p.descriptionKo,
  p.descriptionEn,
  p.thumbnailImageUrl,
  p.contentsImageUrl,
  dp.sortOrder
FROM momu_device_programs dp
JOIN momu_programs p ON p.programSeq = dp.programSeq
WHERE dp.isEnabled = 1
  AND p.isActive = 1
ORDER BY dp.deviceSeq, dp.sortOrder, p.programSeq;
