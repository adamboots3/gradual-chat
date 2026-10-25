import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';

// `.env` can live either next to the server package or at the repository root.
// dotenv never overwrites variables that are already set, so the first file wins.
loadEnv({ path: join(__dirname, '../.env') });
loadEnv({ path: join(__dirname, '../../../.env') });

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value !== 'false' && value !== '0';
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  /**
   * When MONGODB_URI is not provided the server still tries this default local
   * instance first and only falls back to an in-memory MongoDB when it is
   * unreachable (see `connectDatabase`).
   */
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gradual_chat',
  mongoUriExplicit: Boolean(process.env.MONGODB_URI),
  seedOnStart: readBool(process.env.SEED_ON_START, true),
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  webOrigins: (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
};
