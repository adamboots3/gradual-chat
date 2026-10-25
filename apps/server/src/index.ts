import { createServer } from 'http';
import express from 'express';
import { config } from './config';
import { logger } from './logger';
import { connectDatabase } from './db/connect';
import { createRealtime } from './realtime';
import { createApolloServer } from './graphql/server';
import { mountHttpRoutes } from './app';
import { seedDatabase } from './seed/seed';

async function main(): Promise<void> {
  const database = await connectDatabase();

  if (config.seedOnStart) {
    await seedDatabase();
  }

  const app = express();
  const httpServer = createServer(app);
  const realtime = await createRealtime(httpServer);
  const apollo = createApolloServer(httpServer);
  await apollo.start();
  mountHttpRoutes(app, apollo, realtime.emitter);

  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, resolve);
  });
  logger.info(`API ready on http://localhost:${config.port}/graphql`);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    await realtime.close();
    await apollo.stop();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await database.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error({ err: error }, 'failed to start the server');
  process.exit(1);
});
