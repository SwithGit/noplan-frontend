require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const { createRateLimiter, positiveInteger } = require('./middleware/rateLimit');
const db = require('./config/db');

const app = express();
const port = positiveInteger(process.env.PORT, 3000);

const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '', 10);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set('trust proxy', trustProxyHops);
}

const swaggerDocs = swaggerJsDoc({
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Momu API 문서',
      version: '1.0.0',
      description: 'Momu 백엔드 API 설명서',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/momu/*.js'],
});

app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const allowedOrigins = new Set(
  String(
    process.env.CORS_ALLOWED_ORIGINS ||
      'http://localhost:5173,http://127.0.0.1:5173',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('CORS_ORIGIN_DENIED'));
    },
  }),
);
app.use(express.json({ limit: '512kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: positiveInteger(process.env.GLOBAL_RATE_LIMIT, 1000),
});
app.use('/api', globalLimiter);

const momuRouter = require('./routes/momu');
const { router: qrDownloadRouter } = require('./routes/momu/qrDownload');
const qrDownloadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: positiveInteger(process.env.MOMU_QR_RATE_LIMIT, 300),
});
app.use('/q', qrDownloadLimiter, qrDownloadRouter);
app.use('/api/momu', momuRouter);
momuRouter.startProgramScheduleWorker?.();

db.getConnection((error, connection) => {
  if (error) {
    console.error('Momu database connection failed:', error.message);
    return;
  }
  connection.release();
  console.log('Momu database connection succeeded.');
});

app.get('/', (_req, res) => {
  res.send('Momu Backend API');
});

let isAuthorized = 1;

app.get('/check', (_req, res) => {
  res.send(isAuthorized.toString());
});

app.listen(port, () => {
  console.log(`Momu Backend API listening on port ${port}`);
});
