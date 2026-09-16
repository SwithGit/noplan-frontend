const crypto = require('crypto');
const express = require('express');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const db = require('../../config/db');
const s3 = require('../../config/s3');

const router = express.Router();

const PRESIGNED_UPLOAD_TTL_SECONDS = 15 * 60;
const PRESIGNED_DOWNLOAD_TTL_SECONDS = 60 * 60;
const MB = 1024 * 1024;

const IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);
const COMPANY_LOGO_CONTENT_TYPES = new Set([
  ...IMAGE_CONTENT_TYPES,
  'image/gif'
]);
const AUDIO_CONTENT_TYPES = new Set([
  'audio/aac',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav'
]);
const VIDEO_CONTENT_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v'
]);

const CATEGORY_RULES = Object.freeze({
  'vivid-background-image': {
    path: 'vivid-friends/background',
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: 20 * MB
  },
  'vivid-background-music': {
    path: 'vivid-friends/bgm',
    contentTypes: AUDIO_CONTENT_TYPES,
    maxBytes: 100 * MB
  },
  'vivid-sound-effect': {
    path: 'vivid-friends/sound-effect',
    contentTypes: AUDIO_CONTENT_TYPES,
    maxBytes: 100 * MB
  },
  'vivid-drawing-list': {
    path: 'vivid-friends/drawings',
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: 20 * MB
  },
  'immersive-title-image': {
    path: 'immersive-library/title',
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: 20 * MB
  },
  'immersive-projection-media': {
    path: 'immersive-library/projection',
    contentTypes: VIDEO_CONTENT_TYPES,
    maxBytes: 500 * MB
  },
  'immersive-card-image': {
    path: 'immersive-library/cards',
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: 20 * MB
  },
  'here-my-photo-background-image': {
    path: 'here-my-photo/background',
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: 20 * MB
  },
  'here-my-photo-background-music': {
    path: 'here-my-photo/bgm',
    contentTypes: AUDIO_CONTENT_TYPES,
    maxBytes: 100 * MB
  },
  'here-my-photo-sound-effect': {
    path: 'here-my-photo/sound-effect',
    contentTypes: AUDIO_CONTENT_TYPES,
    maxBytes: 100 * MB
  },
  'here-my-photo-sticker': {
    path: 'here-my-photo/stickers',
    contentTypes: IMAGE_CONTENT_TYPES,
    maxBytes: 20 * MB
  },
  'company-logo': {
    path: 'company-logo',
    contentTypes: COMPANY_LOGO_CONTENT_TYPES,
    maxBytes: 500 * MB,
    accountScoped: true
  }
});

const EXTENSION_BY_CONTENT_TYPE = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v'
});

const isPositiveInteger = (value) => (
  Number.isInteger(Number(value)) && Number(value) > 0
);
const OWNER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/;
const COMPANY_LOGO_RATE_WINDOW_MS = 15 * 60 * 1000;
const COMPANY_LOGO_RATE_LIMIT = 20;
const companyLogoPresignAttempts = new Map();

const isValidOwnerId = (value) => (
  OWNER_ID_PATTERN.test(String(value || '').trim())
);

const consumeCompanyLogoPresignQuota = (key, now = Date.now()) => {
  const attempts = (companyLogoPresignAttempts.get(key) || [])
    .filter((timestamp) => (
      now - timestamp < COMPANY_LOGO_RATE_WINDOW_MS
    ));

  if (attempts.length >= COMPANY_LOGO_RATE_LIMIT) {
    companyLogoPresignAttempts.set(key, attempts);
    return false;
  }

  attempts.push(now);
  companyLogoPresignAttempts.set(key, attempts);
  return true;
};

const encodeRfc3986 = (value) => encodeURIComponent(value)
  .replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));

const encodeObjectKey = (key) => key
  .split('/')
  .map(encodeRfc3986)
  .join('/');

const getS3Config = () => {
  const config = {
    region: process.env.AWS_REGION || 'ap-northeast-2',
    bucket:
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET,
    keyPrefix: (
      process.env.AWS_S3_MOMU_ASSET_PREFIX ||
      'momu/assets'
    ).replace(/^\/+|\/+$/g, ''),
    publicAssetBaseUrl: (
      process.env.MOMU_ASSET_PUBLIC_BASE_URL || ''
    ).replace(/\/+$/g, '')
  };

  const missing = [];
  if (!config.bucket) {
    missing.push('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing S3 environment variables: ${missing.join(', ')}`
    );
  }

  return config;
};

