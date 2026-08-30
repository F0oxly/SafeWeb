import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import sitesRouter from './routes/sites.js';
import historyRouter from './routes/history.js';
import securityRouter from './routes/security.js';
import { monitorService } from './services/monitor.js';

const app = express();
const PORT = process.env.PORT || 3000;
const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL_SECONDS || '60', 10);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SafeWeb Backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/sites', sitesRouter);
app.use('/api/history', historyRouter);
app.use('/api/security', securityRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint não encontrado.' });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` SafeWeb Backend ativo na porta ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);

  monitorService.start(MONITOR_INTERVAL);
});
