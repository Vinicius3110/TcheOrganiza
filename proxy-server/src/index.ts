import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createRouter } from './router';
import type { InstitutionAdapter } from './institutions/types';
import { createNubankAdapter } from './institutions/nubank.adapter';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8081' }));
app.use(express.json());

const adapters: InstitutionAdapter[] = [createNubankAdapter()];

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', createRouter(adapters));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