const createPresignedS3Url = async ({
  config,
  method,
  objectKey,
  contentType,
  expiresInSeconds
}) => {
  const command = method === 'PUT'
    ? new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ContentType: contentType,
      ServerSideEncryption: 'AES256'
    })
    : new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey
    });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
};

const cleanPathSegment = (value, fallback) => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
};

const cleanFileName = (value) => String(value || '')
  .trim()
  .replace(/[\u0000-\u001F\u007F]/g, '')
  .replace(/[\\/]/g, '_')
  .slice(0, 255);

const cleanObjectFileName = (value, extension) => {
  const cleaned = cleanFileName(value)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  if (!cleaned) {
    return `file.${extension}`;
  }

  const withoutExtension = cleaned.replace(/\.[^.]+$/, '');
  return `${withoutExtension || 'file'}.${extension}`;
};

const createObjectKey = ({
  config,
  id,
  deviceSeq,
  category,
  categoryRule,
  scope,
  fileName,
  contentType
}) => {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  const owner = cleanPathSegment(id, 'owner');
  const resourceCategory = cleanPathSegment(
    category,
    categoryRule.path
  );
  const uniqueName = crypto.randomUUID();

  if (categoryRule.accountScoped) {
    return [
      config.keyPrefix,
      owner,
      resourceCategory,
      `${uniqueName}-${cleanObjectFileName(fileName, extension)}`
    ].join('/');
  }

  const keySegments = [
    config.keyPrefix,
    owner,
    String(deviceSeq),
    resourceCategory
  ];
  if (String(scope || '').trim()) {
    keySegments.push(cleanPathSegment(scope, 'scope'));
  }
  keySegments.push(`${uniqueName}.${extension}`);
  return keySegments.join('/');
};

const getRequestBaseUrl = (req) => {
  const configured = (
    process.env.MOMU_PUBLIC_API_BASE_URL || ''
  ).replace(/\/+$/g, '');
  if (configured) return configured;

  const forwardedProtocol = String(
    req.get('x-forwarded-proto') || ''
  ).split(',')[0].trim();
  const protocol = forwardedProtocol || req.protocol || 'https';
  return `${protocol}://${req.get('host')}`;
};

const createStableFileUrl = (
  req,
  config,
  objectKey,
  assetSeq
) => {
  if (config.publicAssetBaseUrl) {
    return `${config.publicAssetBaseUrl}/` +
      encodeObjectKey(objectKey);
  }

  return `${getRequestBaseUrl(req)}` +
    `/api/momu/upload/file/${assetSeq}`;
};

const findOwnedDevice = (id, deviceSeq, callback) => {
  const sql = `
    SELECT deviceSeq
    FROM momu_devices
    WHERE id = ? AND deviceSeq = ?
    LIMIT 1
  `;
  db.query(sql, [id, deviceSeq], (error, rows) => {
    if (error) return callback(error);
    return callback(null, rows[0] || null);
  });
};

const findOwnedAsset = (
  id,
  assetSeq,
  callback
) => {
  const sql = `
    SELECT
      assetSeq,
      id,
      deviceSeq,
      category,
      objectKey,
      fileUrl,
      originalFileName,
      contentType,
      fileSize,
      status
    FROM momu_assets
    WHERE id = ?
      AND assetSeq = ?
    LIMIT 1
  `;
  db.query(
    sql,
    [id, assetSeq],
    (error, rows) => {
      if (error) return callback(error);
      return callback(null, rows[0] || null);
    }
  );
};

