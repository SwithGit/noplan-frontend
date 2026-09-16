const crypto = require('crypto');
const {
  ListObjectsV2Command,
  DeleteObjectsCommand
} = require('@aws-sdk/client-s3');
const db = require('../../config/db');
const s3 = require('../../config/s3');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_FOLDER_PATTERN =
  /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;

let cleanupWorkerStarted = false;

const getKstDate = (date) => new Date(date.getTime() + KST_OFFSET_MS);

const formatUtcDate = (date) => date.toISOString().slice(0, 10);

const getKstWeekRange = (now = new Date()) => {
  const kst = getKstDate(now);
  const localDate = new Date(Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate()
  ));
  const start = new Date(localDate);
  start.setUTCDate(start.getUTCDate() - localDate.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  return {
    startDate: formatUtcDate(start),
    endDate: formatUtcDate(end),
    folderName: `${formatUtcDate(start)}_${formatUtcDate(end)}`
  };
};

const sanitizeFolderSegment = (value, fallback) => {
  const sanitized = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80);
  return sanitized || fallback;
};

const createRequestError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveUploadFolderIdentity = (request) => new Promise(
  (resolve, reject) => {
    const administratorId = String(
      request.get('X-Momu-Administrator-Id') || ''
    ).trim();
    const deviceSeq = Number.parseInt(
      request.get('X-Momu-Device-Seq'),
      10
    );

    if (!administratorId || !Number.isInteger(deviceSeq) || deviceSeq < 1) {
      reject(createRequestError(
        400,
        'X-Momu-Administrator-Id and X-Momu-Device-Seq are required.'
      ));
      return;
    }

    db.query(`
      SELECT COALESCE(
        NULLIF(deviceAlias, ''),
        NULLIF(deviceName, ''),
        CONCAT('Device-', deviceSeq)
      ) AS resolvedDeviceName
      FROM momu_devices
      WHERE id = ? AND deviceSeq = ?
      LIMIT 1
    `, [administratorId, deviceSeq], (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      if (!rows || rows.length === 0) {
        reject(createRequestError(
          404,
          'The registered MOMU device was not found.'
        ));
        return;
      }

      const accountFolder = sanitizeFolderSegment(
        administratorId,
        'unknown-account'
      );
      const deviceName = sanitizeFolderSegment(
        rows[0].resolvedDeviceName,
        `Device-${deviceSeq}`
      );
      const deviceFolder =
        `${String(deviceSeq).padStart(3, '0')}_${deviceName}`;

      resolve({
        administratorId,
        deviceSeq,
        deviceName: rows[0].resolvedDeviceName,
        folderSegments: [accountFolder, deviceFolder]
      });
    });
  }
);

const createWeeklyObjectKey = (
  config,
  extension,
  now = new Date(),
  folderSegments = []
) => {
  const week = getKstWeekRange(now);
  const kstTimestamp = getKstDate(now)
    .toISOString()
    .slice(0, 23)
    .replace(/[-:.T]/g, '');
  const randomPart = crypto.randomBytes(6).toString('hex');

  const identityPath = folderSegments.length > 0
    ? `${folderSegments.join('/')}/`
    : '';

  return `${config.keyPrefix}/${identityPath}${week.folderName}/` +
    `${kstTimestamp}-${randomPart}.${extension}`;
};

const getS3Config = () => {
  const config = {
    region: process.env.AWS_REGION || 'ap-northeast-2',
    bucket:
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET,
    prefixes: [
      process.env.AWS_S3_HERE_MY_PHOTO_PREFIX ||
        'momu/here-my-photo',
      process.env.AWS_S3_VIVID_FRIENDS_PREFIX ||
        'momu/vivid-friends/completed'
    ].map((value) => value.replace(/^\/+|\/+$/g, ''))
  };

  if (!config.bucket) {
    throw new Error(
      'Weekly image cleanup requires an S3 bucket setting.'
    );
  }

  return config;
};

const isExpiredWeekFolder = (folderName, todayKst) => {
  const match = WEEK_FOLDER_PATTERN.exec(folderName);
  if (!match) return false;
  return match[2] < todayKst;
};

const listExpiredKeys = async (client, bucket, prefix, now) => {
  const todayKst = getKstDate(now).toISOString().slice(0, 10);
  const expiredKeys = [];
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${prefix}/`,
      ContinuationToken: continuationToken
    }));

    for (const object of response.Contents || []) {
      const key = object.Key || '';
      const relativeKey = key.slice(prefix.length + 1);
      const weekFolder = relativeKey
        .split('/')
        .find((segment) => WEEK_FOLDER_PATTERN.test(segment));
      if (isExpiredWeekFolder(weekFolder, todayKst)) {
        expiredKeys.push(key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return expiredKeys;
};

const deleteKeys = async (client, bucket, keys) => {
  let deletedCount = 0;
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    const response = await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: batch.map((Key) => ({ Key })),
        Quiet: true
      }
    }));

    if (response.Errors && response.Errors.length > 0) {
      throw new Error(
        `S3 weekly cleanup failed for ${response.Errors.length} object(s).`
      );
    }
    deletedCount += batch.length;
  }
  return deletedCount;
};

const cleanupExpiredCompletedImages = async (now = new Date()) => {
  const config = getS3Config();

  let totalDeleted = 0;
  for (const prefix of [...new Set(config.prefixes)]) {
    const expiredKeys = await listExpiredKeys(
      s3,
      config.bucket,
      prefix,
      now
    );
    totalDeleted += await deleteKeys(s3, config.bucket, expiredKeys);
  }

  console.log(
    `[MOMU WEEKLY IMAGE CLEANUP] deleted=${totalDeleted}, ` +
    `currentWeek=${getKstWeekRange(now).folderName}`
  );
  return totalDeleted;
};

const millisecondsUntilNextKstSunday = (now = new Date()) => {
  const kst = getKstDate(now);
  const nextSunday = new Date(Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate(),
    0,
    0,
    0,
    0
  ));
  const daysUntilSunday = (7 - kst.getUTCDay()) % 7 || 7;
  nextSunday.setUTCDate(nextSunday.getUTCDate() + daysUntilSunday);
  return Math.max(1000, nextSunday.getTime() - kst.getTime());
};

const runCleanupSafely = async () => {
  try {
    await cleanupExpiredCompletedImages();
  } catch (error) {
    console.error('[MOMU WEEKLY IMAGE CLEANUP FAILED]', error);
  }
};

const scheduleNextCleanup = () => {
  const timer = setTimeout(async () => {
    await runCleanupSafely();
    scheduleNextCleanup();
  }, millisecondsUntilNextKstSunday());
  timer.unref?.();
};

const startWeeklyCompletedImageCleanupWorker = () => {
  if (cleanupWorkerStarted) return;
  cleanupWorkerStarted = true;

  const startupTimer = setTimeout(runCleanupSafely, 5000);
  startupTimer.unref?.();
  scheduleNextCleanup();
};

module.exports = {
  getKstWeekRange,
  resolveUploadFolderIdentity,
  createWeeklyObjectKey,
  cleanupExpiredCompletedImages,
  startWeeklyCompletedImageCleanupWorker
};
