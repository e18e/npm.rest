import { changeTable } from '@npm.rest/db/schema';
import { defineHandler } from 'nitro/h3';
import { env } from 'cloudflare:workers';
import { defineRouteMeta } from 'nitro';
import { count } from 'drizzle-orm';
import { getDB } from '$lib/db';

defineRouteMeta({
	openAPI: {
		responses: {},
	},
});

export default defineHandler(async (event) => {
	const db = await getDB(env);

	const changeCounts = await db
		.select({
			state: changeTable.state,
			count: count(),
		})
		.from(changeTable)
		.groupBy(changeTable.state);

	return {
		success: true,
		changes: Object.fromEntries(
			changeCounts.map((c) => [c.state, c.count]),
		),
	};
});
