import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { createState } from '@npm.rest/db/utils';
import { getSentrySink } from '@logtape/sentry';
import { db } from '@npm.rest/db/server';
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
		{ category: 'replicator', sinks: ['sentry', 'console'] },
		{
			category: ['logtape', 'meta'],
			sinks: ['console'],
			lowestLevel: 'error',
		},
	],
});

export const logger = getLogger('replicator');

export const seq = createState<{ last_seq: number }>(db, 'seq');
