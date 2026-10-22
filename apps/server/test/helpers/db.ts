import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export interface TestDatabase {
  stop: () => Promise<void>;
}

/**
 * Each test file gets its own throwaway MongoDB so the suite can run in
 * parallel without cross-talk.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri('gradual_test'), { serverSelectionTimeoutMS: 10000 });

  return {
    stop: async () => {
      await mongoose.disconnect();
      await server.stop();
    },
  };
}

export async function resetDatabase(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}
