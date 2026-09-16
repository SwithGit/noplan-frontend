const express = require('express');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../../config/s3');

const router = express.Router();
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;
const ALLOWED_KEY_PREFIXES = Object.freeze([
  'Momu/'
]);

const getStorageConfig = () => {
  const bucket = String(
    process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || ''
  ).trim();
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET is required.');
  }
  return { bucket };
};

const isAllowedObjectKey = (objectKey) => (
  objectKey.length <= 1024 &&
  !objectKey.includes('\0') &&
  ALLOWED_KEY_PREFIXES.some((prefix) => objectKey.startsWith(prefix))
);

router.get('/file', async (req, res) => {
  const objectKey = typeof req.query.key === 'string'
    ? req.query.key.trim()
    : '';
  if (!objectKey || !isAllowedObjectKey(objectKey)) {
    return res.status(400).json({
      success: false,
      message: '허용된 S3 파일 key가 필요합니다.'
    });
  }

  try {
    const { bucket } = getStorageConfig();
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn: DOWNLOAD_URL_TTL_SECONDS }
    );
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, downloadUrl);
  } catch (error) {
    console.error('MOMU storage download signing error:', error);
    return res.status(503).json({
      success: false,
      message: '파일 다운로드 URL을 생성하지 못했습니다.'
    });
  }
});

module.exports = router;
