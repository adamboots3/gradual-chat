import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import type { Message } from '../types';

export const TOKEN_STORAGE_KEY = 'gradual.token';

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage can be disabled 鈥?the app still works for this session */
  }
}

interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
}

const authLink = new ApolloLink((operation, forward) => {
  const token = getStoredToken();
  operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }));
  return forward(operation);
});

const errorLink = onError(({ graphQLErrors, operation }) => {
  const unauthenticated = graphQLErrors?.some(
    (error) => error.extensions?.code === 'UNAUTHENTICATED',
  );
  if (unauthenticated && operation.operationName !== 'Login' && getStoredToken()) {
    storeToken(null);
    window.location.reload();
  }
});

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
  link: from([
    errorLink,
    authLink,
    new HttpLink({ uri: '/graphql', credentials: 'same-origin' }),
  ]),
  cache: createCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});





