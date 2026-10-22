import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `tsc` does not copy .graphql files into dist/, so the build step runs this
 * script to keep the runtime able to locate the schema next to the compiled code.
 */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(projectRoot, 'apps/server/src/graphql/schema.graphql');
const target = resolve(projectRoot, 'apps/server/dist/graphql/schema.graphql');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`copied schema.graphql -> ${target.replace(projectRoot, '.')}`);
