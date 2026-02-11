// Script to display top 10 Git hostname counts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_DIR = join(import.meta.dirname, '../output');
const COUNTS_FILE = join(OUTPUT_DIR, 'repo-git-hostname-counts.json');

async function main() {
	try {
		const raw = await readFile(COUNTS_FILE, 'utf-8');
		const data = JSON.parse(raw) as Record<string, number>;

		const total = Object.values(data).reduce((sum, v) => sum + v, 0);
		const top = Object.entries(data)
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 10);

		console.log('Top 10 Git hostnames:');
		for (const [hostname, count] of top) {
			const percent = total ? ((count / total) * 100).toFixed(2) : '0.00';
			console.log(`${hostname}: ${count} (${percent}%)`);
		}
		console.log(`Total repositories processed: ${total}`);
	} catch (error) {
		console.error('Unable to read hostname counts:', error);
		process.exit(1);
	}
}

await main();
