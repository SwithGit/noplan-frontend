const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const {
  DEFAULT_DEVICE_PROGRAM_CONFIG,
  createDefaultDeviceProgramConfig
} = require('./deviceProgramDefaults');
const {
  buildProgramHistoryDiff
} = require('./programHistory');

const LAUNCH_ON_STARTUP_VALUES = new Set([
  'none',
  'vividFriends',
  'immersiveLibrary',
  'hereMyPhoto'
]);

const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value)
);

const normalizeDrawingTimerMinutes = (value) => {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 5
    ? minutes
    : 0;
};

const normalizeLaunchOnStartup = (value) => (
  LAUNCH_ON_STARTUP_VALUES.has(value)
    ? value
    : DEFAULT_DEVICE_PROGRAM_CONFIG.launchOnStartup
);

const normalizeIdleLaunchDelaySeconds = (value) => {
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= 0 && seconds <= 86400
    ? seconds
    : DEFAULT_DEVICE_PROGRAM_CONFIG.idleLaunchDelaySeconds;
};

const normalizeUrlList = (value) => (
  Array.isArray(value)
    ? value.filter((url) => typeof url === 'string' && url.trim())
    : []
);

const normalizeVividFriendsConfig = (config = {}) => {
  const source = isPlainObject(config) ? config : {};

  return {
    ...DEFAULT_DEVICE_PROGRAM_CONFIG.vividFriends,
    ...source,
    drawingTimerMinutes: normalizeDrawingTimerMinutes(source.drawingTimerMinutes),
    drawingImageUrls: normalizeUrlList(source.drawingImageUrls)
  };
};

const normalizeImmersiveLibraryConfig = (config = {}) => {
  const source = isPlainObject(config) ? config : {};
  const launchMode = source.launchMode === 'active'
    ? 'active'
    : source.launchMode === 'basic'
      ? 'basic'
      : source.isBasic === false
        ? 'active'
        : 'basic';
  const isBasic = typeof source.isBasic === 'boolean'
    ? source.isBasic
    : launchMode === 'basic';

  return {
    ...DEFAULT_DEVICE_PROGRAM_CONFIG.immersiveLibrary,
    ...source,
    isBasic,
    launchMode,
    contents: Array.isArray(source.contents)
      ? source.contents.map((content) => {
        const normalizedContent = isPlainObject(content) ? content : {};
        return {
          ...normalizedContent,
          cardImageUrls: normalizeUrlList(normalizedContent.cardImageUrls)
        };
      })
      : DEFAULT_DEVICE_PROGRAM_CONFIG.immersiveLibrary.contents
  };
};

const normalizeHereMyPhotoConfig = (config = {}) => {
  const source = isPlainObject(config) ? config : {};

  return {
    ...DEFAULT_DEVICE_PROGRAM_CONFIG.hereMyPhoto,
    ...source,
    drawingTimerMinutes: normalizeDrawingTimerMinutes(source.drawingTimerMinutes),
    stickerImageUrls: normalizeUrlList(source.stickerImageUrls)
  };
};

const normalizeDeviceProgramConfig = (config = {}) => {
  const source = isPlainObject(config) ? config : {};

  return {
    launchOnStartup: normalizeLaunchOnStartup(
      source.launchOnStartup
    ),
    idleLaunchDelaySeconds: normalizeIdleLaunchDelaySeconds(
      source.idleLaunchDelaySeconds
    ),
    vividFriends: normalizeVividFriendsConfig(source.vividFriends),
    immersiveLibrary: normalizeImmersiveLibraryConfig(source.immersiveLibrary),
    hereMyPhoto: normalizeHereMyPhotoConfig(source.hereMyPhoto)
  };
};

const parseStoredConfig = (storedConfig) => {
  if (!storedConfig) {
    return createDefaultDeviceProgramConfig();
  }

  if (typeof storedConfig === 'string') {
    try {
      return normalizeDeviceProgramConfig(JSON.parse(storedConfig));
    } catch (err) {
      console.error('Device program config parse error:', err);
      return createDefaultDeviceProgramConfig();
    }
  }

  return normalizeDeviceProgramConfig(storedConfig);
};

