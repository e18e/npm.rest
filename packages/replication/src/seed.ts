import { createState, db, packumentTable } from '@npm.rest/db';
import { FetchError, ofetch } from 'ofetch';
import { eq } from 'drizzle-orm';

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

const dbSeedPickup = createState<MetaResponse>('seed-pickup');
const dbStartKey = createState<string>('seed-last-key');

//             | a technical term
async function getSomething(id: string) {
	try {
		const data = await ofetch(`/${id}`, {
			baseURL: 'https://registry.npmjs.org',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
			retry: 3,
			retryDelay: 500,
			responseType: 'text',
		});

		return {
			__type: 'packument',
			looksLikeJSON: data.startsWith('{'),
			data: data.replace(
				/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]+/g,
				'',
			),
		};
	} catch (e) {
		const error = e as FetchError;

		return {
			__type: 'error',
			error: error.message,
			note: 'failed to fetch packument',
			status: error.status || '??',
		};
	}
}

async function handleRow(row: Row) {
	if (row.id !== row.key) {
		console.info('found case where row.id !== row.key', row);
	}

	const exists = await db
		.select({ id: packumentTable.id })
		.from(packumentTable)
		.where(eq(packumentTable.id, row.id))
		.catch(() => null);

	if (exists?.at(0)?.id) {
		return;
	}

	const data = await getSomething(row.id);

	await db
		.insert(packumentTable)
		.values({ id: row.id, data })
		.onConflictDoUpdate({
			target: packumentTable.id,
			set: { data },
		})
		.catch((error) => {
			throw new Error(`db issue for ${row.id}: ${error}`, {
				cause: error,
			});
		});
}

function chunkArray<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}

	return chunks;
}

async function seed() {
	if (await dbSeedPickup.get()) {
		const meta = await ofetch<MetaResponse>('/', {
			baseURL: 'https://replicate.npmjs.com',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
		});

		console.log(`Starting seed`, meta);
		await dbSeedPickup.set(meta);
	} else {
		console.log('Picking up seed');
	}

	let startKey = await dbStartKey.get();
	let count = 0;

	while (true) {
		const response = await ofetch<DocsResponse>('/registry/_all_docs', {
			baseURL: 'https://replicate.npmjs.com',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
			query: {
				start_key: startKey ? JSON.stringify(startKey) : undefined,
				limit: 100,
			},
		});

		if (response.rows.length === 1) {
			console.log('seeding finished!');
			break;
		}

		for (const chunk of chunkArray(response.rows, 15)) {
			console.log(
				`Processing: ${count}/${response.total_rows - response.offset} (${Math.round((count / (response.total_rows - response.offset)) * 100)}%)`,
			);

			count += chunk.length;

			const results = await Promise.allSettled(
				chunk.map(async (row) => {
					if (row.key === startKey) {
						return null;
					}

					await handleRow(row);
				}),
			);

			const errors = results.filter(
				(result) => result.status === 'rejected',
			);

			if (errors.length > 0) {
				console.log('Errors occurred during processing', errors);
				process.exit(1);
			}
		}

		startKey = response.rows.at(-1)?.key!;
		await dbStartKey.set(startKey);
	}
}

await seed();
