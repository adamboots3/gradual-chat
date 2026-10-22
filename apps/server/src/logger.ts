import pino from 'pino';
import { config } from './config';

const transport =
  config.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined;

export const logger = pino({
  level: config.logLevel,
  transport,
});