/**
 * @swagger
 * components:
 *   schemas:
 *     MomuUploadPresignRequest:
 *       type: object
 *       required:
 *         - id
 *         - category
 *         - fileName
 *         - contentType
 *         - fileSize
 *       properties:
 *         id:
 *           type: string
 *           description: 업로드 소유자 로그인 ID. company-logo는 회원가입 전 ID도 허용합니다.
 *           example: admin2
 *         deviceSeq:
 *           type: integer
 *           nullable: true
 *           description: 디바이스 콘텐츠는 필수, company-logo는 생략합니다.
 *           example: 3
 *         category:
 *           type: string
 *           description: 업로드 파일 종류
 *           enum:
 *             - vivid-background-image
 *             - vivid-background-music
 *             - vivid-sound-effect
 *             - vivid-drawing-list
 *             - immersive-title-image
 *             - immersive-projection-media
 *             - immersive-card-image
 *             - here-my-photo-background-image
 *             - here-my-photo-background-music
 *             - here-my-photo-sound-effect
 *             - here-my-photo-sticker
 *             - company-logo
 *           example: company-logo
 *         fileName:
 *           type: string
 *           example: museum-logo.png
 *         contentType:
 *           type: string
 *           example: image/png
 *         fileSize:
 *           type: integer
 *           format: int64
 *           description: 파일 크기(byte)
 *           example: 123456
 *         scope:
 *           type: string
 *           nullable: true
 *           description: Immersive Library 콘텐츠 ID 등 하위 리소스 구분값
 *           example: content-1
 *     MomuUploadPresignResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         assetSeq:
 *           type: integer
 *           example: 21
 *         key:
 *           type: string
 *           example: momu/assets/admin2/company-logo/uuid-museum-logo.png
 *         uploadUrl:
 *           type: string
 *           format: uri
 *           description: 브라우저가 파일 원문을 PUT할 S3 Presigned URL
 *         fileUrl:
 *           type: string
 *           format: uri
 *           description: complete 이후 CMS와 Unity에서 저장할 안정적인 파일 URL
 *           example: http://3.34.11.90:3000/api/momu/upload/file/21
 *         expiresInSeconds:
 *           type: integer
 *           example: 900
 *         maxBytes:
 *           type: integer
 *           format: int64
 *           example: 524288000
 *         requiredHeaders:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           example:
 *             Content-Type: image/png
 *             x-amz-server-side-encryption: AES256
 *     MomuUploadAssetRequest:
 *       type: object
 *       required:
 *         - id
 *         - assetSeq
 *       properties:
 *         id:
 *           type: string
 *           example: admin2
 *         deviceSeq:
 *           type: integer
 *           nullable: true
 *           description: 디바이스 콘텐츠는 필수, company-logo는 생략합니다.
 *           example: 3
 *         assetSeq:
 *           type: integer
 *           example: 21
 *     MomuUploadAssetResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         assetSeq:
 *           type: integer
 *           example: 21
 *         key:
 *           type: string
 *           example: momu/assets/admin2/company-logo/uuid-museum-logo.png
 *         fileUrl:
 *           type: string
 *           format: uri
 *           example: http://3.34.11.90:3000/api/momu/upload/file/21
 *         fileName:
 *           type: string
 *           example: museum-logo.png
 *         contentType:
 *           type: string
 *           example: image/png
 *         fileSize:
 *           type: integer
 *           format: int64
 *           example: 123456
 *     MomuUploadError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: 요청을 처리하지 못했습니다.
 *
 * /api/momu/upload/health:
 *   get:
 *     summary: MOMU S3 직접 업로드 설정 확인
 *     description: S3 환경변수와 직접 업로드 사용 가능 여부를 확인합니다.
 *     tags:
 *       - Momu Upload
 *     responses:
 *       '200':
 *         description: 업로드 설정 정상
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 bucket:
 *                   type: string
 *                   example: viaunity
 *                 region:
 *                   type: string
 *                   example: ap-northeast-2
 *                 directUpload:
 *                   type: boolean
 *                   example: true
 *                 publicAssetBaseUrlConfigured:
 *                   type: boolean
 *                   example: false
 *       '503':
 *         description: S3 환경변수 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MomuUploadError'
 *
 * /api/momu/upload/presign:
 *   post:
 *     summary: S3 직접 업로드 URL 발급
 *     description: |
 *       파일 메타데이터를 등록하고 S3 PUT용 Presigned URL을 발급합니다.
 *       company-logo는 계정 단위 파일이므로 deviceSeq와 scope를 보내지 않습니다.
 *       나머지 디바이스 콘텐츠 category는 deviceSeq가 필수입니다.
 *     tags:
 *       - Momu Upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MomuUploadPresignRequest'
 *           examples:
 *             companyLogo:
 *               summary: 회사/기관 로고
 *               value:
 *                 id: admin2
 *                 category: company-logo
 *                 fileName: museum-logo.png
 *                 contentType: image/png
 *                 fileSize: 123456
 *             deviceContent:
 *               summary: VividFriends 배경 이미지
 *               value:
 *                 id: admin2
 *                 deviceSeq: 3
 *                 category: vivid-background-image
 *                 fileName: background.png
 *                 contentType: image/png
 *                 fileSize: 123456
 *     responses:
 *       '200':
 *         description: Presigned URL 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MomuUploadPresignResponse'
 *       '400':
 *         description: 필수값, ID 형식 또는 category 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MomuUploadError'
 *       '404':
 *         description: 소유한 디바이스를 찾을 수 없음
 *       '413':
 *         description: category별 허용 용량 초과
 *       '415':
 *         description: 디바이스 콘텐츠에서 지원하지 않는 MIME Type
 *       '429':
 *         description: 회사 로고 업로드 요청 횟수 제한 초과
 *       '500':
 *         description: 파일 메타데이터 생성 실패
 *       '503':
 *         description: S3 설정 오류
 *
 * /api/momu/upload/complete:
 *   post:
 *     summary: S3 직접 업로드 완료 처리
 *     description: |
 *       S3 HeadObject로 실제 파일의 존재, 크기와 MIME Type을 확인한 뒤
 *       asset 상태를 completed로 변경합니다. 동일 요청은 멱등 처리됩니다.
 *     tags:
 *       - Momu Upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MomuUploadAssetRequest'
 *           examples:
 *             companyLogo:
 *               value:
 *                 id: admin2
 *                 assetSeq: 21
 *             deviceContent:
 *               value:
 *                 id: admin2
 *                 deviceSeq: 3
 *                 assetSeq: 22
 *     responses:
 *       '200':
 *         description: 업로드 완료 또는 기존 완료 결과 반환
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MomuUploadAssetResponse'
 *       '400':
 *         description: 필수값 또는 deviceSeq 오류
 *       '404':
 *         description: 소유한 asset을 찾을 수 없음
 *       '409':
 *         description: S3 파일 검증 실패
 *       '500':
 *         description: 완료 상태 저장 실패
 *
 * /api/momu/upload/file/{assetSeq}:
 *   get:
 *     summary: 완료된 업로드 파일 조회
 *     description: Public CDN URL 또는 만료 시간이 있는 S3 GET URL로 리다이렉트합니다.
 *     tags:
 *       - Momu Upload
 *     parameters:
 *       - in: path
 *         name: assetSeq
 *         required: true
 *         schema:
 *           type: integer
 *         example: 21
 *     responses:
 *       '302':
 *         description: 파일 URL로 리다이렉트
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               format: uri
 *       '400':
 *         description: 잘못된 assetSeq
 *       '404':
 *         description: 완료된 파일을 찾을 수 없음
 *       '503':
 *         description: 다운로드 URL 생성 실패
 *
 * /api/momu/upload/delete:
 *   post:
 *     summary: S3 업로드 파일 삭제
 *     description: S3 객체를 삭제하고 asset 상태를 deleted로 변경합니다.
 *     tags:
 *       - Momu Upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MomuUploadAssetRequest'
 *     responses:
 *       '200':
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 assetSeq:
 *                   type: integer
 *                   example: 21
 *                 message:
 *                   type: string
 *                   example: 파일을 삭제했습니다.
 *       '400':
 *         description: 필수값 또는 deviceSeq 오류
 *       '404':
 *         description: 소유한 파일을 찾을 수 없음
 *       '500':
 *         description: 삭제 상태 저장 실패
 *       '502':
 *         description: S3 객체 삭제 실패
 */
