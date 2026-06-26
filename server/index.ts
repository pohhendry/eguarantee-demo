import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import 'dotenv/config';
import vcRouter from './routes/vc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/vc', vcRouter);

// Serve the built frontend in production (npm run build outputs to dist/)
const distPath = join(__dirname, '..', '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/*path', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

const PORT = process.env.PORT ?? 3001;

if (process.argv[1]?.endsWith('server/index.ts') || process.argv[1]?.endsWith('server/index.js')) {
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

export default app;
