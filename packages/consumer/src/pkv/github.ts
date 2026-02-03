// Based on MIT Licensed code from
// https://github.com/unjs/ungh/blob/65de076a6db59bca97e3d04641fe201833b3101b/utils/github.ts#L1-L91

import { ofetch, type FetchOptions } from 'ofetch';
import { env } from 'node:process';

const _tokens = (env.GITHUB_TOKENS || '')
	.split(',')
	.map((token) => token.trim())
	.filter(Boolean);

const ghTokens = _tokens.map((token) => ({
	token,
	valid: false,
	remaining: 0,
	limit: 0,
}));

async function validateGHTokens() {
	await Promise.all(
		ghTokens.map(async (token) => {
			try {
				const res = await ofetch.raw('/meta', {
					baseURL: 'https://api.github.com',
					headers: {
						'User-Agent': 'fetch',
						Authorization: `token ${token.token}`,
					},
				});

				token.remaining = Number.parseInt(
					res.headers.get('x-ratelimit-remaining') || '0',
				);

				token.limit = Number.parseInt(
					res.headers.get('x-ratelimit-limit') || '0',
				);

				token.valid = true;
			} catch {
				token.valid = false;
				token.remaining = 0;
				token.limit = 0;
			}
		}),
	);
}

function getGHToken() {
	const validTokens = ghTokens
		.filter((token) => token.valid && token.remaining > 0)
		.sort((a, b) => b.remaining - a.remaining);

	return validTokens[0];
}

export const ghFetch = async <T>(
	url: string,
	opts: FetchOptions<'json'> = {},
) => {
	let token = getGHToken();

	if (!token) {
		await validateGHTokens();
		token = getGHToken();
	}

	if (!token) {
		throw new Error('No valid GitHub token available');
	}

	return ofetch<T>(url, {
		baseURL: 'https://api.github.com',
		...opts,
		method: (opts.method || 'GET').toUpperCase() as any,
		headers: {
			'User-Agent': 'fetch',
			Authorization: `token ${token.token}`,
			...opts.headers,
		},
	}).catch(async (error_) => {
		await validateGHTokens().catch(() => {});
		throw error_;
	});
};
