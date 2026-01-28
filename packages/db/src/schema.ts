import {
	primaryKey,
	timestamp,
	pgTable,
	integer,
	pgEnum,
	index,
	jsonb,
	text,
} from 'drizzle-orm/pg-core';

export const stateTable = pgTable('state', {
	key: text().primaryKey(),
	value: text().notNull(),
});

export const packumentTable = pgTable(
	'packument',
	{
		id: text().primaryKey(),
		revId: text(),
		data: jsonb().notNull(),
	},
	(table) => [index('packument_data_gin_idx').using('gin', table.data)],
);

export const changeState = pgEnum('change_state', [
	'pending',
	'processing',
	'failed',
	'completed',
]);

export const changeTable = pgTable(
	'change',
	{
		name: text().notNull(),
		revId: text().notNull(),
		state: changeState().notNull(),
		createdAt: timestamp().defaultNow().notNull(),
		updatedAt: timestamp().defaultNow().notNull(),
	},
	(table) => [
		index('change_state_idx').on(table.state),
		primaryKey({ columns: [table.name, table.revId] }),
	],
);

export const packageTable = pgTable('package', {
	name: text().primaryKey(),
	revId: text().notNull(),
	distTags: jsonb().$type<Record<string, string>>().default({}).notNull(),
	createdAt: timestamp().notNull(),
	npmUpdatedAt: timestamp().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const typesState = pgEnum('types_state', [
	'definitely-typed',
	'built-in',
	'none',
]);

// export const publintTable = pgTable('publint', {
// 	name: text().notNull(),
// 	version: text().notNull(),
// 	publintVersion: text().notNull(),
// 	messages: jsonb().$type<Message[]>(),
// });

export const versionTable = pgTable(
	'version',
	{
		name: text().notNull(),
		version: text().notNull(),
		description: text(),
		repoURL: text(),
		repoDir: text(),
		homepage: text(),
		deprecated: text(),
		license: text(),
		unpackedSize: integer().notNull(),
		packedSize: integer().notNull(),
		types: typesState().notNull(),
		// publint: jsonb().$type<{ version: }>().notNull(),
		// funding:
		publishedAt: timestamp().notNull(),
		updatedAt: timestamp().defaultNow().notNull(),
	},
	(table) => [primaryKey({ columns: [table.name, table.version] })],
);

// export const dependencyTable
// export const repositoryTable
