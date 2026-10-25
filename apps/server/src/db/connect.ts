import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../config';
import { logger } from '../logger';

export interface DatabaseConnection {
  uri: string;
  /** true when we booted the bundled in-memory MongoDB instead of a real one */
  inMemory: boolean;
  stop: () => Promise<void>;
}

/**
 * Connect to MongoDB.
 *
 * - If `MONGODB_URI` is set we treat it as a hard requirement and fail loudly.
 * - Otherwise we try the conventional local instance and transparently fall back
 *   to an in-memory MongoDB so `npm run dev` works without installing MongoDB.
 */
export async function connectDatabase(uri = config.mongoUri): Promise<DatabaseConnection> {
  if (config.mongoUriExplicit) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`connected to MongoDB at ${uri}`);
    return {
      uri,
      inMemory: false,
      stop: async () => {
        await mongoose.disconnect();
      },
    };
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 1200 });
    logger.info(`connected to MongoDB at ${uri}`);
    return {
      uri,
      inMemory: false,
      stop: async () => {
        await mongoose.disconnect();
      },
    };
  } catch {
    logger.warn(
      `No MongoDB reachable at ${uri} — starting an in-memory MongoDB instead. ` +
        'Data will NOT persist after a restart. ' +
        'Set MONGODB_URI to a persistent database, or run the full stack with `docker compose up --build`.',
    );
  }

  const memory = await MongoMemoryServer.create({ instance: { dbName: 'gradual_chat' } });
  const memoryUri = memory.getUri('gradual_chat');
  await mongoose.connect(memoryUri, { serverSelectionTimeoutMS: 5000 });
  logger.warn(`using in-memory MongoDB at ${memoryUri} (ephemeral)`);

  return {
    uri: memoryUri,
    inMemory: true,
    stop: async () => {
      await mongoose.disconnect();
      await memory.stop();
    },
  };
}
