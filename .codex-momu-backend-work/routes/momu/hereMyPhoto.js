const express = require('express');
const {
  GetObjectCommand,
  PutObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../../config/s3');
const { createQrDownloadLink } = require('../../services/qrDownloadLinks');
const {
  createWeeklyObjectKey,
  resolveUploadFolderIdentity
} = require('./weeklyCompletedImages');

const router = express.Router();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

const getS3Config = () => {
  const config = {
    region: process.env.AWS_REGION || 'ap-northeast-2',
    bucket:
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET,
    keyPrefix: (process.env.AWS_S3_HERE_MY_PHOTO_PREFIX ||
      'momu/here-my-photo').replace(/^\/+|\/+$/g, '')
  };

  const missing = [];
  if (!config.bucket) {
    missing.push('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET');
  }

  if (missing.length > 0) {
    throw new Error(`Missing S3 environment variables: ${missing.join(', ')}`);
  }

  return config;
};

const putObject = (config, objectKey, contentType, body) => s3.send(
  new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    Body: body,
    ContentLength: body.length,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  })
);

const createPresignedDownloadUrl = async (
  config,
  objectKey,
  now,
  expiresInSeconds = DOWNLOAD_URL_TTL_SECONDS
) => {
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ResponseContentDisposition:
        `attachment; filename="HereMyPhoto-${dateStamp}.png"`,
      ResponseContentType: 'image/png'
    }),
    { expiresIn: expiresInSeconds }
  );
};

router.get('/health', (req, res) => {
  try {
    const config = getS3Config();
    return res.json({
      success: true,
      bucket: config.bucket,
      region: config.region
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: error.message
    });
  }
});

router.post(
  '/upload',
  express.raw({
    type: ['image/png', 'image/jpeg'],
    limit: MAX_UPLOAD_BYTES
  }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'PNG or JPEG image body is required.'
        });
      }

      const contentType = req.get('Content-Type') === 'image/jpeg'
        ? 'image/jpeg'
        : 'image/png';
      const extension = contentType === 'image/jpeg' ? 'jpg' : 'png';
      const config = getS3Config();
      const now = new Date();
      const identity = await resolveUploadFolderIdentity(req);
      const objectKey = createWeeklyObjectKey(
        config,
        extension,
        now,
        identity.folderSegments
      );

      await putObject(config, objectKey, contentType, req.body);

      const downloadUrl = await createPresignedDownloadUrl(
        config,
        objectKey,
        now
      );
      const qrLink = await createQrDownloadLink({
        objectKey,
        downloadName: `HereMyPhoto-${now.toISOString().slice(0, 10).replace(/-/g, '')}.${extension}`,
        contentType
      });

      return res.json({
        success: true,
        key: objectKey,
        downloadUrl,
        qrUrl: qrLink.qrUrl,
        expiresInSeconds: qrLink.expiresInSeconds,
        createdAt: now.toISOString()
      });
    } catch (error) {
      console.error('HereMyPhoto upload error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: 'Image upload failed.',
        detail: error.message
      });
    }
  }
);

module.exports = router;
