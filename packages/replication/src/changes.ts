import { db, packumentTable, queueTable } from '@npm.rest/db';
import { setTimeout } from 'node:timers/promises';
import { eq } from 'drizzle-orm';
import { ofetch } from 'ofetch';
import { seq } from './shared';

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

		console.log(`batch of ${changes.results.length} changes`);

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

		await seq.set({ last_seq: changes.last_seq });
		last_seq = changes.last_seq;

		if (changes.results.length < 1000) {
			await setTimeout(180_000);
		}
	}
}
