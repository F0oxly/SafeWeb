import { Router } from 'express';
import { SecurityService } from '../services/security.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL é obrigatória.' });
  }

  const analysis = await SecurityService.analyzeUrl(url);
  res.json({ success: true, analysis });
});

export default router;
