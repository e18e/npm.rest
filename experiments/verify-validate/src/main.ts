import { PackumentSchema, type License } from '@npm.rest/validate/packument';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { packumentTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { uniqueDeep } from './unique';
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

const ALL_REPO_TYPES_FILE = join(OUTPUT_DIR, './all-repository-types.json');
const ALL_FUNDING_TYPES_FILE = join(OUTPUT_DIR, './all-funding-types.json');
const REPO_TYPE_COUNTS_FILE = join(OUTPUT_DIR, './repo-type-counts.json');
const REPO_GIT_HOSTNAME_COUNTS_FILE = join(
	OUTPUT_DIR,
	'./repo-git-hostname-counts.json',
);
const FUNDING_TYPE_COUNTS_FILE = join(OUTPUT_DIR, './funding-type-counts.json');
const LICENSES_FILE = join(OUTPUT_DIR, './licenses.json');

async function getThingy(path: string) {
	if (!existsSync(path)) {
		return {} as Record<string, unknown[]>;
	}

	const raw = await readFile(path, 'utf-8');
	return JSON.parse(raw) as Record<string, unknown[]>;
}

async function saveThingy(path: string, data: Record<string, unknown[]>) {
	for (const value of Object.values(data)) {
		uniqueDeep(value);
	}

	await writeFile(path, JSON.stringify(data, null, 2));
}

let allFundingTypes = await getThingy(ALL_FUNDING_TYPES_FILE);
let allRepoTypes = await getThingy(ALL_REPO_TYPES_FILE);

// Keep only 'unknown' types for the saved unknown lists
allFundingTypes = { unknown: allFundingTypes.unknown ?? [] };
allRepoTypes = { unknown: allRepoTypes.unknown ?? [] };

// Prepare map for git repo hostname counts
const gitHostnameCounts: Record<string, number> = {};

const licenses = (await getThingy(LICENSES_FILE)) as {
	l?: (string | License)[];
};

let { offset } = await getCheckpoint();
let processed = 0;
let issues = 0;

const s = spinner();

function msg() {
	return `${issues}/${processed} (${((issues / processed) * 100).toFixed(2)}%) @${offset}`;
}

s.start(msg());

// function tryExtractType(rawPkg: unknown, version: string, key: string) {
// 	// @ts-expect-error necessary evil
// 	// oxlint-disable-next-line typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-member-access
// 	const f = rawPkg?.versions?.[version]?.[key];
// 	const a = Array.isArray(f) ? f : [f];
// 	const t = a
// 		// oxlint-disable-next-line typescript-eslint/no-unsafe-return, typescript-eslint/no-unsafe-member-access
// 		.map((f) => (f && typeof f === 'object' && 'type' in f ? f : null))
// 		.filter((t) => t !== null);

// 	// oxlint-disable-next-line typescript-eslint/no-unsafe-return
// 	return t;
// }

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
		// oxlint-disable-next-line eslint/no-loop-func not sure what it means
		packuments.map(async (pkg) => {
			const result = await v.safeParseAsync(PackumentSchema, pkg.data);

			if (result.success) {
				const { versions } = result.output;

				if (versions) {
					for (const [_version, pkv] of Object.entries(versions)) {
						// if (pkv.funding?.some((f) => f.type === 'unknown')) {
						// 	const types = tryExtractType(
						// 		pkg.data,
						// 		version,
						// 		'funding',
						// 	);

						// 	if (types.length === 0) {
						// 		unknownFundingType.unknown ??= [];
						// 		unknownFundingType.unknown.push(`pkg:${name}`);
						// 	} else {
						// 		for (const item of types) {
						// 			// oxlint-disable-next-linetypescript-eslint/no-unsafe-member-access
						// 			(unknownFundingType[item.type] ??= []).push(
						// 				item,
						// 			);
						// 		}
						// 	}
						// }

						// if (pkv.repository?.some((r) => r.type === 'unknown')) {
						// 	const types = tryExtractType(
						// 		pkg.data,
						// 		version,
						// 		'repository',
						// 	);

						// 	if (types.length === 0) {
						// 		unknownRepoType.unknown ??= [];
						// 		unknownRepoType.unknown.push(`pkg:${name}`);
						// 	} else {
						// 		for (const item of types) {
						// 			// oxlint-disable-next-linetypescript-eslint/no-unsafe-member-access
						// 			(unknownRepoType[item.type] ??= []).push(
						// 				item,
						// 			);
						// 		}
						// 	}
						// }

						for (const f of pkv.funding ?? []) {
							if (f.type === 'unknown') {
								allFundingTypes[f.type] ??= [];
								allFundingTypes[f.type].push(f.url);
							}
						}

						for (const r of pkv.repository ?? []) {
							if (r.type === 'unknown') {
								allRepoTypes[r.type] ??= [];
								allRepoTypes[r.type].push(r.url);
							}

							if (r.type === 'git' && r.url) {
								const hostname = new URL(r.url).hostname;
								gitHostnameCounts[hostname] =
									(gitHostnameCounts[hostname] ?? 0) + 1;
							}
						}

						for (const l of pkv.license ?? []) {
							licenses.l ??= [];

							if (
								!l.type ||
								Object.entries(l).filter(([, v]) => v !== null)
									.length > 1
							) {
								licenses.l.push(l);
							} else {
								licenses.l.push(l.type);
							}
						}
					}
				}

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
	await saveThingy(ALL_FUNDING_TYPES_FILE, allFundingTypes);
	await saveThingy(ALL_REPO_TYPES_FILE, allRepoTypes);
	await saveThingy(LICENSES_FILE, licenses);

	// Save counts of each unknown type
	const fundingCounts = Object.fromEntries(
		Object.entries(allFundingTypes).map(([type, arr]) => [
			type,
			arr.length,
		]),
	);
	await writeFile(
		FUNDING_TYPE_COUNTS_FILE,
		JSON.stringify(fundingCounts, null, 2),
	);

	const repoCounts = Object.fromEntries(
		Object.entries(allRepoTypes).map(([type, arr]) => [type, arr.length]),
	);
	await writeFile(REPO_TYPE_COUNTS_FILE, JSON.stringify(repoCounts, null, 2));

	// Save git hostname counts
	await writeFile(
		REPO_GIT_HOSTNAME_COUNTS_FILE,
		JSON.stringify(gitHostnameCounts, null, 2),
	);

	if (issues >= 10) {
		s.error('too many issues, stopping');
		log.info(msg());
		break;
	}
}

outro('done!');
process.exit(0);
