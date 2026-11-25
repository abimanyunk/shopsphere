import { Router } from 'express';
import type { DependencyChecks } from './health.service.js';
import { checkReadiness } from './health.service.js';

export function createHealthRouter(checks: DependencyChecks, timeoutMs: number): Router {
  const router = Router();

  router.get('/live', (_request, response) => {
    response.status(200).json({ data: { status: 'alive' } });
  });

  router.get('/ready', async (_request, response) => {
    const result = await checkReadiness(checks, timeoutMs);
    response.status(result.ready ? 200 : 503).json({
      data: {
        status: result.ready ? 'ready' : 'not_ready',
        checks: result.checks,
      },
    });
  });

  return router;
}
