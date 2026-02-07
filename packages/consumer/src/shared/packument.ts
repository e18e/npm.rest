import { PackumentSchema, type Packument } from '@npm.rest/validate/packument';
import { packumentTable } from '@npm.rest/db/schema';
import { logger } from '../shared/logger';
import type { FetchError } from 'ofetch';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import { eq } from 'drizzle-orm';
import { ofetch } from 'ofetch';
import * as v from 'valibot';

export type PackumentResult = Result<
	Packument,
	FetchError<string> | v.ValiError<typeof PackumentSchema>
>;

function revGreater(a: string, b: string) {
	if (a === b) return false;
	const aNum = Number.parseInt(a.split('-')[1], 10);
	const bNum = Number.parseInt(b.split('-')[1], 10);
	return aNum > bNum;
}

export async function processPackument(
	name: string,
	rev: string,
): Promise<PackumentResult> {
	const [exists] = await db
		.select()
		.from(packumentTable)
		.where(eq(packumentTable.id, name));

	if (
		exists?.revId &&
		(exists.revId === rev || revGreater(exists.revId, rev))
	) {
		logger.debug(`skipped fetching packument as it exists in db`, {
			existingRev: exists.revId,
			name,
			rev,
		});

		const parsed = v.safeParse(PackumentSchema, exists.data);

		if (!parsed.success) {
			return Result.err(new v.ValiError(parsed.issues));
		}

		return Result.ok(parsed.output);
	}

	const raw = await Result.tryPromise({
		try: async () => {
			return await ofetch<Record<string, unknown>>(`/${name}`, {
				baseURL: 'https://registry.npmjs.org',
				headers: {
					'User-Agent': `npm.rest (+https://github.com/e18e/npm.rest)`,
				},
				retry: 3,
				retryDelay: 500,
			});
		},
		catch: (error) => {
			return error as FetchError<string>;
		},
	});

	if (raw.isErr()) {
		return raw;
	}

	const parsed = v.safeParse(PackumentSchema, raw.value);

	if (!parsed.success) {
		return Result.err(new v.ValiError(parsed.issues));
	}

	const inserted = await Result.tryPromise(async () => {
		await db
			.insert(packumentTable)
			.values({
				id: name,
				data: raw.value, // intentionally save the raw packument
				revId: parsed.output._rev ?? rev,
			})
			.onConflictDoUpdate({
				target: packumentTable.id,
				set: { data: parsed.output },
			});
	});

	if (inserted.isErr()) {
		return inserted;
	}

	return Result.ok(parsed.output);
}
