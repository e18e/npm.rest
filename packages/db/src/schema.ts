import { isIdPrefix, type IdPrefix, type ResourceId } from './id';
import type { Message as PublintMessage } from 'publint';
import { sql } from 'drizzle-orm';
import {
	type ExtraConfigColumn,
	uniqueIndex,
	primaryKey,
	customType,
	timestamp,
	pgTable,
	integer,
	boolean,
	pgEnum,
	index,
	jsonb,
	text,
	check,
} from 'drizzle-orm/pg-core';

/** Create a resource id column with the given prefix. */
function resourceId<T extends IdPrefix>(prefix: T) {
	return customType<{ data: ResourceId<T>; config: { prefix: T } }>({
		dataType() {
			return 'text';
		},
	})({ prefix });
}

/** Create the check constraint for resource id column */
function resourceIdCheck(name: string, column: ExtraConfigColumn) {
	// @ts-expect-error shhh
	const prefix = column.config?.fieldConfig?.prefix;

	if (!isIdPrefix(prefix)) {
		throw new Error(`Invalid prefix for ${name}: ${prefix}`);
	}

	return check(name, sql`${column} LIKE '${sql.raw(prefix)}_%'`);
}

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

export const packageTable = pgTable(
	'package',
	{
		id: resourceId('pkg').primaryKey(),
		name: text().notNull(),
		revId: text().notNull(),
		distTags: jsonb().$type<Record<string, string>>().default({}).notNull(),
		createdAt: timestamp().notNull(),
		npmUpdatedAt: timestamp().notNull(),
		updatedAt: timestamp().defaultNow().notNull(),
	},
	(table) => [
		resourceIdCheck('package_resource_id', table.id),
		uniqueIndex('package_name_unique_idx').on(table.name),
	],
);

export const typesState = pgEnum('types_state', [
	'definitely-typed',
	'built-in',
	'none',
]);

export const moduleType = pgEnum('module_type', [
	'cjs',
	'esm',
	'dual',
	'faux',
	'dts',
	'unknown',
]);

export const versionTable = pgTable(
	'version',
	{
		id: resourceId('pkv').primaryKey(),
		packageId: resourceId('pkg')
			.notNull()
			.references(() => packageTable.id, { onDelete: 'cascade' }),
		version: text().notNull(),
		description: text(),
		homepage: text(),
		deprecated: text(),
		license: text(),
		unpackedSize: integer().notNull(),
		packedSize: integer().notNull(),
		types: typesState().notNull(),
		moduleType: moduleType().notNull(),
		keywords: text().array(),
		repo: resourceId('repo').references(() => repositoryTable.id),
		repoDirectory: text(),
		repoBranch: text(),
		// funding:
		publishedAt: timestamp().notNull(),
		updatedAt: timestamp().defaultNow().notNull(),
	},
	(table) => [
		resourceIdCheck('version_resource_id', table.id),
		resourceIdCheck('version_package_resource_id', table.packageId),
		uniqueIndex('version_package_id_version_unique_idx').on(
			table.packageId,
			table.version,
		),
	],
);

export const publintTable = pgTable(
	'publint',
	{
		id: resourceId('publ').primaryKey(),
		versionId: resourceId('pkv')
			.notNull()
			.references(() => versionTable.id, { onDelete: 'cascade' }),
		publintVersion: text().notNull(),
		messages: jsonb().$type<PublintMessage[]>().notNull(),
	},
	(table) => [
		resourceIdCheck('publint_resource_id', table.id),
		resourceIdCheck('publint_version_resource_id', table.versionId),
		uniqueIndex('publint_version_unique_idx').on(table.versionId),
	],
);

export const repositoryTable = pgTable(
	'repository',
	{
		id: resourceId('repo').primaryKey(),
		url: text().notNull(),
		stars: integer(),
		forks: integer(),
		archived: boolean(),
		languages: jsonb().$type<Record<string, number>>(),
		createdAt: timestamp(),
		updatedAt: timestamp(),
		lastFetched: timestamp().notNull().defaultNow(),
	},
	(table) => [
		resourceIdCheck('repository_resource_id', table.id),
		uniqueIndex('repository_url_unique_idx').on(table.url),
	],
);

export const dependencyType = pgEnum('dependency_type', [
	'prod',
	'dev',
	'peer',
]);

export const specifierType = pgEnum('specifier_type', [
	'git',
	'tag',
	'version',
	'range',
	'file',
	'directory',
	'remote',
]);

export const dependencySpecTable = pgTable(
	'dependency_spec',
	{
		id: resourceId('dsp').primaryKey(),
		name: text().notNull(),
		specifier: text().notNull(),
		type: specifierType().notNull(),
		resolvedPackageId: resourceId('pkv').references(() => packageTable.id),
	},
	(table) => [
		resourceIdCheck('dependency_spec_resource_id', table.id),
		uniqueIndex('dependency_spec_name_specifier_idx').on(
			table.name,
			table.specifier,
		),
		index('dependency_spec_name_idx').on(table.name),
	],
);

export const versionDependencyTable = pgTable(
	'version_dependency',
	{
		versionId: resourceId('pkv')
			.notNull()
			.references(() => versionTable.id, { onDelete: 'cascade' }),
		specId: resourceId('dsp')
			.notNull()
			.references(() => dependencySpecTable.id),
		type: dependencyType().notNull(),
		optional: boolean().notNull(),
		alias: text(),
	},
	(table) => [
		primaryKey({ columns: [table.versionId, table.specId, table.type] }),
		index('version_dependency_spec_idx').on(table.specId),
	],
);

// export const dependencyTable = pgTable(
// 	'dependency',
// 	{
// 		id: resourceId('dep').primaryKey(),
// 		fromVersionId: resourceId('pkv')
// 			.notNull()
// 			.references(() => versionTable.id, { onDelete: 'cascade' }),
// 		type: dependencyType().notNull(),
// 		name: text().notNull(),
// 		specifier: text().notNull(),
// 		optional: boolean().notNull(),
// 	},
// 	(table) => [
// 		resourceIdCheck('dependency_resource_id', table.id),
// 		resourceIdCheck(
// 			'dependency_from_version_resource_id',
// 			table.fromVersionId,
// 		),
// 		uniqueIndex('dependency_from_version_type_name_unique_idx').on(
// 			table.fromVersionId,
// 			table.type,
// 			table.name,
// 		),
// 	],
// );
