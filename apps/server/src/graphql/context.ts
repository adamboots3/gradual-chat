import type { RealtimeEmitter } from '../realtime/emitter';

export interface GraphQLContext {
  emitter: RealtimeEmitter;
}
