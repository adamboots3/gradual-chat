import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import type { Message } from '../types';

export const USER_STORAGE_KEY = 'gradual.userId';

export function getStoredUserId(): string | null {
  try {
    return window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeUserId(userId: string | null): void {
  try {
    if (userId) window.localStorage.setItem(USER_STORAGE_KEY, userId);
    else window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* The selected user stays in React state when local storage is unavailable. */
  }
}

interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
}

/**
 * Cache configuration is exported so tests (and alternative clients) get the
 * same pagination behaviour as the app.
 */
export function createCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          messages: {
            // One cache entry per channel, regardless of the pagination cursor.
            keyArgs: ['channelId'],
            merge(existing: MessagePage | undefined, incoming: MessagePage, { args }) {
              if (!args?.cursor) return incoming;

              // Inside `merge` the nested messages are already normalised, so
              // identity comes from `__ref` (or `id` for hand-written objects),
              // never from a plain `.id` lookup.
              const identity = (message: unknown): string => {
                const candidate = message as { __ref?: string; id?: string };
                return candidate.__ref ?? candidate.id ?? '';
              };

              const seen = new Set(incoming.messages.map(identity));
              const older = (existing?.messages ?? []).filter(
                (message) => !seen.has(identity(message)),
              );

              return {
                messages: [...incoming.messages, ...older],
                nextCursor: incoming.nextCursor,
              };
            },
          },
        },
      },
      Channel: { keyFields: ['id'] },
      Message: { keyFields: ['id'] },
      MessagePreview: { keyFields: ['id'] },
      User: { keyFields: ['id'] },
    },
  });
}

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: '/graphql' }),
  cache: createCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
