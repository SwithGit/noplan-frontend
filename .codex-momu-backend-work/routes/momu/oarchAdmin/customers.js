const express = require('express');
const db = require('../../../config/db');
const { parsePagination, trimText } = require('./utils');

const router = express.Router();

/**
 * @swagger
 * /api/momu/oarch-admin/customers:
 *   get:
 *     summary: OARCH Serial 등록 대상 고객사 검색
 *     tags: [OARCH Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *     responses:
 *       200: { description: 고객사 검색 성공 }
 *       401: { description: 인증 실패 }
 */
router.get('/', async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query);
  const search = trimText(req.query.search, 191).toLowerCase();
  const whereSql = search ? `
    WHERE
      INSTR(LOWER(id), ?) > 0
      OR INSTR(LOWER(COALESCE(companyName, '')), ?) > 0
      OR INSTR(LOWER(COALESCE(managerName, '')), ?) > 0
      OR INSTR(LOWER(COALESCE(managerEmail, '')), ?) > 0
  ` : '';
  const whereParams = search ? [search, search, search, search] : [];

  try {
    const [countResult, rowsResult] = await Promise.all([
      db.promise().query(
        `SELECT COUNT(*) AS total FROM momu_users ${whereSql}`,
        whereParams,
      ),
      db.promise().query(`
        SELECT id, companyName, companyAddress, managerName, managerEmail
        FROM momu_users
        ${whereSql}
        ORDER BY companyName ASC, id ASC
        LIMIT ? OFFSET ?
      `, [...whereParams, pageSize, offset]),
    ]);
    const [countRows] = countResult;
    const [rows] = rowsResult;
    const total = Number(countRows[0]?.total || 0);
    return res.json({
      success: true,
      items: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[OARCH ADMIN] customer search failed', {
      code: error.code || 'CUSTOMER_SEARCH_ERROR',
    });
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '고객사 정보를 불러오지 못했습니다.',
    });
  }
});

module.exports = router;