const normalizeNullableResourceUrl = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue || normalizedValue.toLowerCase() === 'null') {
    return null;
  }

  return normalizedValue;
};

const validateDeviceParams = (id, deviceSeq, res) => {
  if (!id || deviceSeq === undefined || deviceSeq === null) {
    res.status(400).json({
      success: false,
      message: 'id and deviceSeq are required.'
    });
    return false;
  }

  return true;
};

const validateConfig = (config, res) => {
  if (!isPlainObject(config)) {
    res.status(400).json({
      success: false,
      message: 'config is required.'
    });
    return false;
  }

  return true;
};

const findMomuDevice = (id, deviceSeq, callback) => {
  const sql = 'SELECT deviceSeq, deviceAlias, status FROM momu_devices WHERE id = ? AND deviceSeq = ?';

  db.query(sql, [id, deviceSeq], (err, results) => {
    if (err) {
      return callback(err);
    }

    if (results.length === 0) {
      return callback(null, null);
    }

    return callback(null, results[0]);
  });
};

const handleDeviceLookup = (id, deviceSeq, res, onSuccess) => {
  findMomuDevice(id, deviceSeq, (err, device) => {
    if (err) {
      console.error('Device program lookup error:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error occurred.'
      });
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found.'
      });
    }

    return onSuccess(device);
  });
};

const findDeviceProgramSetting = (id, deviceSeq, callback) => {
  const sql = `
    SELECT config
    FROM momu_device_program_settings
    WHERE id = ? AND deviceSeq = ?
  `;

  db.query(sql, [id, deviceSeq], (err, results) => {
    if (err) {
      return callback(err);
    }

    if (results.length === 0 || !results[0]?.config) {
      const defaultConfig = createDefaultDeviceProgramConfig();
      return upsertDeviceProgramSetting(
        id,
        deviceSeq,
        defaultConfig,
        (upsertErr, result, normalizedConfig) => {
          if (upsertErr) {
            return callback(upsertErr);
          }

          console.log('[DEVICE CONFIG CREATED]', {
            id,
            deviceSeq
          });
          return callback(null, normalizedConfig);
        }
      );
    }

    const storedConfig = parseStoredConfig(results[0]?.config);

    console.log('[DEVICE CONFIG CHECK]', {
      id,
      deviceSeq,
      vividFriendsTimer:
        storedConfig.vividFriends?.drawingTimerMinutes,
      hereMyPhotoTimer:
        storedConfig.hereMyPhoto?.drawingTimerMinutes
    });

    return callback(null, storedConfig);
  });
};

const findDeviceProgramCatalog = (deviceSeq, callback) => {
  const sql = `
    SELECT
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
    INNER JOIN momu_programs p
      ON p.programSeq = dp.programSeq
    WHERE dp.deviceSeq = ?
      AND dp.isEnabled = 1
      AND p.isActive = 1
    ORDER BY dp.sortOrder ASC, p.programSeq ASC
  `;

  db.query(sql, [deviceSeq], (err, results) => {
    if (err) {
      return callback(err);
    }

    return callback(null, results);
  });
};

const upsertDeviceProgramSetting = (id, deviceSeq, config, callback) => {
  const normalizedConfig = normalizeDeviceProgramConfig(config);
  const sql = `
    INSERT INTO momu_device_program_settings
    (id, deviceSeq, config)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
    config = VALUES(config),
    updatedAt = CURRENT_TIMESTAMP
  `;

  db.query(sql, [id, deviceSeq, JSON.stringify(normalizedConfig)], (err, result) => {
    if (err) {
      return callback(err);
    }

    return callback(null, result, normalizedConfig);
  });
};

