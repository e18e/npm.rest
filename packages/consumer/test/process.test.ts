import '@npm.rest/db/mock';
import { describe, expect, it, vi } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { db } from '@npm.rest/db/server';
import { process } from '../src/process';
import { eq } from 'drizzle-orm';
import {
	type changeTable,
	dependencyTable,
	packageTable,
	packumentTable,
	repositoryTable,
	specifierTable,
	versionTable,
} from '@npm.rest/db/schema';

vi.mock(import('../src/shared/logger'), async () => {
	const { getLogger } = await import('@logtape/logtape');

	return {
		logger: getLogger('test'),
	};
});

vi.mock(import('../src/shared/packument'), () => ({
	processPackument: vi.fn(),
}));

vi.mock(import('../src/pkg/package'), () => ({
	processPackage: vi.fn(),
}));

vi.mock(import('../src/pkv/version'), () => ({
	processVersion: vi.fn(),
}));

describe('process() deletion', () => {
	it('deletes package and packument when item.deleted is true', async () => {
		const packageId = generateId('pkg');
		const packageName = `test-package-${crypto.randomUUID()}`;

		await db.insert(packageTable).values({
			id: packageId,
			name: packageName,
			revId: '1-abc',
			createdAt: new Date(),
			npmUpdatedAt: new Date(),
		});

		await db.insert(packumentTable).values({
			id: packageName,
			revId: '1-abc',
			data: { name: packageName },
		});

		const change: typeof changeTable.$inferSelect = {
			name: packageName,
			revId: '2-def',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		const packages = await db
			.select()
			.from(packageTable)
			.where(eq(packageTable.name, packageName));
		expect(packages).toHaveLength(0);

		const packuments = await db
			.select()
			.from(packumentTable)
			.where(eq(packumentTable.id, packageName));
		expect(packuments).toHaveLength(0);
	});

	it('cascades deletion from package to versions', async () => {
		const packageId = generateId('pkg');
		const versionId = generateId('pkv');
		const packageName = `test-package-${crypto.randomUUID()}`;

		await db.insert(packageTable).values({
			id: packageId,
			name: packageName,
			revId: '1-abc',
			createdAt: new Date(),
			npmUpdatedAt: new Date(),
		});

		await db.insert(versionTable).values({
			id: versionId,
			packageId: packageId,
			version: '1.0.0',
			unpackedSize: 1000,
			packedSize: 500,
			types: 'none',
			moduleType: 'esm',
			publishedAt: new Date(),
		});

		const change: typeof changeTable.$inferSelect = {
			name: packageName,
			revId: '2-def',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		const versions = await db
			.select()
			.from(versionTable)
			.where(eq(versionTable.packageId, packageId));
		expect(versions).toHaveLength(0);
	});

	it('cleans up orphaned specifiers after package deletion', async () => {
		const packageId = generateId('pkg');
		const versionId = generateId('pkv');
		const specifierId = generateId('spc');
		const packageName = `test-package-${crypto.randomUUID()}`;

		// Create package and version
		await db.insert(packageTable).values({
			id: packageId,
			name: packageName,
			revId: '1-abc',
			createdAt: new Date(),
			npmUpdatedAt: new Date(),
		});

		await db.insert(versionTable).values({
			id: versionId,
			packageId: packageId,
			version: '1.0.0',
			unpackedSize: 1000,
			packedSize: 500,
			types: 'none',
			moduleType: 'esm',
			publishedAt: new Date(),
		});

		// Create specifier and dependency
		await db.insert(specifierTable).values({
			id: specifierId,
			name: 'lodash',
			specifier: '^4.17.21',
			type: 'range',
		});

		await db.insert(dependencyTable).values({
			versionId: versionId,
			specifierId: specifierId,
			type: 'prod',
			optional: false,
		});

		const change: typeof changeTable.$inferSelect = {
			name: packageName,
			revId: '2-def',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		// Check that orphaned specifier was deleted
		const specifiers = await db
			.select()
			.from(specifierTable)
			.where(eq(specifierTable.id, specifierId));
		expect(specifiers).toHaveLength(0);
	});

	it('does not delete specifiers still referenced by other packages', async () => {
		const package1Id = generateId('pkg');
		const package2Id = generateId('pkg');
		const version1Id = generateId('pkv');
		const version2Id = generateId('pkv');
		const specifierId = generateId('spc');
		const package1Name = `test-package-1-${crypto.randomUUID()}`;
		const package2Name = `test-package-2-${crypto.randomUUID()}`;

		// Create two packages with versions
		await db.insert(packageTable).values([
			{
				id: package1Id,
				name: package1Name,
				revId: '1-abc',
				createdAt: new Date(),
				npmUpdatedAt: new Date(),
			},
			{
				id: package2Id,
				name: package2Name,
				revId: '1-def',
				createdAt: new Date(),
				npmUpdatedAt: new Date(),
			},
		]);

		await db.insert(versionTable).values([
			{
				id: version1Id,
				packageId: package1Id,
				version: '1.0.0',
				unpackedSize: 1000,
				packedSize: 500,
				types: 'none',
				moduleType: 'esm',
				publishedAt: new Date(),
			},
			{
				id: version2Id,
				packageId: package2Id,
				version: '1.0.0',
				unpackedSize: 1000,
				packedSize: 500,
				types: 'none',
				moduleType: 'esm',
				publishedAt: new Date(),
			},
		]);

		// Create shared specifier
		await db.insert(specifierTable).values({
			id: specifierId,
			name: 'lodash',
			specifier: '^4.17.21',
			type: 'range',
		});

		// Both versions depend on the same specifier
		await db.insert(dependencyTable).values([
			{
				versionId: version1Id,
				specifierId: specifierId,
				type: 'prod',
				optional: false,
			},
			{
				versionId: version2Id,
				specifierId: specifierId,
				type: 'prod',
				optional: false,
			},
		]);

		// Delete first package
		const change: typeof changeTable.$inferSelect = {
			name: package1Name,
			revId: '2-ghi',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		// Specifier should still exist because package2 still references it
		const specifiers = await db
			.select()
			.from(specifierTable)
			.where(eq(specifierTable.id, specifierId));
		expect(specifiers).toHaveLength(1);
	});

	it('cleans up orphaned repositories after package deletion', async () => {
		const packageId = generateId('pkg');
		const versionId = generateId('pkv');
		const repoId = generateId('repo');
		const packageName = `test-package-${crypto.randomUUID()}`;

		// Create repository
		await db.insert(repositoryTable).values({
			id: repoId,
			url: 'https://github.com/test/repo',
			lastFetched: new Date(),
		});

		// Create package and version referencing the repo
		await db.insert(packageTable).values({
			id: packageId,
			name: packageName,
			revId: '1-abc',
			createdAt: new Date(),
			npmUpdatedAt: new Date(),
		});

		await db.insert(versionTable).values({
			id: versionId,
			packageId: packageId,
			version: '1.0.0',
			unpackedSize: 1000,
			packedSize: 500,
			types: 'none',
			moduleType: 'esm',
			repo: repoId,
			publishedAt: new Date(),
		});

		const change: typeof changeTable.$inferSelect = {
			name: packageName,
			revId: '2-def',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		// Check that orphaned repository was deleted
		const repos = await db
			.select()
			.from(repositoryTable)
			.where(eq(repositoryTable.id, repoId));
		expect(repos).toHaveLength(0);
	});

	it('does not delete repositories still referenced by other versions', async () => {
		const package1Id = generateId('pkg');
		const package2Id = generateId('pkg');
		const version1Id = generateId('pkv');
		const version2Id = generateId('pkv');
		const repoId = generateId('repo');
		const package1Name = `test-package-1-${crypto.randomUUID()}`;
		const package2Name = `test-package-2-${crypto.randomUUID()}`;

		// Create shared repository
		await db.insert(repositoryTable).values({
			id: repoId,
			url: 'https://github.com/test/monorepo',
			lastFetched: new Date(),
		});

		// Create two packages with versions
		await db.insert(packageTable).values([
			{
				id: package1Id,
				name: package1Name,
				revId: '1-abc',
				createdAt: new Date(),
				npmUpdatedAt: new Date(),
			},
			{
				id: package2Id,
				name: package2Name,
				revId: '1-def',
				createdAt: new Date(),
				npmUpdatedAt: new Date(),
			},
		]);

		// Both versions reference the same repo
		await db.insert(versionTable).values([
			{
				id: version1Id,
				packageId: package1Id,
				version: '1.0.0',
				unpackedSize: 1000,
				packedSize: 500,
				types: 'none',
				moduleType: 'esm',
				repo: repoId,
				publishedAt: new Date(),
			},
			{
				id: version2Id,
				packageId: package2Id,
				version: '1.0.0',
				unpackedSize: 1000,
				packedSize: 500,
				types: 'none',
				moduleType: 'esm',
				repo: repoId,
				publishedAt: new Date(),
			},
		]);

		// Delete first package
		const change: typeof changeTable.$inferSelect = {
			name: package1Name,
			revId: '2-ghi',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		// Repository should still exist because package2 still references it
		const repos = await db
			.select()
			.from(repositoryTable)
			.where(eq(repositoryTable.id, repoId));
		expect(repos).toHaveLength(1);
	});

	it('performs all deletions in a transaction', async () => {
		const packageId = generateId('pkg');
		const versionId = generateId('pkv');
		const specifierId = generateId('spc');
		const repoId = generateId('repo');
		const packageName = `test-package-${crypto.randomUUID()}`;

		// Create repository
		await db.insert(repositoryTable).values({
			id: repoId,
			url: 'https://github.com/test/repo',
			lastFetched: new Date(),
		});

		// Create package and version
		await db.insert(packageTable).values({
			id: packageId,
			name: packageName,
			revId: '1-abc',
			createdAt: new Date(),
			npmUpdatedAt: new Date(),
		});

		await db.insert(versionTable).values({
			id: versionId,
			packageId: packageId,
			version: '1.0.0',
			unpackedSize: 1000,
			packedSize: 500,
			types: 'none',
			moduleType: 'esm',
			repo: repoId,
			publishedAt: new Date(),
		});

		// Create specifier and dependency
		await db.insert(specifierTable).values({
			id: specifierId,
			name: 'lodash',
			specifier: '^4.17.21',
			type: 'range',
		});

		await db.insert(dependencyTable).values({
			versionId: versionId,
			specifierId: specifierId,
			type: 'prod',
			optional: false,
		});

		await db.insert(packumentTable).values({
			id: packageName,
			revId: '1-abc',
			data: { name: packageName },
		});

		const change: typeof changeTable.$inferSelect = {
			name: packageName,
			revId: '2-def',
			state: 'pending',
			deleted: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await process(change);

		// Verify everything was deleted
		const packages = await db
			.select()
			.from(packageTable)
			.where(eq(packageTable.name, packageName));
		expect(packages).toHaveLength(0);

		const versions = await db
			.select()
			.from(versionTable)
			.where(eq(versionTable.id, versionId));
		expect(versions).toHaveLength(0);

		const specifiers = await db
			.select()
			.from(specifierTable)
			.where(eq(specifierTable.id, specifierId));
		expect(specifiers).toHaveLength(0);

		const repos = await db
			.select()
			.from(repositoryTable)
			.where(eq(repositoryTable.id, repoId));
		expect(repos).toHaveLength(0);

		const packuments = await db
			.select()
			.from(packumentTable)
			.where(eq(packumentTable.id, packageName));
		expect(packuments).toHaveLength(0);
	});
});
