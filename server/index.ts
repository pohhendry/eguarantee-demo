import express from 'express';
import 'dotenv/config';
import vcRouter from './routes/vc';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/vc', vcRouter);

const PORT = process.env.PORT ?? 3001;

if (process.argv[1]?.endsWith('server/index.ts') || process.argv[1]?.endsWith('server/index.js')) {
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

export default app;