const insertDeviceProgramSettingSchedule = (id, deviceSeq, scheduledAt, config, callback) => {
  const normalizedConfig = normalizeDeviceProgramConfig(config);
  const sql = `
    INSERT INTO momu_device_program_setting_schedules
    (id, deviceSeq, scheduledAt, config)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [id, deviceSeq, scheduledAt, JSON.stringify(normalizedConfig)], (err, result) => {
    if (err) {
      return callback(err);
    }

    return callback(null, result, normalizedConfig);
  });
};

const queryAsync = (target, sql, params = []) => (
  new Promise((resolve, reject) => {
    target.query(sql, params, (error, rows) => {
      if (error) return reject(error);
      return resolve(rows);
    });
  })
);

const getConnectionAsync = () => (
  new Promise((resolve, reject) => {
    db.getConnection((error, connection) => {
      if (error) return reject(error);
      return resolve(connection);
    });
  })
);

const beginTransactionAsync = (connection) => (
  new Promise((resolve, reject) => {
    connection.beginTransaction((error) => {
      if (error) return reject(error);
      return resolve();
    });
  })
);

const commitAsync = (connection) => (
  new Promise((resolve, reject) => {
    connection.commit((error) => {
      if (error) return reject(error);
      return resolve();
    });
  })
);

const rollbackAsync = (connection) => (
  new Promise((resolve) => {
    connection.rollback(() => resolve());
  })
);

const getHistorySnapshot = async (connection, id, deviceSeq) => {
  const rows = await queryAsync(connection, `
    SELECT
      d.deviceSeq,
      COALESCE(NULLIF(d.deviceAlias, ''), NULLIF(d.deviceName, ''), CONCAT('Device ', d.deviceSeq)) AS deviceName,
      u.companyName,
      u.companyLogo,
      u.managerName,
      u.managerPhone
    FROM momu_devices d
    LEFT JOIN momu_users u ON u.id = d.id
    WHERE d.id = ? AND d.deviceSeq = ?
    LIMIT 1
  `, [id, deviceSeq]);

  if (!rows || rows.length === 0) {
    const error = new Error('Device not found while creating history.');
    error.code = 'MOMU_DEVICE_NOT_FOUND';
    throw error;
  }
  return rows[0];
};

const insertProgramHistory = async (
  connection,
  {
    id,
    deviceSeq,
    scheduleSeq,
    executionType,
    snapshot,
    beforeConfig,
    afterConfig,
    diff
  }
) => {
  const result = await queryAsync(connection, `
    INSERT INTO momu_device_program_setting_histories
    (
      id,
      deviceSeq,
      scheduleSeq,
      executionType,
      executionStatus,
      executedAt,
      deviceName,
      companyName,
      companyLogo,
      managerName,
      managerPhone,
      changedPrograms,
      changeSummary,
      changes,
      beforeConfig,
      afterConfig
    )
    VALUES (?, ?, ?, ?, 'success', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    deviceSeq,
    scheduleSeq || null,
    executionType,
    snapshot.deviceName,
    snapshot.companyName || null,
    snapshot.companyLogo || null,
    snapshot.managerName || null,
    snapshot.managerPhone || null,
    JSON.stringify(diff.changedPrograms),
    diff.changeSummary,
    JSON.stringify(diff.changes),
    JSON.stringify(beforeConfig),
    JSON.stringify(afterConfig)
  ]);

  return Number(result.insertId);
};

