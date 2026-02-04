import { changeTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
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
			'User-Agent': `npm-alt (+https://github.com/e18e/npm.rest)`,
		},
	});

	logger.debug('fetched replicate meta', { meta });

	let startKey: string | null = null;
	let count = 0;

	while (true) {
		const docs: DocsResponse = await ofetch('/registry/_all_docs', {
			baseURL: 'https://replicate.npmjs.com',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/e18e/npm.rest)`,
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

		if (docs.rows.length === 0) {
			logger.info('seeding finished', {
				last_seq: meta.update_seq,
				count,
			});
			await seq.set({ last_seq: meta.update_seq });
			break;
		}

		await db
			.insert(changeTable)
			.values(
				docs.rows.map((row): typeof changeTable.$inferInsert => ({
					name: row.id,
					revId: row.value.rev,
					state: 'pending',
				})),
			)
			.onConflictDoUpdate({
				target: [changeTable.name, changeTable.revId],
				set: { updatedAt: new Date() },
				setWhere: eq(changeTable.state, 'pending'),
			});

		count += docs.rows.length;
		startKey = docs.rows.at(-1)?.id || null;
	}
}
