import { db, queueTable } from '@npm.rest/db';
import { logger, seq } from './shared';
import { eq } from 'drizzle-orm';
import { ofetch } from 'ofetch';

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
	logger.info`starting seed`;

	const meta = await ofetch<MetaResponse>('/', {
		baseURL: 'https://replicate.npmjs.com',
		headers: {
			'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
		},
	});

	logger.debug('fetched replicate meta', { meta });

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

		// When you request with the start key, it's inclusive
		// so we need to remove it from the docs
		if (startKey && docs.rows.at(0)?.key === startKey) {
			docs.rows.shift();
		}

		logger.debug(
			`seed ${count}/${docs.total_rows} (${Math.round((count / docs.total_rows) * 100)}%)`,
			{
				startKey,
				count,
				total_rows: docs.total_rows,
				batch_len: docs.rows.length,
				offset: docs.offset,
			},
		);

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

		count += docs.rows.length;
		startKey = docs.rows.at(-1)?.id || null;

		if (docs.rows.length === 0) {
			logger.info('seeding finished', {
				last_seq: meta.update_seq,
				count,
			});
			await seq.set({ last_seq: meta.update_seq });
			break;
		}
	}
}
