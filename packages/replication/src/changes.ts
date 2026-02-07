import { changeTable } from '@npm.rest/db/schema';
import { setTimeout } from 'node:timers/promises';
import { and, eq, not, or } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { logger, seq } from './shared';
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
				'User-Agent': `npm-alt (+https://github.com/e18e/npm.rest)`,
			},
			query: {
				since: last_seq,
				limit: 1000,
			},
		});

		const changes = response.results.map(
			(change): typeof changeTable.$inferInsert => ({
				name: change.id,
				revId: change.changes[0].rev,
				state: 'pending',
				deleted: change.deleted,
			}),
		);

		const deletions = changes.filter((change) => change.deleted);

		if (changes.length) {
			await db.transaction(async (tx) => {
				await tx
					.insert(changeTable)
					.values(changes)
					.onConflictDoUpdate({
						target: [changeTable.name, changeTable.revId],
						set: { updatedAt: new Date() },
					});

				for (const deletion of deletions) {
					await tx
						.update(changeTable)
						.set({ state: 'skipped', updatedAt: new Date() })
						.where(
							and(
								eq(changeTable.name, deletion.name),
								or(
									eq(changeTable.state, 'failed'),
									and(
										eq(changeTable.state, 'pending'),
										not(eq(changeTable.deleted, true)),
									),
								),
							),
						);
				}
			});
		}

		logger.debug(`changes ${response.results.length}`, {
			results_len: response.results.length,
			last_seq: response.last_seq,
			change_count: changes.length,
			deletion_count: deletions.length,
		});

		await seq.set({ last_seq: response.last_seq });
		last_seq = response.last_seq;

		if (response.results.length < 1000) {
			logger.info(`sleeping for 90 seconds`, {
				until_approx: new Date(Date.now() + 90_000).toISOString(),
			});

			await setTimeout(90_000);
		}
	}
}
