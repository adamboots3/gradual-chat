import { User, type UserDocument } from '../models/User';
import { verifyAuthToken } from './jwt';
import { unauthenticated } from '../utils/errors';
import type { RealtimeEmitter } from '../realtime/emitter';

export interface GraphQLContext {
  user: UserDocument | null;
  emitter: RealtimeEmitter;
}

export async function buildContext(
  headers: Record<string, string | string[] | undefined>,
  emitter: RealtimeEmitter,
): Promise<GraphQLContext> {
  const raw = headers.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith('Bearer ')) return { user: null, emitter };
  const payload = verifyAuthToken(header.slice('Bearer '.length).trim());
  if (!payload) return { user: null, emitter };
  const user = await User.findById(payload.sub);
  return { user, emitter };
}

export function requireUser(context: GraphQLContext): UserDocument {
  if (!context.user) throw unauthenticated();
  return context.user;
}
