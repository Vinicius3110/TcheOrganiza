import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { InstitutionAdapter } from './institutions/types';

const FetchRequestSchema = z.object({
  consentToken: z.string().min(1),
  ispb: z.string().length(8),
});

export function createRouter(adapters: InstitutionAdapter[]): Router {
  const router = Router();

  router.post('/fetch', async (req: Request, res: Response) => {
    const parsed = FetchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.format() });
      return;
    }

    const { consentToken, ispb } = parsed.data;
    const adapter = adapters.find((a) => a.ispb === ispb);

    if (!adapter) {
      res.status(400).json({ error: `No adapter for institution ISPB: ${ispb}` });
      return;
    }

    try {
      const result = await adapter.fetchData(consentToken);
      res.json(result);
    } catch (err: any) {
      console.error(`Failed to fetch from ${adapter.name}:`, err.message);
      res.status(502).json({ error: `Failed to fetch from institution: ${err.message}` });
    }
  });

  return router;
}
