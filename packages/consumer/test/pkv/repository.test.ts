import '../setup';
import '@npm.rest/test/mock-db';
import { repositoryTable } from '@npm.rest/db/schema';
import { getRepositories } from '../../src/pkv/repo';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';

describe('get repository', () => {
	it('gets when none exists', async () => {
		const result = await getRepositories([
			{
				type: 'git',
				url: 'git+https://tangled.org/tangled.org/core',
			},
		]);

		// oxlint-disable-next-line eslint-plugin-jest(no-conditional-in-test)
		const repos = result.unwrap() ?? [];
		expect(repos).toHaveLength(1);
		expect(repos[0]).toMatchObject({ id: repos[0].id });
	});

	it('returns id when exists', async () => {
		const id = generateId('repo');

		const [record] = await db
			.insert(repositoryTable)
			.values({
				id,
				type: 'git',
				url: 'git+https://tangled.org/tangled.org/core',
			})
			.returning({ id: repositoryTable.id });

		expect(record).toMatchObject({ id });

		const result = await getRepositories([
			{
				type: 'git',
				url: 'git+https://tangled.org/tangled.org/core',
			},
		]);

		// oxlint-disable-next-line eslint-plugin-jest(no-conditional-in-test)
		const repos = result.unwrap() ?? [];
		expect(repos).toHaveLength(1);
		expect(repos[0]).toMatchObject({ id });
	});

	describe('github metadata', () => {
		it.todo('fetches on creation');
		it.todo("doesn't fetch when metadata is too fresh");
		it.todo('fetches when metadata is too old');
	});
});
