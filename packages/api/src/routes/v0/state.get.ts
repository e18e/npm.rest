import { defineHandler } from 'nitro/h3';
import { env } from 'cloudflare:workers';
import { defineRouteMeta } from 'nitro';
import { count } from 'drizzle-orm';
import { getDB } from '$lib/db';
import {
	dependencyTable,
	packageTable,
	versionTable,
	changeTable,
	specifierTable,
} from '@npm.rest/db/schema';

defineRouteMeta({
	openAPI: {
		responses: {},
	},
});

export default defineHandler(async (event) => {
	const db = await getDB(env);

	const changes = await db
		.select({
			state: changeTable.state,
			count: count(),
		})
		.from(changeTable)
		.groupBy(changeTable.state);

	const packages = await db.$count(packageTable);
	const versions = await db.$count(versionTable);
	const dependencies = await db.$count(dependencyTable);
	const specifiers = await db.$count(specifierTable);

	return {
		success: true,
		changes: Object.fromEntries(changes.map((c) => [c.state, c.count])),
		packages,
		versions,
		dependencies,
		specifiers,
	};
});
