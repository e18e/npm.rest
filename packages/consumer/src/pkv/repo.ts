import type { Repository } from '@npm.rest/validate/packument';
import { generateId, type ResourceId } from '@npm.rest/db/id';
import { repositoryTable } from '@npm.rest/db/schema';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import GitHost from 'hosted-git-info';
import { LRUCache } from 'lru-cache';
import { FetchError } from 'ofetch';
import { ghFetch } from './github';
import { eq } from 'drizzle-orm';

interface RepoData {
	stargazers_count: number;
	forks: number;
	archived: boolean;
	created_at: string;
	updated_at: string;
}

type LanguageData = Record<string, number>;

const repoCache = new LRUCache<string, ResourceId<'repo'>>({ max: 200 });

async function getRepoRecord(repo: Repository) {
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

	repoCache.set(repo.url, record.id);
	return Result.ok({ id: record.id, created: true });
}

export async function getRepository(repo: Repository) {
	const record = await getRepoRecord(repo);
	if (record.isErr()) return record;

	if (!record.value.created || new URL(repo.url).hostname !== 'github.com') {
		return record;
	}

	const info = GitHost.fromUrl(repo.url);

	if (!info) {
		return Result.err(
			new Error('failed to parse GitHost info from github url'),
		);
	}

	// If the repo is from GitHub and we just created we can process the metadata
	const result = await Result.tryPromise(async () => {
		const base = `/repos/${info.user}/${info.project}`;

		// Fetch repo data and languages in parallel
		const [repo, languageData] = await Promise.all([
			ghFetch<RepoData>(base),
			ghFetch<LanguageData>(`${base}/languages`),
		]);

		await db
			.update(repositoryTable)
			.set({
				stars: repo.stargazers_count,
				forks: repo.forks,
				archived: repo.archived,
				languages: languageData,
				createdAt: new Date(repo.created_at),
				updatedAt: new Date(repo.updated_at),
				lastFetched: new Date(),
			})
			.where(eq(repositoryTable.id, record.value.id));
	});

	if (
		result.isOk() ||
		// oxlint-disable-next-line typescript-eslint(prefer-optional-chain): ??
		(result.isErr() &&
			result.error.cause instanceof FetchError &&
			result.error.cause.status === 404)
	) {
		return record;
	}

	return result;
}
