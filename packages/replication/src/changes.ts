import { db, packumentTable, queueTable } from '@npm.rest/db';
import { setTimeout } from 'node:timers/promises';
import { logger, seq } from './shared';
import { eq } from 'drizzle-orm';
import { ofetch } from 'ofetch';

interface ChangeResult {
	id: string;
	seq: number;
	changes: { rev: string }[];
	deleted?: boolean;
}

interface ChangesResponse {
	results: ChangeResult[];
	last_seq: number;
}

export async function watchChanges() {
	let { last_seq } = (await seq.get())!;

	logger.info('watching changes', { last_seq });

	while (true) {
		const changes = await ofetch<ChangesResponse>('/registry/_changes', {
			baseURL: 'https://replicate.npmjs.com',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
			query: {
				since: last_seq,
				limit: 1000,
			},
		});

		const queueItems: (typeof queueTable.$inferInsert)[] = [];

		for (const change of changes.results) {
			if (change.deleted) {
				await db
					.delete(packumentTable)
					.where(eq(packumentTable.id, change.id));
			} else {
				queueItems.push({
					key: change.id,
					revId: change.changes[0].rev,
					state: 'pending',
				});
			}
		}

		if (queueItems.length) {
			await db
				.insert(queueTable)
				.values(queueItems)
				.onConflictDoUpdate({
					target: [queueTable.key, queueTable.state],
					set: { updatedAt: new Date() },
					setWhere: eq(queueTable.state, 'pending'),
				});
		}

		logger.debug(`changes ${changes.results.length}`, {
			results_len: changes.results.length,
			last_seq: changes.last_seq,
			change_count: queueItems.length,
			deletion_count: changes.results.length - queueItems.length,
		});

		await seq.set({ last_seq: changes.last_seq });
		last_seq = changes.last_seq;

		if (changes.results.length < 1000) {
			logger.info(`sleeping for 180 seconds`, {
				until_approx: new Date(Date.now() + 180_000).toISOString(),
			});

			await setTimeout(180_000);
		}
	}
}
