import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

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
    /* storage can be disabled — the app still works for this session */
  }
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

export const apolloClient = new ApolloClient({
  link: from([
    errorLink,
    authLink,
    new HttpLink({ uri: '/graphql', credentials: 'same-origin' }),
  ]),
  cache: new InMemoryCache({
    typePolicies: {
      Channel: { keyFields: ['id'] },
      Message: { keyFields: ['id'] },
      MessagePreview: { keyFields: ['id'] },
      User: { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