const applyDeviceProgramSettingWithHistory = async ({
  id,
  deviceSeq,
  config,
  executionType,
  scheduleSeq = null
}) => {
  const connection = await getConnectionAsync();
  let transactionStarted = false;

  try {
    await beginTransactionAsync(connection);
    transactionStarted = true;

    let requestedConfig = config;
    if (scheduleSeq) {
      const scheduleRows = await queryAsync(connection, `
        SELECT config, scheduleStatus
        FROM momu_device_program_setting_schedules
        WHERE scheduleSeq = ? AND id = ? AND deviceSeq = ?
        FOR UPDATE
      `, [scheduleSeq, id, deviceSeq]);

      if (
        !scheduleRows ||
        scheduleRows.length === 0 ||
        scheduleRows[0].scheduleStatus !== 'processing'
      ) {
        const error = new Error('Schedule is not available for processing.');
        error.code = 'MOMU_SCHEDULE_NOT_PROCESSING';
        throw error;
      }
      requestedConfig = parseStoredConfig(scheduleRows[0].config);
    }

    const settingRows = await queryAsync(connection, `
      SELECT config
      FROM momu_device_program_settings
      WHERE id = ? AND deviceSeq = ?
      FOR UPDATE
    `, [id, deviceSeq]);
    const beforeConfig = settingRows.length > 0
      ? parseStoredConfig(settingRows[0].config)
      : createDefaultDeviceProgramConfig();
    const afterConfig = normalizeDeviceProgramConfig(requestedConfig);
    const diff = buildProgramHistoryDiff(beforeConfig, afterConfig);
    const snapshot = await getHistorySnapshot(connection, id, deviceSeq);

    await queryAsync(connection, `
      INSERT INTO momu_device_program_settings
      (id, deviceSeq, config)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
      config = VALUES(config),
      updatedAt = CURRENT_TIMESTAMP
    `, [id, deviceSeq, JSON.stringify(afterConfig)]);

    const historySeq = await insertProgramHistory(connection, {
      id,
      deviceSeq,
      scheduleSeq,
      executionType,
      snapshot,
      beforeConfig,
      afterConfig,
      diff
    });

    if (scheduleSeq) {
      await queryAsync(connection, `
        UPDATE momu_device_program_setting_schedules
        SET scheduleStatus = 'completed',
            executedAt = CURRENT_TIMESTAMP,
            errorMessage = NULL,
            updatedAt = CURRENT_TIMESTAMP
        WHERE scheduleSeq = ?
      `, [scheduleSeq]);
    }

    await commitAsync(connection);
    transactionStarted = false;
    return {
      config: afterConfig,
      historySeq,
      historyCreated: true,
      changedPrograms: diff.changedPrograms,
      changeSummary: diff.changeSummary,
      changeCount: diff.changes.length
    };
  } catch (error) {
    if (transactionStarted) await rollbackAsync(connection);
    throw error;
  } finally {
    connection.release();
  }
};

const SCHEDULE_POLL_INTERVAL_MS = Math.max(
  5000,
  Number(process.env.MOMU_SCHEDULE_POLL_INTERVAL_MS) || 30000
);
let scheduleWorkerStarted = false;
let schedulePollRunning = false;

const markScheduleFailed = async (scheduleSeq, error) => {
  const message = String(error?.message || error || 'Unknown error').slice(0, 2000);
  await queryAsync(db, `
    UPDATE momu_device_program_setting_schedules
    SET scheduleStatus = 'failed',
        errorMessage = ?,
        updatedAt = CURRENT_TIMESTAMP
    WHERE scheduleSeq = ?
  `, [message, scheduleSeq]);
};

