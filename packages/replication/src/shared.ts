import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { getSentrySink } from '@logtape/sentry';
import { createState } from '@npm.rest/db';
import * as Sentry from '@sentry/node';
import { env } from 'node:process';
import 'dotenv/config';

Sentry.init({ dsn: env.SENTRY_DSN, enableLogs: true });

await configure({
	sinks: {
		console: getConsoleSink(),
		sentry: getSentrySink(),
	},
	loggers: [
		{ category: 'db', sinks: ['sentry'] },
		{ category: 'replicator', sinks: ['sentry', 'console'] },
	],
});

export const logger = getLogger('replicator');

export const seq = createState<{ last_seq: number }>('seq');
