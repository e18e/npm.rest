import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import * as v from 'valibot';
import {
	type PackumentVersionSchema,
	PackumentSchema,
} from '@npm.rest/validate/packument';

const PACKUMENTS_PATH = join(import.meta.dirname, '../.packuments');

type PackumentInput = v.InferInput<typeof PackumentSchema>;

export async function fetchPackumentRaw(name: string): Promise<PackumentInput> {
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

export async function fetchPackument(name: string) {
	const packument = await fetchPackumentRaw(name);
	return v.parse(PackumentSchema, packument);
}

type InputPackument = v.InferInput<typeof PackumentSchema>;
type InputPackumentVersion = v.InferInput<typeof PackumentVersionSchema>;

export function createPackumentVersion(version: string): InputPackumentVersion {
	return {
		name: 'my-package',
		description: 'A test package',
		version,
		dist: {
			tarball:
				'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
			integrity: 'sha256-1234567890abcdef',
		},
	};
}

export function createPackument(): InputPackument {
	const version = '1.0.0';

	return {
		name: 'my-package',
		'dist-tags': { latest: version },
		versions: {
			[version]: createPackumentVersion(version),
		},
		time: {
			created: new Date().toISOString(),
			modified: new Date().toISOString(),
			[version]: new Date().toISOString(),
		},
	};
}
