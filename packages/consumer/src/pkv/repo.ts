import { repositoryTable, versionRepositoryTable } from '@npm.rest/db/schema';
import type { Repository } from '@npm.rest/validate/packument';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import { and, eq, inArray, notExists } from 'drizzle-orm';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import GitHost from 'hosted-git-info';
import { LRUCache } from 'lru-cache';
import { FetchError } from 'ofetch';
import { ghFetch } from './github';

interface RepoData {
	stargazers_count: number;
	forks: number;
	archived: boolean;
	created_at: string;
	updated_at: string;
}

type LanguageData = Record<string, number>;

export type DatabaseRepository = Pick<
	typeof repositoryTable.$inferSelect,
	'id' | 'url'
>[];

const repoCache = new LRUCache<string, ResourceId<'repo'>>({ max: 200 });

async function getRepository(repo: Repository) {
	const hit = repoCache.get(repo.url);
	if (hit) return Result.ok({ id: hit, created: false });

	const [record] = await db
		.insert(repositoryTable)
		.values({
			id: generateId('repo'),
			type: repo.type,
			url: repo.url,
		})
		.onConflictDoUpdate({
			target: [repositoryTable.url],
			set: { type: repo.type },
		})
		.returning({
			id: repositoryTable.id,
			lastFetched: repositoryTable.lastFetched,
		});

	if (!record) {
		return Result.err(new Error('failed to create/retrieve repo record'));
	}

	const info = GitHost.fromUrl(repo.url);

	if (info?.type === 'github') {
		const result = await Result.tryPromise(async () => {
			const base = `/repos/${info.user}/${info.project}`;

			const [repoData, languageData] = await Promise.all([
				ghFetch<RepoData>(base),
				ghFetch<LanguageData>(`${base}/languages`),
			]);

			await db
				.update(repositoryTable)
				.set({
					stars: repoData.stargazers_count,
					forks: repoData.forks,
					archived: repoData.archived,
					languages: languageData,
					createdAt: new Date(repoData.created_at),
					updatedAt: new Date(repoData.updated_at),
					lastFetched: new Date(),
				})
				.where(eq(repositoryTable.id, record.id));
		});

		if (
			result.isErr() &&
			(!(result.error.cause instanceof FetchError) ||
				result.error.cause.status === 404)
		) {
			// Return error if it's not a 404
			return result;
		}
	}

	repoCache.set(repo.url, record.id);
	return Result.ok({ id: record.id, created: true });
}

export async function getRepositories(pkvRepository?: Repository[] | null) {
	if (!pkvRepository?.length) return Result.ok(null);

	const repositories: DatabaseRepository = [];

	for (const repo of pkvRepository) {
		const result = await getRepository(repo);
		if (result.isErr()) return Result.err(result.error);
		repositories.push({ id: result.value.id, url: repo.url });
	}

	return Result.ok(repositories);
}

export async function updateRepositories(
	tx: Omit<typeof db, '$client'>,
	versionId: ResourceId<'pkv'>,
	next: DatabaseRepository,
	current?: DatabaseRepository,
) {
	// Get the ids of the new (next) group of repositories
	const nextIds = new Set(next.map((repo) => repo.id));

	// Get the ids of any currently stored repositories for this version (if any)
	const currentIds = new Set(current?.map((repo) => repo.id));

	// Work out what is missing from the current set
	const newRepos = nextIds.difference(currentIds);

	if (newRepos.size) {
		await tx.insert(versionRepositoryTable).values(
			newRepos
				.values()
				.map((repoId) => ({
					versionId,
					repositoryId: repoId,
				}))
				.toArray(),
		);
	}

	// Work out what, if any, repositories are no longer present
	// Ordinarily this shouldn't happen, since a packument version is
	// fixed. However, if the way that we parse repositories changes, say a
	// new normalisation it could cause stale repositories to be present.
	const removedRepos = currentIds.difference(nextIds);

	if (removedRepos.size) {
		// Remove the old link between the version and repository
		await tx
			.delete(versionRepositoryTable)
			.where(
				and(
					eq(versionRepositoryTable.versionId, versionId),
					inArray(
						versionRepositoryTable.repositoryId,
						removedRepos.values().toArray(),
					),
				),
			);

		// Cleanup any repositories that are no longer linked to by any
		// versions. Only look for links on the repositories we just removed.
		await tx
			.delete(repositoryTable)
			.where(
				and(
					inArray(
						repositoryTable.id,
						removedRepos.values().toArray(),
					),
					notExists(
						tx
							.select({})
							.from(versionRepositoryTable)
							.where(
								eq(
									versionRepositoryTable.repositoryId,
									repositoryTable.id,
								),
							),
					),
				),
			);
	}
}
