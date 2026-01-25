import { packumentTable } from './schema';
import { fetchPackument } from './fetch';
import { createState, db } from './db';
import { ofetch } from 'ofetch';
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

async function handleRow(row: Row) {
	if (row.id !== row.key) {
		console.info('found case where row.id !== row.key', row);
	}

	const exists = await db
		.select({ id: packumentTable.id })
		.from(packumentTable)
		.where(eq(packumentTable.id, row.id))
		.catch(() => null);

	if (exists?.length) {
		return;
	}

	const res = await fetchPackument(row.id);

	if (res.type === 'error' && res.code !== 'not-found') {
		throw new Error(
			`failed to fetch packument for ${row.id}: ${res.error.message}`,
			{ cause: res.error },
		);
	}

	const packument =
		res.type === 'error' ? { __type: 'error', row } : res.packument;

	await db
		.insert(packumentTable)
		.values({ id: row.id, data: packument })
		.onConflictDoUpdate({
			target: packumentTable.id,
			set: { data: packument },
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
