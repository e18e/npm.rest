import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { changeTable, packumentTable } from '@npm.rest/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { setTimeout } from 'node:timers/promises';
import { getSentrySink } from '@logtape/sentry';
import { FetchError, ofetch } from 'ofetch';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import * as Sentry from '@sentry/node';
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

function revGreater(a: string, b: string) {
	if (a === b) return false;
	const aNum = parseInt(a.split('-')[1]);
	const bNum = parseInt(b.split('-')[1]);
	return aNum > bNum;
}

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
	// a unique index on (name, revId) so there can always be many entries
	// with the same name and different revIds, but not two being processed at
	// the same time. This effectively is the logic to make sure that we
	// aren't racing against ourselves and potentially doing the lost
	// update problem.
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

	const changes = await Promise.all(
		items.map(async (item) => ({
			name: item.name,
			revId: item.revId,
			result: await storePackument(item.name, item.revId),
		})),
	);

	for (const change of changes) {
		logger.error(
			`packument store ${change.result.isOk() ? 'succeeded' : 'failed'}`,
			{ ...change },
		);

		await db
			.update(changeTable)
			.set({
				updatedAt: new Date(),
				state: change.result.isOk() ? 'completed' : 'failed',
			})
			.where(
				and(
					eq(changeTable.name, change.name),
					eq(changeTable.revId, change.revId),
				),
			);
	}

	if (items.length < 10) {
		logger.info(`sleeping for 60 seconds`, {
			until_approx: new Date(Date.now() + 60_000).toISOString(),
		});

		await setTimeout(60_000);
	}
}
