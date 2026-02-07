import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PackumentSchema } from '../src/packument.ts';
import { describe, expect, test } from 'vitest';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import * as v from 'valibot';

const PACKUMENTS_PATH = join(import.meta.dirname, './.packuments');
const PACKUMENTS = ['g', '@aaamrh/first-package'];

type PackumentInput = v.InferInput<typeof PackumentSchema>;

async function fetchPackument(name: string): Promise<PackumentInput> {
	const path = join(PACKUMENTS_PATH, `${name}.json`);

	if (existsSync(path)) {
		return JSON.parse(await readFile(path, 'utf-8')) as PackumentInput;
	}

	const response = await fetch(`https://registry.npmjs.org/${name}`);
	const data = (await response.json()) as PackumentInput;

	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
	return data;
}

// Helper to create a minimal valid packument object
function createValidPackument(): PackumentInput {
	const version = '1.0.0';

	return {
		name: 'my-package',
		description: 'A test package',
		'dist-tags': { latest: version },
		versions: {
			[version]: {
				name: 'my-package',
				description: 'A test package',
				version,
				dist: {
					shasum: '1234567890abcdef',
					tarball:
						'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
					integrity: 'sha512-...',
				},
			},
		},
		time: {
			created: new Date().toISOString(),
			modified: new Date().toISOString(),
			[version]: new Date().toISOString(),
		},
	};
}

describe('PackumentSchema validation', () => {
	test('parses a minimal valid packument', () => {
		const packument = createValidPackument();
		const result = v.parse(PackumentSchema, packument);
		expect(result.name).toBe('my-package');
		expect(result['dist-tags']!.latest).toBe('1.0.0');
		expect(result.versions?.['1.0.0'].dist.tarball).toBe(
			'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
		);
	});

	test('parses version with repository string and transforms to object', () => {
		const packument = createValidPackument();
		// Add repository as a simple string "owner/repo"
		packument.versions!['1.0.0'].repository = 'owner/repo';
		const result = v.parse(PackumentSchema, packument);
		const repo = result.versions?.['1.0.0'].repository;
		expect(repo?.url).toBe('https://github.com/owner/repo');
		expect(repo?.directory).toBeNull();
	});

	test('fails safeParse with invalid date strings in time', () => {
		const packument = createValidPackument();
		packument.time['created'] = 'not-a-date';
		const result = v.safeParse(PackumentSchema, packument);
		expect(result.success).toBeFalsy();
	});

	test.for(PACKUMENTS)('parses real packument "%s"', async (name) => {
		const packument = await fetchPackument(name);
		const result = v.parse(PackumentSchema, packument);
		expect(result.name).toBe(name);
		expect(result.success).toBeFalsy();
	});
});
