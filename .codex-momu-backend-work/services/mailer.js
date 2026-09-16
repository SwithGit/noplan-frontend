const nodemailer = require('nodemailer');

let cachedTransport;

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function createTransport() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const from = String(process.env.SMTP_FROM || '').trim();
  if (!host || !from) {
    const error = new Error('SMTP_HOST and SMTP_FROM are required.');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');
  const config = {
    host,
    port,
    secure: booleanValue(process.env.SMTP_SECURE, port === 465),
    connectionTimeout: Number.parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '10000', 10),
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '15000', 10),
  };
  if (user || pass) config.auth = { user, pass };

  cachedTransport = nodemailer.createTransport(config);
  return cachedTransport;
}

function getTransport() {
  return cachedTransport || createTransport();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getLoginUrl() {
  const configured = String(process.env.MOMU_LOGIN_URL || 'https://mo-cms.com').trim();
  const parsed = new URL(configured);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('MOMU_LOGIN_URL must use HTTP or HTTPS.');
  }
  return parsed.toString();
}

function buildTemporaryPasswordMessage(temporaryPassword) {
  const safePassword = escapeHtml(temporaryPassword);
  const loginUrl = getLoginUrl();
  const text = [
    '안녕하세요.',
    '',
    'MO-CMS 비밀번호 재설정 요청에 따라 임시 비밀번호를 안내드립니다.',
    '',
    `임시 비밀번호: ${temporaryPassword}`,
    '',
    '임시 비밀번호는 발급 후 24시간 동안 한 번만 사용할 수 있습니다.',
    '임시 비밀번호로 로그인하면 새로운 비밀번호 설정 화면으로 이동합니다.',
    '',
    `MO-CMS 로그인: ${loginUrl}`,
    '',
    "본인이 요청하지 않은 경우에는 이 메일을 무시하시거나 O'ARCH 고객지원으로 문의해 주세요.",
    '보안을 위해 임시 비밀번호를 다른 사람에게 공유하지 마세요.',
    '',
    '감사합니다.',
    "O'ARCH 고객지원팀",
  ].join('\n');
  const html = `<!doctype html>
<html lang="ko">
  <body style="margin:0;background:#f5f7fa;font-family:Arial,'Noto Sans KR',sans-serif;color:#202124;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:36px;">
        <h1 style="margin:0 0 28px;font-size:22px;">비밀번호 재설정 안내</h1>
        <p style="margin:0 0 18px;line-height:1.7;">안녕하세요.</p>
        <p style="margin:0 0 24px;line-height:1.7;">MO-CMS 비밀번호 재설정 요청에 따라 임시 비밀번호를 안내드립니다.</p>
        <div style="margin:0 0 24px;padding:18px;background:#f3f6fa;border-radius:8px;">
          <span style="display:block;margin-bottom:8px;color:#5f6368;">임시 비밀번호</span>
          <strong style="font-size:20px;letter-spacing:1px;">${safePassword}</strong>
        </div>
        <p style="margin:0 0 24px;line-height:1.7;">임시 비밀번호는 발급 후 <strong>24시간 동안 한 번만</strong> 사용할 수 있습니다.<br>임시 비밀번호로 로그인하면 새로운 비밀번호 설정 화면으로 이동합니다.</p>
        <p style="margin:0 0 30px;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:13px 22px;border-radius:7px;background:#1868db;color:#ffffff;text-decoration:none;font-weight:bold;">MO-CMS 로그인</a></p>
        <p style="margin:0 0 14px;line-height:1.7;color:#5f6368;">본인이 요청하지 않은 경우에는 이 메일을 무시하시거나 O&#39;ARCH 고객지원으로 문의해 주세요.</p>
        <p style="margin:0 0 28px;line-height:1.7;color:#5f6368;">보안을 위해 임시 비밀번호를 다른 사람에게 공유하지 마세요.</p>
        <p style="margin:0;line-height:1.7;">감사합니다.<br>O&#39;ARCH 고객지원팀</p>
      </div>
    </div>
  </body>
</html>`;
  return {
    subject: "[O'ARCH] 임시 비밀번호 안내",
    text,
    html,
  };
}

async function sendTemporaryPasswordEmail({ to, temporaryPassword }) {
  return getTransport().sendMail({
    from: process.env.SMTP_FROM,
    to,
    ...buildTemporaryPasswordMessage(temporaryPassword),
  });
}

module.exports = { buildTemporaryPasswordMessage, sendTemporaryPasswordEmail };
