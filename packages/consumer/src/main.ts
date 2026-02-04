import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { changeTable } from '@npm.rest/db/schema';
import { setTimeout } from 'node:timers/promises';
import { getSentrySink } from '@logtape/sentry';
import { db } from '@npm.rest/db/server';
import * as Sentry from '@sentry/node';
import { process } from './process';
import { env } from 'node:process';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: join(import.meta.dirname, '../../../.env') });

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

async function dequeue() {
	// Get n item(s) from the queue that is pending and isn't currently being
	// processed - the queue table has a unique index on (name, revId) so
	// there can always be many entries with the same name and different revIds,
	// but not two being processed at the same time. This effectively is the
	// logic to make sure that we aren't racing against ourselves and potentially
	// doing the lost update problem.
	return await db.transaction(async (tx) => {
		const where = tx
			.select({ name: changeTable.name })
			.from(changeTable)
			.where(
				and(
					eq(changeTable.state, 'pending'),
					sql`
                        NOT EXISTS (
                            SELECT 1 FROM ${changeTable} q2
                            WHERE q2.name = ${changeTable}.name
                                AND q2.state = 'processing'
                        )
                    `,
				),
			)
			.orderBy(changeTable.createdAt)
			.limit(10)
			.for('update', { skipLocked: true });

		return await tx
			.update(changeTable)
			.set({ state: 'processing', updatedAt: new Date() })
			.where(inArray(changeTable.name, where))
			.returning();
	});
}

export const logger = getLogger('consumer');

while (true) {
	const items = await dequeue();

	logger.debug(`dequeued ${items.length} items`, {
		names: items.map((item) => item.name),
	});

	if (items.length === 0) {
		logger.info(`sleeping for 60 seconds`, {
			until_approx: new Date(Date.now() + 60_000).toISOString(),
		});

		await setTimeout(60_000);
		continue;
	}

	for (const item of items) {
		const result = await process(item.name, item.revId);

		if (result.isErr()) {
			logger.error(`packument store failed`, {
				name: item.name,
				revId: item.revId,
				error: result.error,
			});
		} else {
			logger.debug(`packument store succeeded`, {
				name: item.name,
				revId: item.revId,
			});
		}

		await db
			.update(changeTable)
			.set({
				updatedAt: new Date(),
				state: result.isOk() ? 'completed' : 'failed',
			})
			.where(
				and(
					eq(changeTable.name, item.name),
					eq(changeTable.revId, item.revId),
				),
			);
	}

	// await setTimeout(3000);
}