const processDueProgramSchedules = async () => {
  if (schedulePollRunning) return;
  schedulePollRunning = true;

  try {
    await queryAsync(db, `
      UPDATE momu_device_program_setting_schedules
      SET scheduleStatus = 'pending',
          errorMessage = 'Recovered after an interrupted execution.',
          updatedAt = CURRENT_TIMESTAMP
      WHERE scheduleStatus = 'processing'
        AND updatedAt < CURRENT_TIMESTAMP - INTERVAL 10 MINUTE
    `);

    const schedules = await queryAsync(db, `
      SELECT scheduleSeq, id, deviceSeq, scheduledAt
      FROM momu_device_program_setting_schedules
      WHERE scheduleStatus = 'pending'
      ORDER BY scheduledAt ASC, scheduleSeq ASC
      LIMIT 100
    `);
    const now = Date.now();

    for (const schedule of schedules) {
      const scheduledTime = Date.parse(schedule.scheduledAt);
      if (!Number.isFinite(scheduledTime)) {
        await markScheduleFailed(
          schedule.scheduleSeq,
          new Error(`Invalid scheduledAt: ${schedule.scheduledAt}`)
        );
        continue;
      }
      if (scheduledTime > now) continue;

      const claimResult = await queryAsync(db, `
        UPDATE momu_device_program_setting_schedules
        SET scheduleStatus = 'processing',
            errorMessage = NULL,
            updatedAt = CURRENT_TIMESTAMP
        WHERE scheduleSeq = ? AND scheduleStatus = 'pending'
      `, [schedule.scheduleSeq]);
      if (claimResult.affectedRows !== 1) continue;

      try {
        const result = await applyDeviceProgramSettingWithHistory({
          id: schedule.id,
          deviceSeq: schedule.deviceSeq,
          executionType: 'scheduled',
          scheduleSeq: schedule.scheduleSeq
        });
        console.log('[MOMU SCHEDULE COMPLETED]', {
          scheduleSeq: schedule.scheduleSeq,
          historySeq: result.historySeq,
          changeCount: result.changeCount
        });
      } catch (error) {
        console.error('[MOMU SCHEDULE FAILED]', schedule.scheduleSeq, error);
        await markScheduleFailed(schedule.scheduleSeq, error);
      }
    }
  } catch (error) {
    console.error('[MOMU SCHEDULE WORKER ERROR]', error);
  } finally {
    schedulePollRunning = false;
  }
};

const startProgramScheduleWorker = () => {
  if (scheduleWorkerStarted) return;
  scheduleWorkerStarted = true;

  const initialTimer = setTimeout(
    processDueProgramSchedules,
    1000
  );
  initialTimer.unref?.();
  const timer = setInterval(
    processDueProgramSchedules,
    SCHEDULE_POLL_INTERVAL_MS
  );
  timer.unref?.();

  console.log('[MOMU SCHEDULE WORKER STARTED]', {
    pollIntervalMs: SCHEDULE_POLL_INTERVAL_MS
  });
};

