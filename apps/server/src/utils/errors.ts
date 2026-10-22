import { GraphQLError } from 'graphql';

export function unauthenticated(message = 'You must be signed in to do that.'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } });
}

export function badUserInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export function forbidden(message = 'You do not have access to this channel.'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

export function notFound(message = 'Not found.'): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
}
