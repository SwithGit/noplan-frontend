// Local preview, real public APIs, memory-only catalog. Never connects to MySQL.
const { createRequire } = require('node:module');
const path = require('node:path');
const backend = process.env.NOPLAN_BACKEND_PATH || 'D:/Backend/NoPlan';
const backendRequire = createRequire(path.join(backend, 'package.json'));
backendRequire('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const app = backendRequire('express')();
app.use(backendRequire('express').json());
app.use((req, res, next) => {
  if (['http://localhost:5173', 'http://127.0.0.1:5173'].includes(req.headers.origin)) {
    res.set('Access-Control-Allow-Origin', req.headers.origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  res.set('Access-Control-Allow-Headers', 'Content-Type,X-NoPlan-Request-Id,X-NoPlan-Operation-Id,X-NoPlan-Client');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const { pcRequestLogger, createPcDiagnosticsRouter } = backendRequire('./middleware/pcDiagnostics');
app.use(pcRequestLogger());
app.use('/api/pc-diagnostics', createPcDiagnosticsRouter());
const { createTourismService } = backendRequire('./routes/tourism/service');
const { createTourismRouter } = backendRequire('./routes/tourism/router');
app.use('/api/tourism', (req, res, next) => { req.auth = { userId: 'preview-member' }; next(); }, createTourismRouter(createTourismService(), async () => ({ birthdate: '2001-01-01', gender: 'female' })));
const { createEventRouter } = backendRequire('./routes/events/router');
const { createEventService } = backendRequire('./routes/events/service');
const { createProviders } = backendRequire('./routes/events/providers');
const snapshots = [];
const repository = { read: async () => snapshots, save: async (provider, events) => {
  const snapshot = { provider, events, fetchedAt: new Date().toISOString() };
  const previous = snapshots.findIndex(item => item.provider === provider);
  if (previous >= 0) snapshots.splice(previous, 1);
  snapshots.push(snapshot); return snapshot;
} };
app.use('/api/events', createEventRouter(createEventService(repository, createProviders())));
app.listen(4318, '127.0.0.1', () => console.log('Home preview API on 4318; public tourism/events; no DB writes.'));
