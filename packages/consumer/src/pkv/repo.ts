import { generateId, type ResourceId } from '@npm.rest/db/id';
import { repositoryTable } from '@npm.rest/db/schema';
import type HostedGitInfo from 'hosted-git-info';
import { db } from '@npm.rest/db/server';
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

const repoCache = new Map<string, ResourceId<'repo'>>();

type RepoRecordResult = Result<
	{ id: ResourceId<'repo'>; lastFetched?: Date },
	Error
>;

async function getRepoRecord(
	url: string,
	lastFetched: Date,
): Promise<RepoRecordResult> {
	const hit = repoCache.get(url);
	if (hit) return Result.ok({ id: hit });

	const [newRecord] = await db
		.insert(repositoryTable)
		.values({
			id: generateId('repo'),
			url: url,
			lastFetched,
		})
		.onConflictDoNothing()
		.returning({
			id: repositoryTable.id,
			lastFetched: repositoryTable.lastFetched,
		});

	if (newRecord?.id) {
		repoCache.set(url, newRecord.id);
		return Result.ok(newRecord);
	}

	const [record] = await db
		.select({ id: repositoryTable.id })
		.from(repositoryTable)
		.where(eq(repositoryTable.url, url));

	if (!record) {
		return Result.err(new Error('Failed to fetch/store repository'));
	}

	repoCache.set(url, record.id);
	return Result.ok(record);
}

export function getRepository(info: HostedGitInfo) {
	return Result.tryPromise(async () => {
		const url = new URL(info.https({ noGitPlus: true }));

		url.hash = '';

		for (const key of url.searchParams.keys()) {
			url.searchParams.delete(key);
		}

		const lastFetched = new Date();
		const record = (
			await getRepoRecord(url.toString(), lastFetched)
		).unwrap();

		// If we didn't just create the record or it's not github,
		// let's just return it. @todo we could also do a recency check instead
		if (
			lastFetched.getTime() !== record.lastFetched?.getTime() ||
			url.hostname !== 'github.com'
		) {
			return record;
		}

		const base = `/repos/${info.user}/${info.project}`;
		const repo = await ghFetch<RepoData>(base);
		const languageData = await ghFetch<LanguageData>(`${base}/languages`);

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
			.where(eq(repositoryTable.id, record.id));
	});
}
