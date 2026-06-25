import express from 'express';
import 'dotenv/config';
import vcRouter from './routes/vc';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/vc', vcRouter);

const PORT = process.env.PORT ?? 3001;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

export default app;
