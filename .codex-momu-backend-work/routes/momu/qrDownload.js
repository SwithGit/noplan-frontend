const express = require('express');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const db = require('../../config/db');
const s3 = require('../../config/s3');
const {
  hashQrToken,
  isValidQrToken,
} = require('../../services/qrDownloadLinks');

const router = express.Router();
const S3_REDIRECT_TTL_SECONDS = 60;

function storageBucket() {
  const bucket = String(
    process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '',
  ).trim();
  if (!bucket) throw new Error('AWS_S3_BUCKET_NAME or AWS_S3_BUCKET is required.');
  return bucket;
}

function safeDownloadName(value) {
  const normalized = String(value || 'MOMU-photo.png')
    .normalize('NFKC')
    .replace(/[\r\n"\\/:*?<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 120);
  return normalized || 'MOMU-photo.png';
}

function expiredPage(res) {
  res.set('Cache-Control', 'no-store');
  return res.status(410).type('html').send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>다운로드 만료</title></head>
<body style="margin:0;font-family:Arial,'Noto Sans KR',sans-serif;background:#f5f7fa;color:#202124"><main style="max-width:520px;margin:12vh auto;padding:32px"><section style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:center"><h1 style="font-size:22px">다운로드 시간이 만료되었습니다</h1><p style="line-height:1.7;color:#5f6368">기기에서 사진을 다시 촬영하고 새 QR 코드를 이용해 주세요.</p></section></main></body></html>`);
}

/**
 * @swagger
 * /q/{token}:
 *   get:
 *     summary: QR 사진 바로 다운로드
 *     description: 짧은 QR 토큰을 확인한 후 S3 첨부파일 다운로드로 이동합니다.
 *     tags: [Momu QR Download]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string, minLength: 22, maxLength: 22 }
 *     responses:
 *       302: { description: S3 첨부파일 다운로드 주소로 이동 }
 *       410: { description: 유효하지 않거나 만료된 QR 코드 }
 *       503: { description: 다운로드 주소 생성 실패 }
 */
router.get('/:token', async (req, res) => {
  const token = String(req.params.token || '');
  if (!isValidQrToken(token)) return expiredPage(res);

  try {
    const [rows] = await db.promise().query(`
      SELECT linkSeq, objectKey, downloadName, contentType
      FROM momu_qr_download_links
      WHERE tokenHash = ? AND expiresAt > NOW()
      LIMIT 1
    `, [hashQrToken(token)]);
    const link = rows[0];
    if (!link) return expiredPage(res);

    const downloadName = safeDownloadName(link.downloadName);
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: storageBucket(),
        Key: link.objectKey,
        ResponseContentDisposition: `attachment; filename="${downloadName}"`,
        ResponseContentType: link.contentType || 'application/octet-stream',
      }),
      { expiresIn: S3_REDIRECT_TTL_SECONDS },
    );

    await db.promise().query(`
      UPDATE momu_qr_download_links
      SET downloadCount = downloadCount + 1, lastDownloadedAt = NOW()
      WHERE linkSeq = ?
    `, [link.linkSeq]);

    res.set('Cache-Control', 'no-store');
    return res.redirect(302, downloadUrl);
  } catch (error) {
    console.error('[MOMU QR DOWNLOAD FAILED]', { code: error.code || 'QR_DOWNLOAD_ERROR' });
    return res.status(503).json({
      success: false,
      message: '사진 다운로드를 시작하지 못했습니다.',
    });
  }
});

module.exports = { router, safeDownloadName };
