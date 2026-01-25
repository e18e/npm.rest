import { PackumentSchema, type Packument } from '@npm.rest/validate/packument';
import { ofetch, type FetchError } from 'ofetch';
import * as v from 'valibot';

export type FetchPackumentResult =
	| { type: 'success'; packument: Packument }
	| {
			type: 'error';
			code: 'not-found' | 'validation-error' | 'unknown';
			error: Error;
	  };

export async function fetchPackument(name: string): Promise<FetchPackumentResult> {
	try {
		const response = await ofetch(`/${name}`, {
			baseURL: 'https://registry.npmjs.org',
			headers: {
				'User-Agent': `npm-alt (+https://github.com/ghostdevv/npm-alt)`,
			},
			retry: 3,
			retryDelay: 500,
		});

		const result = v.safeParse(PackumentSchema, response);

		if (result.success) {
			return { type: 'success', packument: result.output };
		}

		return {
			type: 'error',
			code: 'validation-error',
			error: new v.ValiError(result.issues),
		};
	} catch (_err) {
		const err = _err as FetchError<Packument>;

		if (err.status === 404) {
			return { type: 'error', code: 'not-found', error: err };
		} else {
			return { type: 'error', code: 'unknown', error: err };
		}
	}
}
