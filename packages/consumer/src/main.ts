import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import {
	and,
	DrizzleQueryError,
	eq,
	inArray,
	notExists,
	sql,
} from 'drizzle-orm';
import { db, packumentTable, queueTable } from '@npm.rest/db';
import { setTimeout } from 'node:timers/promises';
import { getSentrySink } from '@logtape/sentry';
import { FetchError, ofetch } from 'ofetch';
import { Result } from 'better-result';
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
		{ category: 'consumer', sinks: ['sentry', 'console'] },
	],
});

// function revGreater(a: string, b: string) {
// 	if (a === b) return false;
// 	const aNum = parseInt(a.split('-')[1]);
// 	const bNum = parseInt(b.split('-')[1]);
// 	return aNum > bNum;
// }

async function storePackument(name: string, rev: string) {
	const [exists] = await db
		.select({ id: packumentTable.id })
		.from(packumentTable)
		.where(eq(packumentTable.id, name));

	// if (exists && revGreater(exists.revId, rev)) {
	// 	logger.debug(`skipped ${name} since existing rev is greater`, {
	// 		pkg: name,
	// 		currentRev: exists.revId,
	// 		newRev: rev,
	// 	});

	// 	return Result.ok();
	// }

	if (exists) {
		return Result.ok();
	}

	const packument = await Result.tryPromise({
		try: async () => {
			const raw = await ofetch(`/${name}`, {
				baseURL: 'https://registry.npmjs.org',
				headers: {
					'User-Agent': `npm.rest (+https://github.com/ghostdevv/npm.rest)`,
				},
				retry: 3,
				retryDelay: 500,
				responseType: 'text',
			});

			return raw.replace(
				/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]+/g,
				'',
			);
		},
		catch: (error) => {
			return error as FetchError<string>;
		},
	});

	if (packument.isErr()) {
		return packument;
	}

	await db
		.insert(packumentTable)
		.values({ id: name, data: packument.value })
		.onConflictDoUpdate({
			target: packumentTable.id,
			set: { data: packument.value },
		});

	return Result.ok();
}

async function dequeue() {
	// Get up to 10 items from the queue that are pending,
	// and aren't currently being processed - the queue table has
	// a unique index on (key, state) so there can always be two entries
	// with the same key (package name), but not two being processed at
	// the same time. This effectively is the logic to make sure that we
	// aren't racing against ourselves and potentially doing the lost
	// update problem.
	return await db.transaction(async (tx) => {
		const where = tx
			.select({ id: queueTable.id })
			.from(queueTable)
			.where(
				and(
					eq(queueTable.state, 'pending'),
					sql`
                        NOT EXISTS (
                            SELECT 1 FROM ${queueTable} q2
                            WHERE q2.key = ${queueTable}.key
                                AND q2.state = 'processing'
                        )
                    `,
				),
			)
			.orderBy(queueTable.createdAt)
			.limit(10)
			.for('update', { skipLocked: true });

		return await tx
			.update(queueTable)
			.set({ state: 'processing', updatedAt: new Date() })
			.where(inArray(queueTable.id, where))
			.returning();
	});
}

export const logger = getLogger('consumer');

while (true) {
	const items = await dequeue();

	logger.debug(`dequeued ${items.length} items`, {
		keys: items.map((item) => item.key),
	});

	const changes = await Promise.all(
		items.map(async (item) => ({
			queueId: item.id,
			queueKey: item.key,
			queueRevId: item.revId,
			queueAttempts: item.attempts,
			result: await storePackument(item.key, item.revId),
		})),
	);

	for (const change of changes) {
		if (change.result.isOk()) {
			logger.debug('packument stored successfully', { ...change });

			await db
				.delete(queueTable)
				.where(eq(queueTable.id, change.queueId));
		} else {
			logger.error('packument store failed', { ...change });
			const newState = change.queueAttempts === 2 ? 'failed' : 'pending';

			const result = await Result.tryPromise({
				try: async () => {
					await db
						.update(queueTable)
						.set({
							attempts: change.queueAttempts + 1,
							updatedAt: new Date(),
							state: newState,
						})
						.where(eq(queueTable.id, change.queueId));
				},
				catch: (error) => error as DrizzleQueryError,
			});

			if (result.isErr()) {
				if (
					result.error.cause &&
					'code' in result.error.cause &&
					result.error.cause.code == '23505'
				) {
					// If the error is a duplicate unique key violation, then
					// we can delete the item from the queue since it's already
					// there.
					await db
						.delete(queueTable)
						.where(eq(queueTable.id, change.queueId));
				} else {
					throw result.error;
				}
			}
		}
	}

	if (items.length < 10) {
		logger.info(`sleeping for 60 seconds`, {
			until_approx: new Date(Date.now() + 60_000).toISOString(),
		});

		await setTimeout(60_000);
	}
}
