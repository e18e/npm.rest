import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { getSentrySink } from '@logtape/sentry';
import * as Sentry from '@sentry/node';
import { env } from 'node:process';

Sentry.init({ dsn: env.SENTRY_DSN, enableLogs: true });

await configure({
	sinks: {
		console: getConsoleSink(),
		sentry: getSentrySink(),
	},
	loggers: [
		{ category: 'db', sinks: ['sentry'] },
		{ category: 'consumer', sinks: ['sentry', 'console'] },
		{
			category: ['logtape', 'meta'],
			sinks: ['console'],
			lowestLevel: 'error',
		},
	],
});

export const logger = getLogger('consumer');
