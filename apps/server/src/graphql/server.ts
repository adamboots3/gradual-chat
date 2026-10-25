import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type { Server as HttpServer } from 'http';
import { resolvers } from './resolvers';
import type { GraphQLContext } from './context';

function resolveSchemaPath(): string {
  const candidates = [
    join(__dirname, 'schema.graphql'),
    join(process.cwd(), 'src/graphql/schema.graphql'),
    join(process.cwd(), 'apps/server/src/graphql/schema.graphql'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not locate schema.graphql. Looked in:\n${candidates.join('\n')}`);
  }
  return found;
}

export const typeDefs = readFileSync(resolveSchemaPath(), 'utf8');

export function createApolloServer(httpServer?: HttpServer) {
  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [
      ...(httpServer ? [ApolloServerPluginDrainHttpServer({ httpServer })] : []),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });
}
