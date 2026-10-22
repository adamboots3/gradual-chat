import mongoose from 'mongoose';
import { badUserInput } from './errors';

/**
 * Opaque cursor helpers. We page by `_id` (monotonic, already indexed together
 * with `channelId`) which keeps the query cheap and stable while new messages
 * arrive. The cursor is base64 encoded so clients treat it as opaque.
 */
export function encodeCursor(id: string): string {
  return Buffer.from(`m:${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): mongoose.Types.ObjectId {
  let raw: string;
  try {
    raw = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw badUserInput('Malformed pagination cursor.');
  }
  const id = raw.startsWith('m:') ? raw.slice(2) : raw;
  if (!mongoose.isValidObjectId(id)) {
    throw badUserInput('Malformed pagination cursor.');
  }
  return new mongoose.Types.ObjectId(id);
}

export function clampLimit(limit: number | null | undefined, fallback = 30, max = 100): number {
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), max);
}
