import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { getSentrySink } from '@logtape/sentry';
import * as Sentry from '@sentry/node';
import { env } from 'node:process';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: join(import.meta.dirname, '../../../.env'), quiet: true });

Sentry.init({ dsn: env.SENTRY_DSN, enableLogs: true });

await configure({
	sinks: {
		console: getConsoleSink(),
		sentry: getSentrySink(),
	},
	loggers: [
		{ category: 'db', sinks: ['sentry'] },
		{ category: 'consumer', sinks: ['sentry', 'console'] },
	],
});

export const logger = getLogger('consumer');
