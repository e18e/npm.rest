import { db, queueTable } from '@npm.rest/db';
import { eq } from 'drizzle-orm';
import { ofetch } from 'ofetch';
import { seq } from './shared';

interface Row {
	id: string;
	key: string;
	value: {
		rev: string;
	};
}

interface DocsResponse {
	total_rows: number;
	offset: number;
	rows: Row[];
}

interface MetaResponse {
	doc_count: number;
	update_seq: number;
}

export async function seed() {
	const meta = await ofetch<MetaResponse>('/', {
		baseURL: 'https://replicate.npmjs.com',
		headers: {
			'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
		},
	});

	console.log(meta);

	let startKey: string | null = null;
	let count = 0;

	while (true) {
		const docs: DocsResponse = await ofetch('/registry/_all_docs', {
			baseURL: 'https://replicate.npmjs.com',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
			query: {
				start_key: startKey ? JSON.stringify(startKey) : undefined,
				limit: 5000,
			},
		});

		if (docs.rows.length === 1) {
			console.log('seeding finished!');
			await seq.set({ last_seq: meta.update_seq });
			break;
		}

		console.log(
			`Processing: ${count}/${docs.total_rows - docs.offset} (${Math.round((count / (docs.total_rows - docs.offset)) * 100)}%)`,
		);

		count += docs.rows.length;
		startKey = docs.rows.at(-1)?.id || null;

		await db
			.insert(queueTable)
			.values(
				docs.rows.map((row): typeof queueTable.$inferInsert => ({
					key: row.id,
					revId: row.value.rev,
					state: 'pending',
				})),
			)
			.onConflictDoUpdate({
				target: [queueTable.key, queueTable.state],
				set: { updatedAt: new Date() },
				setWhere: eq(queueTable.state, 'pending'),
			});
	}
}