/**
 * @swagger
 * components:
 *   schemas:
 *     MomuDeviceProgramConfig:
 *       type: object
 *       properties:
 *         vividFriends:
 *           type: object
 *           properties:
 *             isActive:
 *               type: boolean
 *               example: true
 *             backgroundMode:
 *               type: string
 *               example: custom
 *             backgroundImageUrl:
 *               type: string
 *               nullable: true
 *               example: https://...
 *             musicMode:
 *               type: string
 *               example: custom
 *             musicFileUrl:
 *               type: string
 *               nullable: true
 *               example: https://...
 *             effectMode:
 *               type: string
 *               example: custom
 *             effectFileUrl:
 *               type: string
 *               nullable: true
 *               example: https://...
 *             motionType:
 *               type: string
 *               example: right_left
 *             drawingTimerMinutes:
 *               type: integer
 *               minimum: 0
 *               maximum: 5
 *               example: 0
 *             drawingListMode:
 *               type: string
 *               example: basic
 *             drawingImageUrls:
 *               type: array
 *               items:
 *                 type: string
 *               example: []
 *         immersiveLibrary:
 *           type: object
 *           properties:
 *             isActive:
 *               type: boolean
 *               example: true
 *             isBasic:
 *               type: boolean
 *               example: false
 *             contents:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   contentId:
 *                     type: string
 *                     example: content-1
 *                   contentName:
 *                     type: string
 *                     example: contents1
 *                   sortOrder:
 *                     type: integer
 *                     example: 1
 *                   titleImageUrl:
 *                     type: string
 *                     example: https://...
 *                   projectionMediaUrl:
 *                     type: string
 *                     example: https://...
 *                   cardImageUrls:
 *                     type: array
 *                     items:
 *                       type: string
 *         hereMyPhoto:
 *           type: object
 *           properties:
 *             isActive:
 *               type: boolean
 *               example: true
 *             backgroundMode:
 *               type: string
 *               example: custom
 *             backgroundImageUrl:
 *               type: string
 *               nullable: true
 *               example: https://...
 *             musicMode:
 *               type: string
 *               example: custom
 *             musicFileUrl:
 *               type: string
 *               nullable: true
 *               example: https://...
 *             effectMode:
 *               type: string
 *               example: custom
 *             effectFileUrl:
 *               type: string
 *               nullable: true
 *               example: https://...
 *             motionType:
 *               type: string
 *               example: right_left
 *             drawingTimerMinutes:
 *               type: integer
 *               minimum: 0
 *               maximum: 5
 *               example: 0
 *             stickerMode:
 *               type: string
 *               example: custom
 *             stickerImageUrls:
 *               type: array
 *               items:
 *                 type: string
 *               example: []
 *     MomuProgramCatalogItem:
 *       type: object
 *       properties:
 *         programSeq:
 *           type: integer
 *           example: 1
 *         programKey:
 *           type: string
 *           example: vividFriends
 *         nameKo:
 *           type: string
 *           example: 비비드 프렌즈
 *         nameEn:
 *           type: string
 *           example: Vivid Friends
 *         descriptionKo:
 *           type: string
 *         descriptionEn:
 *           type: string
 *         thumbnailImageUrl:
 *           type: string
 *           nullable: true
 *         contentsImageUrl:
 *           type: string
 *           nullable: true
 *         sortOrder:
 *           type: integer
 *           example: 1
 * paths:
 *   /api/momu/program/device-setting/config:
 *     post:
 *       summary: Momu device integrated program setting lookup
 *       tags:
 *         - Momu Program
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - id
 *                 - deviceSeq
 *               properties:
 *                 id:
 *                   type: string
 *                   example: admin2
 *                 deviceSeq:
 *                   type: integer
 *                   example: 3
 *             example:
 *               id: admin2
 *               deviceSeq: 3
 *       responses:
 *         200:
 *           description: Device program setting lookup success
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   device:
 *                     type: object
 *                     properties:
 *                       deviceSeq:
 *                         type: integer
 *                         example: 3
 *                       deviceAlias:
 *                         type: string
 *                         example: testtestt
 *                       status:
 *                         type: string
 *                         example: active
 *                   config:
 *                     $ref: '#/components/schemas/MomuDeviceProgramConfig'
 *                   programs:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/MomuProgramCatalogItem'
 *         400:
 *           description: Invalid request
 *         404:
 *           description: Device not found
 *         500:
 *           description: Server error
 *   /api/momu/program/device-setting/apply:
 *     post:
 *       summary: Apply the Momu device integrated program setting immediately
 *       tags:
 *         - Momu Program
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - id
 *                 - deviceSeq
 *                 - config
 *               properties:
 *                 id:
 *                   type: string
 *                   example: admin2
 *                 deviceSeq:
 *                   type: integer
 *                   example: 3
 *                 config:
 *                   $ref: '#/components/schemas/MomuDeviceProgramConfig'
 *       responses:
 *         200:
 *           description: Device program setting applied successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: Device program settings applied successfully.
 *                   id:
 *                     type: string
 *                     example: admin2
 *                   deviceSeq:
 *                     type: integer
 *                     example: 3
 *                   config:
 *                     $ref: '#/components/schemas/MomuDeviceProgramConfig'
 *         400:
 *           description: Invalid request
 *         404:
 *           description: Device not found
 *         500:
 *           description: Server error
 *   /api/momu/program/device-setting/schedule:
 *     post:
 *       summary: Schedule Momu device integrated program setting
 *       tags:
 *         - Momu Program
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - id
 *                 - deviceSeq
 *                 - scheduledAt
 *                 - config
 *               properties:
 *                 id:
 *                   type: string
 *                   example: admin2
 *                 deviceSeq:
 *                   type: integer
 *                   example: 3
 *                 scheduledAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-06-30T15:00:00+09:00
 *                 config:
 *                   $ref: '#/components/schemas/MomuDeviceProgramConfig'
 *       responses:
 *         200:
 *           description: Device program setting scheduled successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: Device program settings scheduled successfully.
 *                   id:
 *                     type: string
 *                     example: admin2
 *                   deviceSeq:
 *                     type: integer
 *                     example: 3
 *                   scheduledAt:
 *                     type: string
 *                     format: date-time
 *                     example: 2026-06-30T15:00:00+09:00
 *         400:
 *           description: Invalid request
 *         404:
 *           description: Device not found
 *         500:
 *           description: Server error
 */
