import { PackumentSchema, type Packument } from '@npm.rest/validate/packument';
import { packumentTable } from '@npm.rest/db/schema';
import { FetchError, ofetch } from 'ofetch';
import { db } from '@npm.rest/db/server';
import { Result } from 'better-result';
import * as v from 'valibot';

type PackumentResult = Result<
	Packument,
	FetchError<string> | v.ValiError<typeof PackumentSchema>
>;

export async function processPackument(name: string): Promise<PackumentResult> {
	const raw = await Result.tryPromise({
		try: async () => {
			return await ofetch<Record<string, unknown>>(`/${name}`, {
				baseURL: 'https://registry.npmjs.org',
				headers: {
					'User-Agent': `npm.rest (+https://github.com/ghostdevv/npm.rest)`,
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

	await db
		.insert(packumentTable)
		.values({ id: name, data: parsed.output })
		.onConflictDoUpdate({
			target: packumentTable.id,
			set: { data: parsed.output },
		});

	return Result.ok(parsed.output);
}
