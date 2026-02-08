import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { PackumentSchema } from '@npm.rest/validate/packument';
import { packumentTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as v from 'valibot';
import {
	isCancel,
	confirm,
	spinner,
	cancel,
	intro,
	outro,
	log,
} from '@clack/prompts';

intro('verify-validate');

const OUTPUT_DIR = join(import.meta.dirname, '../output');

if (!existsSync(OUTPUT_DIR)) {
	await mkdir(OUTPUT_DIR, { recursive: true });
}

const ISSUES_DIR = join(OUTPUT_DIR, './issues');

if (!existsSync(ISSUES_DIR)) {
	await mkdir(ISSUES_DIR, { recursive: true });
} else {
	const files = await readdir(ISSUES_DIR);

	if (files.length) {
		const clear = await confirm({
			message: 'clean issues directory',
			initialValue: false,
		});

		if (isCancel(clear)) {
			cancel('exiting');
			process.exit(1);
		}

		if (clear) {
			await rm(ISSUES_DIR, { recursive: true });
			await mkdir(ISSUES_DIR, { recursive: true });
		}
	}
}

const CHECKPOINT_FILE = join(OUTPUT_DIR, './checkpoint.json');

async function getCheckpoint() {
	if (!existsSync(CHECKPOINT_FILE)) {
		return { offset: 0 };
	}

	const raw = await readFile(CHECKPOINT_FILE, 'utf-8');
	return JSON.parse(raw) as { offset: number };
}

async function saveCheckpoint(offset: number) {
	await writeFile(CHECKPOINT_FILE, JSON.stringify({ offset }));
}

let { offset } = await getCheckpoint();
let processed = 0;
let issues = 0;

const s = spinner();

function msg() {
	return `${issues}/${processed} (${((issues / processed) * 100).toFixed(2)}%) @${offset}`;
}

s.start(msg());

while (true) {
	const packuments = await db
		.select({ data: packumentTable.data })
		.from(packumentTable)
		.orderBy(packumentTable.id)
		.offset(offset)
		.limit(1000);

	if (packuments.length === 0) {
		break;
	}

	offset += packuments.length;

	await Promise.all(
		// oxlint-disable-next-line eslint(no-loop-func): not sure what it means
		packuments.map(async (pkg) => {
			const result = await v.safeParseAsync(PackumentSchema, pkg.data);

			if (result.success) {
				processed++;
				return;
			}

			try {
				await writeFile(
					join(ISSUES_DIR, `${crypto.randomUUID()}.json`),
					// prettier-ignore
					JSON.stringify(result.issues, null, 2),
				);
			} catch (error) {
				// @ts-expect-error shh
				console.error('failed to write', pkg.data.name, error);
			}

			issues++;
		}),
	);

	s.message(msg());
	await saveCheckpoint(offset);

	if (issues >= 10) {
		s.error('too many issues, stopping');
		log.info(msg());
		break;
	}
}

outro('done!');
process.exit(0);
