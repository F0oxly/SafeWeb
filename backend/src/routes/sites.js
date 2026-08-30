import { Router } from 'express';
import { monitorService } from '../services/monitor.js';

const router = Router();

router.get('/', (req, res) => {
  const sites = Array.from(monitorService.sites.values());
  res.json({ success: true, count: sites.length, sites });
});

router.post('/', (req, res) => {
  const { url, alias, id } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL é obrigatória.' });
  }

  const siteId = id || 'site_' + Date.now();
  const site = {
    id: siteId,
    url,
    alias: alias || url,
    status: 'checking',
    httpStatus: null,
    responseTimeMs: null,
    lastChecked: null,
    addedAt: new Date().toISOString()
  };

  monitorService.sites.set(siteId, site);

  monitorService.checkUrl(url).then(result => {
    site.status = result.status;
    site.httpStatus = result.httpStatus;
    site.responseTimeMs = result.responseTimeMs;
    site.lastChecked = result.checkedAt;
    monitorService.sites.set(siteId, site);
  });

  res.status(201).json({ success: true, site });
});

router.post('/check', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL é obrigatória.' });
  }

  const result = await monitorService.checkUrl(url);
  res.json(result);
});

router.post('/sync', (req, res) => {
  const { sites } = req.body;
  if (Array.isArray(sites)) {
    monitorService.syncSites(sites);
    res.json({ success: true, synced: sites.length });
  } else {
    res.status(400).json({ success: false, error: 'Array de sites esperado.' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existed = monitorService.sites.delete(id);
  res.json({ success: existed });
});

export default router;
