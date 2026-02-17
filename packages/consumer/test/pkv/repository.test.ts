import '../setup';
import '@npm.rest/test/mock-db';
import { repositoryTable } from '@npm.rest/db/schema';
import { getRepository } from '../../src/pkv/repo';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { eq } from 'drizzle-orm';

describe('get repository', () => {
	it('gets when none exists', async () => {
		const result = await getRepository({
			type: 'git',
			url: 'git+https://tangled.org/tangled.org/core',
		});

		const { id } = result.unwrap();

		const [record] = await db
			.select()
			.from(repositoryTable)
			.where(eq(repositoryTable.id, id));

		expect(record).toMatchObject({
			id,
			type: 'git',
			url: 'git+https://tangled.org/tangled.org/core',
		});
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

		const result = await getRepository({
			type: 'git',
			url: 'git+https://tangled.org/tangled.org/core',
		});

		expect(result.unwrap()).toMatchObject({ id });
	});

	describe('github metadata', () => {
		it.todo('fetches on creation');
		it.todo("doesn't fetch when metadata is too fresh");
		it.todo('fetches when metadata is too old');
	});
});
