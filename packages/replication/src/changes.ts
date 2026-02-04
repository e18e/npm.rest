import { packumentTable, changeTable } from '@npm.rest/db/schema';
import { setTimeout } from 'node:timers/promises';
import { db } from '@npm.rest/db/server';
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
		const response = await ofetch<ChangesResponse>('/registry/_changes', {
			baseURL: 'https://replicate.npmjs.com',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
			query: {
				since: last_seq,
				limit: 1000,
			},
		});

		const changes: (typeof changeTable.$inferInsert)[] = [];

		for (const change of response.results) {
			if (change.deleted) {
				await db
					.delete(packumentTable)
					.where(eq(packumentTable.id, change.id));
			} else {
				changes.push({
					name: change.id,
					revId: change.changes[0].rev,
					state: 'pending',
				});
			}
		}

		if (changes.length) {
			await db.insert(changeTable).values(changes);
			// .onConflictDoUpdate({
			// 	target: [changeTable.name, changeTable.state],
			// 	set: { updatedAt: new Date() },
			// 	setWhere: eq(changeTable.state, 'pending'),
			// });
		}

		logger.debug(`changes ${response.results.length}`, {
			results_len: response.results.length,
			last_seq: response.last_seq,
			change_count: changes.length,
			deletion_count: response.results.length - changes.length,
		});

		await seq.set({ last_seq: response.last_seq });
		last_seq = response.last_seq;

		if (response.results.length < 1000) {
			logger.info(`sleeping for 180 seconds`, {
				until_approx: new Date(Date.now() + 180_000).toISOString(),
			});

			await setTimeout(180_000);
		}
	}
}
