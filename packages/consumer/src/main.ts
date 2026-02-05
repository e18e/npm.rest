import { and, eq, inArray, sql } from 'drizzle-orm';
import { process as processItem } from './process';
import { changeTable } from '@npm.rest/db/schema';
import { setTimeout } from 'node:timers/promises';
import { logger } from './shared/logger';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';

const MIN_SLEEP_MS = 1_000;
const MAX_SLEEP_MS = 60_000;
const DEQUEUE_LIMIT = 10;

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
			.limit(DEQUEUE_LIMIT)
			.for('update', { skipLocked: true });

		return await tx
			.update(changeTable)
			.set({ state: 'processing', updatedAt: new Date() })
			.where(inArray(changeTable.name, where))
			.returning();
	});
}

let currentSleepMs = MIN_SLEEP_MS;
let exitRequested = false;

process.on('SIGINT', () => {
	logger.info('exit requested...');
	exitRequested = true;
});

while (true) {
	if (exitRequested) {
		logger.info('exited!');
		process.exit(0);
	}

	const items = await dequeue();

	logger.debug(`dequeued ${items.length} items`, {
		names: items.map((item) => item.name),
	});

	if (items.length === 0) {
		logger.info(`sleeping for ${currentSleepMs / 1000} seconds`, {
			until_approx: new Date(Date.now() + currentSleepMs).toISOString(),
		});

		await setTimeout(currentSleepMs);

		// Exponential backoff: double sleep time up to max
		currentSleepMs = Math.min(currentSleepMs * 2, MAX_SLEEP_MS);

		continue;
	}

	currentSleepMs = MIN_SLEEP_MS;

	for (const item of items) {
		const result = exitRequested
			? await processItem(item.name, item.revId)
			: Result.ok('exit' as const);

		if (result.isErr()) {
			logger.error(`packument store failed`, {
				name: item.name,
				revId: item.revId,
				error: result.error,
			});
		} else if (result.value !== 'exit') {
			logger.debug(`packument store succeeded`, {
				name: item.name,
				revId: item.revId,
			});
		}

		await db
			.update(changeTable)
			.set({
				updatedAt: new Date(),
				state: result.isOk()
					? result.value === 'exit'
						? 'pending'
						: 'completed'
					: 'failed',
			})
			.where(
				and(
					eq(changeTable.name, item.name),
					eq(changeTable.revId, item.revId),
				),
			);
	}
}
