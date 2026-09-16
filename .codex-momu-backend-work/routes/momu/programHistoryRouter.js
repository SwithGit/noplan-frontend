const express = require('express');
const db = require('../../config/db');
const {
  formatHistoryReport,
  parseJsonColumn
} = require('./programHistory');

const router = express.Router();

const normalizeId = (value) => String(value || '').trim();
const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * @swagger
 * /api/momu/program-history/list:
 *   post:
 *     summary: MOMU 장치 설정 변경 이력 목록
 *     tags: [MOMU Program History]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: string
 *                 example: admin2
 *               page:
 *                 type: integer
 *                 example: 1
 *               pageSize:
 *                 type: integer
 *                 example: 10
 *               search:
 *                 type: string
 *               deviceSeq:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 변경 이력 목록
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 오류
 */
router.post('/list', (req, res) => {
  const id = normalizeId(req.body?.id);
  const page = toPositiveInteger(req.body?.page, 1);
  const pageSize = Math.min(toPositiveInteger(req.body?.pageSize, 10), 50);
  const search = String(req.body?.search || '').trim();
  const deviceSeqValue = req.body?.deviceSeq;
  const deviceSeq = deviceSeqValue === undefined || deviceSeqValue === null || deviceSeqValue === ''
    ? null
    : Number(deviceSeqValue);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'id is required.'
    });
  }
  if (deviceSeq !== null && (!Number.isInteger(deviceSeq) || deviceSeq <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'deviceSeq must be a positive integer.'
    });
  }

  const where = ['id = ?'];
  const params = [id];
  if (deviceSeq !== null) {
    where.push('deviceSeq = ?');
    params.push(deviceSeq);
  }
  if (search) {
    where.push(`(
      deviceName LIKE ? OR
      companyName LIKE ? OR
      managerName LIKE ? OR
      changeSummary LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.join(' AND ');
  const countSql = `
    SELECT COUNT(*) AS totalCount
    FROM momu_device_program_setting_histories
    WHERE ${whereSql}
  `;

  db.query(countSql, params, (countError, countRows) => {
    if (countError) {
      console.error('MOMU program history count error:', countError);
      return res.status(500).json({
        success: false,
        message: 'Server error occurred.'
      });
    }

    const totalCount = Number(countRows?.[0]?.totalCount || 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const offset = (normalizedPage - 1) * pageSize;
    const listSql = `
      SELECT
        historySeq,
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
        changeSummary
      FROM momu_device_program_setting_histories
      WHERE ${whereSql}
      ORDER BY executedAt DESC, historySeq DESC
      LIMIT ? OFFSET ?
    `;

    db.query(
      listSql,
      [...params, pageSize, offset],
      (listError, rows) => {
        if (listError) {
          console.error('MOMU program history list error:', listError);
          return res.status(500).json({
            success: false,
            message: 'Server error occurred.'
          });
        }

        return res.json({
          success: true,
          page: normalizedPage,
          pageSize,
          totalCount,
          totalPages,
          items: rows.map((row) => ({
            ...row,
            changedPrograms: parseJsonColumn(row.changedPrograms, []),
            updateFrom: {
              companyName: row.companyName,
              companyLogo: row.companyLogo,
              managerName: row.managerName,
              managerPhone: row.managerPhone
            }
          }))
        });
      }
    );
  });
});

/**
 * @swagger
 * /api/momu/program-history/download:
 *   post:
 *     summary: MOMU 장치 설정 변경 이력 TXT 다운로드
 *     tags: [MOMU Program History]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, historySeq]
 *             properties:
 *               id:
 *                 type: string
 *                 example: admin2
 *               historySeq:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       200:
 *         description: UTF-8 TXT 보고서
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 이력 없음
 */
router.post('/download', (req, res) => {
  const id = normalizeId(req.body?.id);
  const historySeq = Number(req.body?.historySeq);

  if (!id || !Number.isInteger(historySeq) || historySeq <= 0) {
    return res.status(400).json({
      success: false,
      message: 'id and a valid historySeq are required.'
    });
  }

  const sql = `
    SELECT *
    FROM momu_device_program_setting_histories
    WHERE id = ? AND historySeq = ?
    LIMIT 1
  `;
  db.query(sql, [id, historySeq], (error, rows) => {
    if (error) {
      console.error('MOMU program history download error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error occurred.'
      });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'History not found.'
      });
    }

    const report = formatHistoryReport(rows[0]);
    const fileName = `MOMU-update-history-${historySeq}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    return res.send(`\uFEFF${report}`);
  });
});

module.exports = router;