router.post('/device-setting/config', (req, res) => {
  const { id, deviceSeq } = req.body;

  if (!validateDeviceParams(id, deviceSeq, res)) {
    return;
  }

  handleDeviceLookup(id, deviceSeq, res, (device) => {
    findDeviceProgramSetting(id, deviceSeq, (err, config) => {
      if (err) {
        console.error('Device program setting lookup error:', err);
        return res.status(500).json({
          success: false,
          message: 'Server error occurred.'
        });
      }

      findDeviceProgramCatalog(deviceSeq, (catalogErr, programs) => {
        if (catalogErr) {
          console.error('Device program catalog lookup error:', catalogErr);
          return res.status(500).json({
            success: false,
            message: 'Server error occurred.'
          });
        }

        return res.json({
          success: true,
          device,
          programs,
          config
        });
      });
    });
  });
});

router.post('/device-setting/apply', (req, res) => {
  const { id, deviceSeq, config } = req.body;

  if (!validateDeviceParams(id, deviceSeq, res) || !validateConfig(config, res)) {
    return;
  }

  handleDeviceLookup(id, deviceSeq, res, () => {
    applyDeviceProgramSettingWithHistory({
      id,
      deviceSeq,
      config,
      executionType: 'immediate'
    })
      .then((result) => res.json({
        success: true,
        message: 'Device program settings applied successfully.',
        id,
        deviceSeq,
        config: result.config,
        historySeq: result.historySeq,
        historyCreated: result.historyCreated,
        changedPrograms: result.changedPrograms,
        changeSummary: result.changeSummary,
        changeCount: result.changeCount
      }))
      .catch((err) => {
        console.error('Device program setting apply error:', err);
        return res.status(500).json({
          success: false,
          message: 'Server error occurred.'
        });
      });
  });
});

router.post('/device-setting/schedule', (req, res) => {
  const { id, deviceSeq, scheduledAt, config } = req.body;

  if (!validateDeviceParams(id, deviceSeq, res) || !validateConfig(config, res)) {
    return;
  }

  if (!scheduledAt) {
    return res.status(400).json({
      success: false,
      message: 'scheduledAt is required.'
    });
  }

  const scheduledTime = Date.parse(scheduledAt);
  if (!Number.isFinite(scheduledTime)) {
    return res.status(400).json({
      success: false,
      message: 'scheduledAt must be a valid ISO date-time.'
    });
  }
  const normalizedScheduledAt = new Date(scheduledTime).toISOString();

  handleDeviceLookup(id, deviceSeq, res, () => {
    insertDeviceProgramSettingSchedule(id, deviceSeq, normalizedScheduledAt, config, (err, result) => {
      if (err) {
        console.error('Device program setting schedule error:', err);
        return res.status(500).json({
          success: false,
          message: 'Server error occurred.'
        });
      }

      return res.json({
        success: true,
        message: 'Device program settings scheduled successfully.',
        id,
        deviceSeq,
        scheduleSeq: Number(result.insertId),
        scheduledAt: normalizedScheduledAt,
        scheduleStatus: 'pending'
      });
    });
  });
});

router.startProgramScheduleWorker = startProgramScheduleWorker;

module.exports = router;
