import { redirect, defineHandler } from 'nitro/h3';
import { defineRouteMeta } from 'nitro';
import { DEV } from 'esm-env';

defineRouteMeta({
	openAPI: {
		responses: {
			302: {
				description: 'Redirects to https://docs.npm.rest',
			},
		},
	},
});

export default defineHandler((event) => {
	const url = DEV
		? new URL('/_scalar', event.url.origin)
		: 'https://docs.npm.rest';

	return redirect(url.toString(), 302);
});
