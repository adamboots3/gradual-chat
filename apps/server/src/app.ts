import { existsSync } from 'fs';
import { join } from 'path';
import express, { type Express } from 'express';
import { expressMiddleware } from '@as-integrations/express4';
import type { ApolloServer } from '@apollo/server';
import type { GraphQLContext } from './graphql/context';
import type { RealtimeEmitter } from './realtime/emitter';
import { logger } from './logger';

/** `apps/web/dist` relative to both `src/` (tsx) and `dist/` (compiled). */
function resolveWebDist(): string {
  return join(__dirname, '..', '..', 'web', 'dist');
}

export function mountHttpRoutes(
  app: Express,
  apollo: ApolloServer<GraphQLContext>,
  emitter: RealtimeEmitter,
): void {
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use(
    '/graphql',
    express.json({ limit: '256kb' }),
    expressMiddleware(apollo, {
      context: async () => ({ emitter }),
    }),
  );

  const webDist = resolveWebDist();
  if (existsSync(join(webDist, 'index.html'))) {
    logger.info({ webDist }, 'serving the built front-end');
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/graphql') ||
        req.path.startsWith('/socket.io') ||
        req.path === '/healthz'
      ) {
        next();
        return;
      }
      res.sendFile(join(webDist, 'index.html'));
    });
  } else {
    logger.info('no web build found — run `npm run dev` and open http://localhost:5173');
  }

  app.use(
    (
      err: Error & { status?: number; statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status = err.status ?? err.statusCode ?? 500;
      if (status >= 500) {
        logger.error({ err }, 'unhandled request error');
        res.status(500).json({ errors: [{ message: 'Internal server error' }] });
        return;
      }
      // Client errors (for example malformed JSON from body-parser) keep their status.
      logger.warn(`request rejected with ${status}: ${err.message}`);
      res.status(status).json({ errors: [{ message: err.message }] });
    },
  );
}
