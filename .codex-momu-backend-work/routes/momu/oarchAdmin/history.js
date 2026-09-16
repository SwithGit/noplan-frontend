const express = require('express');
const db = require('../../../config/db');
const { parseDate, parsePagination, trimText } = require('./utils');

const router = express.Router();

/**
 * @swagger
 * /api/momu/oarch-admin/history:
 *   get:
 *     summary: OARCH Serial 등록 감사 이력 조회
 *     tags: [OARCH Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: dateFrom, schema: { type: string, format: date } }
 *       - { in: query, name: dateTo, schema: { type: string, format: date } }
 *       - { in: query, name: result, schema: { type: string, enum: [SUCCESS, FAILURE] } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       200: { description: 이력 조회 성공 }
 *       400: { description: 검색 조건 형식 오류 }
 */
router.get('/', async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const search = trimText(req.query.search, 191).toLowerCase();
  const result = String(req.query.result || '').trim().toUpperCase();
  const dateFrom = parseDate(req.query.dateFrom);
  const dateTo = parseDate(req.query.dateTo);

  if (dateFrom === undefined || dateTo === undefined) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: '기간은 YYYY-MM-DD 형식으로 입력해 주세요.',
    });
  }
  if (result && !['SUCCESS', 'FAILURE'].includes(result)) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: '결과 필터가 올바르지 않습니다.',
    });
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: '시작일은 종료일보다 늦을 수 없습니다.',
    });
  }

  const conditions = [];
  const parameters = [];
  if (search) {
    conditions.push(`(
      INSTR(LOWER(COALESCE(a.serialNumber, '')), ?) > 0
      OR INSTR(LOWER(COALESCE(a.customerId, '')), ?) > 0
      OR INSTR(LOWER(COALESCE(u.companyName, '')), ?) > 0
      OR INSTR(LOWER(COALESCE(a.siteName, '')), ?) > 0
    )`);
    parameters.push(search, search, search, search);
  }
  if (result) {
    conditions.push('a.result = ?');
    parameters.push(result);
  }
  if (dateFrom) {
    conditions.push('a.createdAt >= ?');
    parameters.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push('a.createdAt < DATE_ADD(?, INTERVAL 1 DAY)');
    parameters.push(`${dateTo} 00:00:00`);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    FROM momu_oarch_admin_audits a
    LEFT JOIN momu_admin_users admin ON admin.adminSeq = a.adminSeq
    LEFT JOIN momu_users u ON u.id = a.customerId
  `;

  try {
    const [countResult, itemsResult] = await Promise.all([
      db.promise().query(`SELECT COUNT(*) AS total ${joins} ${whereSql}`, parameters),
      db.promise().query(`
        SELECT
          a.auditSeq,
          a.createdAt,
          a.actionType,
          a.result,
          COALESCE(admin.name, '알 수 없음') AS adminName,
          a.serialNumber,
          a.customerId,
          COALESCE(u.companyName, '') AS companyName,
          a.siteName,
          a.message,
          a.detail
        ${joins}
        ${whereSql}
        ORDER BY a.auditSeq DESC
        LIMIT ? OFFSET ?
      `, [...parameters, pageSize, offset]),
    ]);
    const [countRows] = countResult;
    const [items] = itemsResult;
    const total = Number(countRows[0]?.total || 0);
    return res.json({
      success: true,
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[OARCH ADMIN] history query failed', {
      code: error.code || 'HISTORY_QUERY_ERROR',
    });
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '작업 이력을 불러오지 못했습니다.',
    });
  }
});

module.exports = router;
