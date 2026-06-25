import { Router, type Request, type Response } from 'express';
import { signVC, loadKeypair } from '../services/signVC';

const router = Router();

router.post('/sign', async (req: Request, res: Response) => {
  const { unsignedVC } = req.body as { unsignedVC?: object };

  if (!unsignedVC || typeof unsignedVC !== 'object') {
    res.status(400).json({ error: 'Request body must include "unsignedVC" object' });
    return;
  }

  try {
    loadKeypair(); // fail fast if not configured
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'Identity not configured',
    });
    return;
  }

  try {
    const signedVC = await signVC(unsignedVC);
    res.json({ signedVC });
  } catch (err) {
    console.error('Signing error:', err);
    res.status(500).json({ error: 'Signing failed. Check server logs.' });
  }
});

export default router;
