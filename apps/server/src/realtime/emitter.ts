import type { MessageDTO } from '../graphql/dto';

/** Everything the socket layer needs to fan a message write out. */
export interface MessageEvent {
  channelId: string;
  memberIds: string[];
  message: MessageDTO;
}

/**
 * The resolver layer never touches socket.io directly — it talks to this small
 * interface so GraphQL can be unit-tested without opening a network socket.
 */
export interface RealtimeEmitter {
  messageCreated(event: MessageEvent): Promise<void>;
  messageUpdated(event: MessageEvent): Promise<void>;
  messageDeleted(event: MessageEvent): Promise<void>;
}

export const noopRealtime: RealtimeEmitter = {
  async messageCreated() {},
  async messageUpdated() {},
  async messageDeleted() {},
};
