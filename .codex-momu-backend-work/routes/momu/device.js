const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { registerMomuDevice } = require('../../services/momuDeviceRegistration');

/**
 * @swagger
 * {
 * "/api/momu/device/add": {
 * "post": {
 * "summary": "모뮤 디바이스 추가",
 * "tags": ["Momu Device"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "string", "description": "관리자 아이디" },
 * "deviceName": { "type": "string", "description": "디바이스 명" },
 * "serialNumber": { "type": "string", "description": "시리얼 넘버" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "디바이스 등록 성공" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/add', async (req, res) => {
  const { id, deviceName, serialNumber } = req.body;
  try {
    const registration = await registerMomuDevice({ id, deviceName, serialNumber });
    return res.json({
      success: true,
      message: '디바이스가 등록되었습니다.',
      ...registration,
    });
  } catch (error) {
    console.error('디바이스 등록 중 에러 발생:', {
      code: error.code || 'DEVICE_REGISTRATION_ERROR',
    });
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        code: 'SERIAL_ALREADY_EXISTS',
        message: '이미 등록된 Serial입니다.',
      });
    }
    return res.status(500).json({
      success: false,
      message: '서버 오류로 디바이스 등록에 실패했습니다.',
    });
  }
});

/**
 * @swagger
 * {
 * "/api/momu/device/list": {
 * "post": {
 * "summary": "모뮤 디바이스 목록 조회",
 * "tags": ["Momu Device"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "string", "description": "조회할 관리자 아이디" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "목록 조회 성공" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/list', (req, res) => {
  const { id } = req.body;

  const sql = 'SELECT deviceSeq, deviceName, deviceAlias, serialNumber, status, activeMode, createdAt FROM momu_devices WHERE id = ?';
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('디바이스 목록 조회 중 에러 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    res.json({
      success: true,
      devices: results
    });
  });
});

/**
 * @swagger
 * {
 * "/api/momu/device/update-alias": {
 * "post": {
 * "summary": "모뮤 디바이스 별칭 수정",
 * "tags": ["Momu Device"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "string", "description": "관리자 아이디" },
 * "deviceSeq": { "type": "integer", "description": "디바이스 고유 번호" },
 * "deviceAlias": { "type": "string", "description": "새로운 별칭" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "별칭 수정 성공" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/update-alias', (req, res) => {
  const { id, deviceSeq, deviceAlias } = req.body;

  const sql = 'UPDATE momu_devices SET deviceAlias = ? WHERE id = ? AND deviceSeq = ?';

  db.query(sql, [deviceAlias, id, deviceSeq], (err, result) => {
    if (err) {
      console.error('별칭 수정 중 에러 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    res.json({
      success: true,
      message: "디바이스 별칭이 수정되었습니다."
    });
  });
});

/**
 * @swagger
 * {
 * "/api/momu/device/delete": {
 * "post": {
 * "summary": "모뮤 디바이스 삭제",
 * "tags": ["Momu Device"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "string", "description": "관리자 아이디" },
 * "deviceSeq": { "type": "integer", "description": "디바이스 고유 번호" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "삭제 성공" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/delete', (req, res) => {
  const { id, deviceSeq } = req.body;

  const sql = 'DELETE FROM momu_devices WHERE id = ? AND deviceSeq = ?';

  db.query(sql, [id, deviceSeq], (err, result) => {
    if (err) {
      console.error('디바이스 삭제 중 에러 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    res.json({
      success: true,
      message: "디바이스가 삭제되었습니다."
    });
  });
});

/**
 * @swagger
 * {
 * "/api/momu/device/usage": {
 * "post": {
 * "summary": "모뮤 디바이스별 사용시간 확인",
 * "tags": ["Momu Device"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "required": ["id", "deviceSeq", "period", "baseDate", "compareCount"],
 * "properties": {
 * "id": { "type": "string", "description": "관리자 아이디", "example": "testuser" },
 * "deviceSeq": { "type": "integer", "description": "디바이스 고유 번호", "example": 3 },
 * "period": { "type": "string", "description": "조회 기간", "example": "month" },
 * "baseDate": { "type": "string", "format": "date", "description": "기준 날짜 (YYYY-MM-DD)", "example": "2026-06-16" },
 * "compareCount": { "type": "integer", "description": "비교 데이터 개수", "example": 3 }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": {
 * "description": "사용시간 조회 성공",
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "success": { "type": "boolean", "example": true },
 * "device": {
 * "type": "object",
 * "properties": {
 * "deviceSeq": { "type": "integer", "example": 3 },
 * "deviceName": { "type": "string", "example": "testtest" },
 * "deviceAlias": { "type": "string", "example": "testtest" },
 * "serialNumber": { "type": "string", "example": "030304040505" },
 * "status": { "type": "string", "example": "inactive" }
 * }
 * },
 * "summary": {
 * "type": "object",
 * "properties": {
 * "totalUsageMinutes": { "type": "integer", "example": 7440 },
 * "totalUsageHours": { "type": "number", "example": 124 },
 * "yesterdayUsageMinutes": { "type": "integer", "example": 80 },
 * "lensLifeLimitHours": { "type": "number", "example": 10000 },
 * "remainingLensHours": { "type": "number", "example": 9876 },
 * "lensLifePercent": { "type": "number", "format": "float", "example": 98.76 }
 * }
 * },
 * "chart": {
 * "type": "object",
 * "properties": {
 * "period": { "type": "string", "example": "month" },
 * "baseDate": { "type": "string", "format": "date", "example": "2026-06-16" },
 * "compareCount": { "type": "integer", "example": 3 },
 * "series1Name": { "type": "string", "example": "Now" },
 * "series1": {
 * "type": "array",
 * "items": {
 * "type": "object",
 * "properties": {
 * "label": { "type": "string", "example": "1" },
 * "usageMinutes": { "type": "integer", "example": 120 }
 * }
 * }
 * },
 * "series2Name": { "type": "string", "example": "Last Month" },
 * "series2": {
 * "type": "array",
 * "items": {
 * "type": "object",
 * "properties": {
 * "label": { "type": "string", "example": "1" },
 * "usageMinutes": { "type": "integer", "example": 90 }
 * }
 * }
 * },
 * "series3Name": { "type": "string", "example": "2 Month ago" },
 * "series3": {
 * "type": "array",
 * "items": {
 * "type": "object",
 * "properties": {
 * "label": { "type": "string", "example": "1" },
 * "usageMinutes": { "type": "integer", "example": 70 }
 * }
 * }
 * }
 * }
 * },
 * "calendar": {
 * "type": "object",
 * "properties": {
 * "viewType": { "type": "string", "example": "month" },
 * "selectedDate": { "type": "string", "format": "date", "example": "2026-06-16" },
 * "cells": {
 * "type": "array",
 * "items": {
 * "type": "object",
 * "properties": {
 * "date": { "type": "string", "format": "date", "example": "2026-06-01" },
 * "day": { "type": "integer", "example": 1 },
 * "month": { "type": "integer", "example": 6 },
 * "year": { "type": "integer", "example": 2026 },
 * "isCurrentMonth": { "type": "boolean", "example": true },
 * "isSelected": { "type": "boolean", "example": false },
 * "usageMinutes": { "type": "integer", "example": 120 }
 * }
 * }
 * }
 * }
 * }
 * }
 * }
 * }
 * }
 * },
 * "404": { "description": "디바이스 정보 없음" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_USAGE_PERIODS = new Set(['day', 'week', 'month']);
const LENS_LIFE_LIMIT_HOURS = 10000;

const formatDate = (date) => date.toISOString().slice(0, 10);

const parseDate = (value) => {
  if (!DATE_PATTERN.test(value || '')) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return formatDate(parsed) === value ? parsed : null;
};

const addDays = (date, amount) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
};

const addMonths = (date, amount) => {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + amount,
    1
  ));
};

const getUsageRange = (baseDate, period, offset) => {
  if (period === 'day') {
    const day = addDays(baseDate, -offset);
    return { start: day, end: day };
  }

  if (period === 'week') {
    const startOfSelectedWeek = addDays(baseDate, -baseDate.getUTCDay());
    const start = addDays(startOfSelectedWeek, -(offset * 7));
    return { start, end: addDays(start, 6) };
  }

  const start = addMonths(baseDate, -offset);
  const end = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    0
  ));
  return { start, end };
};

const getSeriesName = (period, offset) => {
  if (offset === 0) {
    return 'Now';
  }

  const unit = period === 'day'
    ? 'Day'
    : period === 'week'
      ? 'Week'
      : 'Month';
  return offset === 1 ? `Last ${unit}` : `${offset} ${unit}s ago`;
};

const buildUsageSeries = (range, period, usageByDate) => {
  const points = [];

  for (
    let current = new Date(range.start);
    current <= range.end;
    current = addDays(current, 1)
  ) {
    const date = formatDate(current);
    points.push({
      label: period === 'month'
        ? String(current.getUTCDate())
        : date.slice(5),
      usageMinutes: usageByDate.get(date) || 0
    });
  }

  // 일간 데이터는 하루 합계 한 개뿐이므로 같은 값을 두 점으로 만들어
  // 현재 Canvas 그래프에서도 선으로 확인할 수 있게 합니다.
  if (period === 'day' && points.length === 1) {
    return [
      { label: points[0].label, usageMinutes: points[0].usageMinutes },
      { label: '', usageMinutes: points[0].usageMinutes }
    ];
  }

  return points;
};

const buildCalendarCells = (range, selectedDate, usageByDate) => {
  const cells = [];

  for (
    let current = new Date(range.start);
    current <= range.end;
    current = addDays(current, 1)
  ) {
    const date = formatDate(current);
    cells.push({
      date,
      day: current.getUTCDate(),
      month: current.getUTCMonth() + 1,
      year: current.getUTCFullYear(),
      isCurrentMonth:
        current.getUTCFullYear() === selectedDate.getUTCFullYear() &&
        current.getUTCMonth() === selectedDate.getUTCMonth(),
      isSelected: date === formatDate(selectedDate),
      usageMinutes: usageByDate.get(date) || 0
    });
  }

  return cells;
};

router.post('/usage', (req, res) => {
  const { id, deviceSeq, period, baseDate, compareCount } = req.body;
  const parsedDeviceSeq = Number(deviceSeq);

  if (!id || !Number.isInteger(parsedDeviceSeq) || parsedDeviceSeq <= 0) {
    return res.status(400).json({
      success: false,
      message: 'id와 올바른 deviceSeq가 필요합니다.'
    });
  }

  const now = new Date();
  const koreaDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const responsePeriod = ALLOWED_USAGE_PERIODS.has(period) ? period : 'month';
  const parsedBaseDate = parseDate(baseDate) || parseDate(formatDate(koreaDate));
  const responseBaseDate = formatDate(parsedBaseDate);
  const parsedCompareCount = Number(compareCount);
  const responseCompareCount = Number.isInteger(parsedCompareCount)
    ? Math.min(3, Math.max(1, parsedCompareCount))
    : 3;

  const ranges = Array.from(
    { length: responseCompareCount },
    (_, index) => getUsageRange(parsedBaseDate, responsePeriod, index)
  );
  const earliestDate = formatDate(ranges[ranges.length - 1].start);
  const latestDate = formatDate(ranges[0].end);
  const koreaToday = parseDate(formatDate(koreaDate));
  const yesterdayDate = formatDate(addDays(koreaToday, -1));

  const deviceSql = `
    SELECT deviceSeq, deviceName, deviceAlias, serialNumber, status
    FROM momu_devices
    WHERE id = ? AND deviceSeq = ?
  `;

  db.query(deviceSql, [id, parsedDeviceSeq], (deviceErr, deviceResults) => {
    if (deviceErr) {
      console.error('디바이스 정보 조회 중 에러:', deviceErr);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }

    if (deviceResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 디바이스를 찾을 수 없습니다.'
      });
    }

    const usageSql = `
      SELECT
        DATE_FORMAT(usageDate, '%Y-%m-%d') AS usageDate,
        usageMinutes
      FROM momu_device_usage_daily
      WHERE deviceSeq = ?
        AND usageDate BETWEEN ? AND ?
      ORDER BY usageDate ASC
    `;
    const summarySql = `
      SELECT
        COALESCE(SUM(usageMinutes), 0) AS totalUsageMinutes,
        COALESCE(SUM(
          CASE WHEN usageDate = ? THEN usageMinutes ELSE 0 END
        ), 0) AS yesterdayUsageMinutes
      FROM momu_device_usage_daily
      WHERE deviceSeq = ?
    `;

    db.query(
      usageSql,
      [parsedDeviceSeq, earliestDate, latestDate],
      (usageErr, usageRows) => {
        if (usageErr) {
          console.error('디바이스 사용량 조회 중 에러:', usageErr);
          return res.status(500).json({
            success: false,
            message: '사용량 데이터를 조회하지 못했습니다.'
          });
        }

        db.query(
          summarySql,
          [yesterdayDate, parsedDeviceSeq],
          (summaryErr, summaryRows) => {
            if (summaryErr) {
              console.error('디바이스 사용량 요약 조회 중 에러:', summaryErr);
              return res.status(500).json({
                success: false,
                message: '사용량 요약을 조회하지 못했습니다.'
              });
            }

            const usageByDate = new Map(
              usageRows.map((row) => [
                row.usageDate,
                Number(row.usageMinutes) || 0
              ])
            );
            const chart = {
              period: responsePeriod,
              baseDate: responseBaseDate,
              compareCount: responseCompareCount
            };

            ranges.forEach((range, index) => {
              const seriesNumber = index + 1;
              chart[`series${seriesNumber}Name`] = getSeriesName(
                responsePeriod,
                index
              );
              chart[`series${seriesNumber}`] = buildUsageSeries(
                range,
                responsePeriod,
                usageByDate
              );
            });

            const totalUsageMinutes = Number(
              summaryRows[0]?.totalUsageMinutes
            ) || 0;
            const totalUsageHours = Number(
              (totalUsageMinutes / 60).toFixed(2)
            );
            const remainingLensHours = Number(
              Math.max(
                0,
                LENS_LIFE_LIMIT_HOURS - totalUsageHours
              ).toFixed(2)
            );
            const lensLifePercent = Number(
              (
                (remainingLensHours / LENS_LIFE_LIMIT_HOURS) *
                100
              ).toFixed(2)
            );
            const summary = {
              totalUsageMinutes,
              totalUsageHours,
              yesterdayUsageMinutes:
                Number(summaryRows[0]?.yesterdayUsageMinutes) || 0,
              lensLifeLimitHours: LENS_LIFE_LIMIT_HOURS,
              remainingLensHours,
              lensLifePercent
            };

            const calendar = {
              viewType: responsePeriod,
              selectedDate: responseBaseDate,
              cells: ranges[0]
                ? buildCalendarCells(
                    ranges[0],
                    parsedBaseDate,
                    usageByDate
                  )
                : []
            };

            return res.json({
              success: true,
              device: deviceResults[0],
              summary,
              chart,
              calendar
            });
          }
        );
      }
    );
  });
});

module.exports = router;
