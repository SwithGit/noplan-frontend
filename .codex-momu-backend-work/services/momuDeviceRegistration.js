const db = require('../config/db');
const {
  createDefaultDeviceProgramConfig,
} = require('../routes/momu/deviceProgramDefaults');

function formatDeviceCreatedAt(date = new Date()) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

async function registerMomuDevice({
  id,
  deviceName,
  serialNumber,
  connection = null,
}) {
  const ownsConnection = !connection;
  const client = connection || await db.promise().getConnection();
  const deviceAlias = deviceName;
  const status = 'inactive';
  const createdAt = formatDeviceCreatedAt();
  const defaultConfig = createDefaultDeviceProgramConfig();

  try {
    if (ownsConnection) await client.beginTransaction();

    const [result] = await client.query(`
      INSERT INTO momu_devices
        (id, deviceName, deviceAlias, serialNumber, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, deviceName, deviceAlias, serialNumber, status, createdAt]);
    const deviceSeq = Number(result.insertId);

    await client.query(`
      INSERT INTO momu_device_programs
        (deviceSeq, programSeq, sortOrder, isEnabled)
      SELECT
        ?,
        programSeq,
        programSeq,
        1
      FROM momu_programs
      WHERE isActive = 1
      ORDER BY programSeq
    `, [deviceSeq]);

    await client.query(`
      INSERT INTO momu_device_program_settings
        (id, deviceSeq, config)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        config = VALUES(config),
        updatedAt = CURRENT_TIMESTAMP
    `, [id, deviceSeq, JSON.stringify(defaultConfig)]);

    if (ownsConnection) await client.commit();
    return {
      device: {
        deviceSeq,
        deviceName,
        deviceAlias,
        serialNumber,
        status,
        createdAt,
      },
      defaultConfig,
    };
  } catch (error) {
    if (ownsConnection) {
      try {
        await client.rollback();
      } catch (rollbackError) {
        console.error('[MOMU DEVICE] transaction rollback failed', {
          code: rollbackError.code || 'ROLLBACK_ERROR',
        });
      }
    }
    throw error;
  } finally {
    if (ownsConnection) client.release();
  }
}

module.exports = { formatDeviceCreatedAt, registerMomuDevice };
