import { generateId, type ResourceId } from '@npm.rest/db/id';
import { repositoryTable } from '@npm.rest/db/schema';
import type HostedGitInfo from 'hosted-git-info';
import { db } from '@npm.rest/db/server';
import { LRUCache } from 'lru-cache';
import { Result } from 'better-result';
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

// LRU cache to prevent unbounded memory growth
const repoCache = new LRUCache<string, ResourceId<'repo'>>({ max: 100 });

async function getRepoRecord(url: string) {
	const hit = repoCache.get(url);
	if (hit) return Result.ok({ id: hit, created: false });

	const [newRecord] = await db
		.insert(repositoryTable)
		.values({
			id: generateId('repo'),
			url: url,
		})
		.onConflictDoNothing()
		.returning({
			id: repositoryTable.id,
			lastFetched: repositoryTable.lastFetched,
		});

	if (newRecord?.id) {
		repoCache.set(url, newRecord.id);
		return Result.ok({ id: newRecord.id, created: true });
	}

	const [record] = await db
		.select({ id: repositoryTable.id })
		.from(repositoryTable)
		.where(eq(repositoryTable.url, url));

	if (!record) {
		return Result.err(new Error('Failed to fetch/store repository'));
	}

	repoCache.set(url, record.id);
	return Result.ok({ id: record.id, created: false });
}

export async function getRepository(info: HostedGitInfo) {
	const url = URL.parse(info.https({ noGitPlus: true }));
	if (!url) return Result.err(new Error('failed to parse repo url'));

	url.hash = '';

	for (const key of url.searchParams.keys()) {
		url.searchParams.delete(key);
	}

	const record = await getRepoRecord(url.toString());
	if (record.isErr()) return record;

	if (url.hostname !== 'github.com' || !record.value.created) {
		return record;
	}

	// If the repo is from GitHub and we just created we can process the metadata
	return await Result.tryPromise(async () => {
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

		return record.value;
	});
}