router.get('/health', (req, res) => {
  try {
    const config = getS3Config();
    return res.json({
      success: true,
      bucket: config.bucket,
      region: config.region,
      directUpload: true,
      publicAssetBaseUrlConfigured:
        Boolean(config.publicAssetBaseUrl)
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/presign', (req, res) => {
  const {
    id,
    deviceSeq,
    category,
    fileName,
    contentType,
    fileSize,
    scope
  } = req.body || {};
  const normalizedId = String(id || '').trim();
  const parsedDeviceSeq = Number(deviceSeq);
  const parsedFileSize = Number(fileSize);
  const categoryRule = CATEGORY_RULES[category];
  const isAccountScoped = Boolean(categoryRule?.accountScoped);
  const normalizedContentType = String(contentType || '')
    .trim()
    .toLowerCase();
  const normalizedFileName = cleanFileName(fileName);

  if (!categoryRule) {
    return res.status(400).json({
      success: false,
      message: '지원하지 않는 업로드 category입니다.'
    });
  }
  if (!normalizedId) {
    return res.status(400).json({
      success: false,
      message: 'id가 필요합니다.'
    });
  }
  if (isAccountScoped && !isValidOwnerId(normalizedId)) {
    return res.status(400).json({
      success: false,
      message:
        'id는 영문 또는 숫자로 시작하는 3~50자의 영문, 숫자, -, _만 사용할 수 있습니다.'
    });
  }
  if (!isAccountScoped && !isPositiveInteger(parsedDeviceSeq)) {
    return res.status(400).json({
      success: false,
      message: 'id와 올바른 deviceSeq가 필요합니다.'
    });
  }
  if (!categoryRule.contentTypes.has(normalizedContentType)) {
    return res.status(isAccountScoped ? 400 : 415).json({
      success: false,
      message: '이 항목에서 지원하지 않는 파일 형식입니다.'
    });
  }
  if (
    !isPositiveInteger(parsedFileSize) ||
    parsedFileSize > categoryRule.maxBytes
  ) {
    return res.status(413).json({
      success: false,
      message:
        `파일 크기는 최대 ${categoryRule.maxBytes / MB}MB입니다.`
    });
  }
  if (!normalizedFileName) {
    return res.status(400).json({
      success: false,
      message: '파일명을 확인할 수 없습니다.'
    });
  }
  if (
    isAccountScoped &&
    !consumeCompanyLogoPresignQuota(
      `${req.ip || 'unknown'}:${normalizedId}`
    )
  ) {
    return res.status(429).json({
      success: false,
      message: '업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    });
  }

  const createPendingAsset = () => {
    let config;
    try {
      config = getS3Config();
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: error.message
      });
    }

    const storedDeviceSeq = isAccountScoped
      ? null
      : parsedDeviceSeq;
    const objectKey = createObjectKey({
      config,
      id: normalizedId,
      deviceSeq: storedDeviceSeq,
      category,
      categoryRule,
      scope,
      fileName: normalizedFileName,
      contentType: normalizedContentType
    });
    const insertSql = `
      INSERT INTO momu_assets
        (
          id,
          deviceSeq,
          category,
          objectKey,
          fileUrl,
          originalFileName,
          contentType,
          fileSize,
          status
        )
      VALUES (?, ?, ?, ?, '', ?, ?, ?, 'pending')
    `;

    db.query(
      insertSql,
      [
        normalizedId,
        storedDeviceSeq,
        category,
        objectKey,
        normalizedFileName,
        normalizedContentType,
        parsedFileSize
      ],
      (insertError, insertResult) => {
        if (insertError) {
          console.error('MOMU asset insert error:', insertError);
          return res.status(500).json({
            success: false,
            message: '업로드 파일 정보를 생성하지 못했습니다.'
          });
        }

        const assetSeq = insertResult.insertId;
        const fileUrl = createStableFileUrl(
          req,
          config,
          objectKey,
          assetSeq
        );
        const updateSql = `
          UPDATE momu_assets
          SET fileUrl = ?
          WHERE assetSeq = ?
        `;

        db.query(
          updateSql,
          [fileUrl, assetSeq],
          async (updateError) => {
            if (updateError) {
              console.error(
                'MOMU asset URL update error:',
                updateError
              );
              return res.status(500).json({
                success: false,
                message: '업로드 파일 URL을 생성하지 못했습니다.'
              });
            }

            let uploadUrl;
            try {
              uploadUrl = await createPresignedS3Url({
                config,
                method: 'PUT',
                objectKey,
                contentType: normalizedContentType,
                expiresInSeconds:
                  PRESIGNED_UPLOAD_TTL_SECONDS
              });
            } catch (signError) {
              console.error('MOMU asset upload signing error:', signError);
              return res.status(503).json({
                success: false,
                message: 'S3 업로드 URL을 생성하지 못했습니다.'
              });
            }

            return res.json({
              success: true,
              assetSeq,
              key: objectKey,
              uploadUrl,
              fileUrl,
              expiresInSeconds:
                PRESIGNED_UPLOAD_TTL_SECONDS,
              maxBytes: categoryRule.maxBytes,
              requiredHeaders: {
                'Content-Type': normalizedContentType,
                'x-amz-server-side-encryption': 'AES256'
              }
            });
          }
        );
      }
    );
  };

  if (isAccountScoped) {
    createPendingAsset();
    return;
  }

  findOwnedDevice(
    normalizedId,
    parsedDeviceSeq,
    (deviceError, device) => {
      if (deviceError) {
        console.error('MOMU asset device lookup error:', deviceError);
        return res.status(500).json({
          success: false,
          message: '디바이스 정보를 확인하지 못했습니다.'
        });
      }
      if (!device) {
        return res.status(404).json({
          success: false,
          message: '해당 디바이스를 찾을 수 없습니다.'
        });
      }

      createPendingAsset();
    }
  );
});

router.post('/complete', (req, res) => {
  const { id, deviceSeq, assetSeq } = req.body || {};
  const normalizedId = String(id || '').trim();
  const parsedDeviceSeq = Number(deviceSeq);
  const parsedAssetSeq = Number(assetSeq);

  if (
    !normalizedId ||
    !isPositiveInteger(parsedAssetSeq)
  ) {
    return res.status(400).json({
      success: false,
      message: 'id와 assetSeq가 필요합니다.'
    });
  }

  findOwnedAsset(
    normalizedId,
    parsedAssetSeq,
    async (findError, asset) => {
      if (findError) {
        console.error('MOMU asset lookup error:', findError);
        return res.status(500).json({
          success: false,
          message: '업로드 파일 정보를 확인하지 못했습니다.'
        });
      }
      if (!asset || asset.status === 'deleted') {
        return res.status(404).json({
          success: false,
          message: '업로드 파일 정보를 찾을 수 없습니다.'
        });
      }
      if (
        asset.category !== 'company-logo' &&
        !isPositiveInteger(parsedDeviceSeq)
      ) {
        return res.status(400).json({
          success: false,
          message: '이 업로드에는 deviceSeq가 필요합니다.'
        });
      }
      if (
        asset.category !== 'company-logo' &&
        Number(asset.deviceSeq) !== parsedDeviceSeq
      ) {
        return res.status(404).json({
          success: false,
          message: '업로드 파일 정보를 찾을 수 없습니다.'
        });
      }
      if (asset.status === 'completed') {
        return res.json({
          success: true,
          assetSeq: asset.assetSeq,
          key: asset.objectKey,
          fileUrl: asset.fileUrl,
          fileName: asset.originalFileName,
          contentType: asset.contentType,
          fileSize: Number(asset.fileSize)
        });
      }

      let config;
      try {
        config = getS3Config();
        const head = await s3.send(new HeadObjectCommand({
          Bucket: config.bucket,
          Key: asset.objectKey
        }));
        const uploadedSize = Number(head.ContentLength);
        const expectedSize = Number(asset.fileSize);

        if (uploadedSize !== expectedSize) {
          return res.status(409).json({
            success: false,
            message:
              '업로드된 파일 크기가 원본과 일치하지 않습니다.'
          });
        }
        if (
          head.ContentType &&
          head.ContentType !== asset.contentType
        ) {
          return res.status(409).json({
            success: false,
            message:
              '업로드된 파일 형식이 요청과 일치하지 않습니다.'
          });
        }
      } catch (error) {
        console.error('MOMU asset S3 verification error:', error);
        return res.status(409).json({
          success: false,
          message:
            'S3 업로드 완료 여부를 확인하지 못했습니다.'
        });
      }

      const updateSql = `
        UPDATE momu_assets
        SET status = 'completed',
            updatedAt = CURRENT_TIMESTAMP
        WHERE assetSeq = ?
          AND status = 'pending'
      `;
      db.query(updateSql, [parsedAssetSeq], (updateError) => {
        if (updateError) {
          console.error(
            'MOMU asset completion update error:',
            updateError
          );
          return res.status(500).json({
            success: false,
            message: '업로드 완료 상태를 저장하지 못했습니다.'
          });
        }

        return res.json({
          success: true,
          assetSeq: asset.assetSeq,
          key: asset.objectKey,
          fileUrl: asset.fileUrl,
          fileName: asset.originalFileName,
          contentType: asset.contentType,
          fileSize: Number(asset.fileSize)
        });
      });
    }
  );
});

router.get('/file/:assetSeq', (req, res) => {
  const assetSeq = Number(req.params.assetSeq);
  if (!isPositiveInteger(assetSeq)) {
    return res.status(400).json({
      success: false,
      message: '올바른 assetSeq가 필요합니다.'
    });
  }

  const sql = `
    SELECT objectKey, fileUrl, contentType, status
    FROM momu_assets
    WHERE assetSeq = ?
    LIMIT 1
  `;
  db.query(sql, [assetSeq], async (error, rows) => {
    if (error) {
      console.error('MOMU public asset lookup error:', error);
      return res.status(500).json({
        success: false,
        message: '파일 정보를 확인하지 못했습니다.'
      });
    }

    const asset = rows[0];
    if (!asset || asset.status !== 'completed') {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.'
      });
    }

    try {
      const config = getS3Config();
      if (config.publicAssetBaseUrl) {
        return res.redirect(302, asset.fileUrl);
      }

      const downloadUrl = await createPresignedS3Url({
        config,
        method: 'GET',
        objectKey: asset.objectKey,
        contentType: asset.contentType,
        expiresInSeconds:
          PRESIGNED_DOWNLOAD_TTL_SECONDS
      });
      res.set('Cache-Control', 'no-store');
      return res.redirect(302, downloadUrl);
    } catch (signError) {
      console.error('MOMU asset download signing error:', signError);
      return res.status(503).json({
        success: false,
        message: '파일 다운로드 URL을 생성하지 못했습니다.'
      });
    }
  });
});

router.post('/delete', (req, res) => {
  const { id, deviceSeq, assetSeq } = req.body || {};
  const normalizedId = String(id || '').trim();
  const parsedDeviceSeq = Number(deviceSeq);
  const parsedAssetSeq = Number(assetSeq);

  if (
    !normalizedId ||
    !isPositiveInteger(parsedAssetSeq)
  ) {
    return res.status(400).json({
      success: false,
      message: 'id와 assetSeq가 필요합니다.'
    });
  }

  findOwnedAsset(
    normalizedId,
    parsedAssetSeq,
    async (findError, asset) => {
      if (findError) {
        console.error('MOMU asset delete lookup error:', findError);
        return res.status(500).json({
          success: false,
          message: '삭제할 파일 정보를 확인하지 못했습니다.'
        });
      }
      if (!asset || asset.status === 'deleted') {
        return res.status(404).json({
          success: false,
          message: '삭제할 파일을 찾을 수 없습니다.'
        });
      }
      if (
        asset.category !== 'company-logo' &&
        !isPositiveInteger(parsedDeviceSeq)
      ) {
        return res.status(400).json({
          success: false,
          message: '이 업로드에는 deviceSeq가 필요합니다.'
        });
      }
      if (
        asset.category !== 'company-logo' &&
        Number(asset.deviceSeq) !== parsedDeviceSeq
      ) {
        return res.status(404).json({
          success: false,
          message: '삭제할 파일을 찾을 수 없습니다.'
        });
      }

      try {
        const config = getS3Config();
        await s3.send(new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: asset.objectKey
        }));
      } catch (error) {
        console.error('MOMU asset S3 delete error:', error);
        return res.status(502).json({
          success: false,
          message: 'S3 파일을 삭제하지 못했습니다.'
        });
      }

      const updateSql = `
        UPDATE momu_assets
        SET status = 'deleted',
            updatedAt = CURRENT_TIMESTAMP
        WHERE assetSeq = ?
      `;
      db.query(updateSql, [parsedAssetSeq], (updateError) => {
        if (updateError) {
          console.error(
            'MOMU asset delete status update error:',
            updateError
          );
          return res.status(500).json({
            success: false,
            message: '파일 삭제 상태를 저장하지 못했습니다.'
          });
        }

        return res.json({
          success: true,
          assetSeq: parsedAssetSeq,
          message: '파일을 삭제했습니다.'
        });
      });
    }
  );
});

module.exports = router;
