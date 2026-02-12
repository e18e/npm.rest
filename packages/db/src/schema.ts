import { isIdPrefix, type IdPrefix, type ResourceId } from './id';
import { REPOSITORY_TYPES } from '@npm.rest/validate/packument';
import type { Message as PublintMessage } from 'publint';
import { sql } from 'drizzle-orm';
import {
	type ExtraConfigColumn,
	uniqueIndex,
	primaryKey,
	customType,
	timestamp,
	pgSchema,
	integer,
	boolean,
	index,
	jsonb,
	text,
	check,
} from 'drizzle-orm/pg-core';

/**
 * Create a resource id column
 * @param prefix prefix for the resource id
 */
function resourceId<T extends IdPrefix>(prefix: T) {
	return customType<{ data: ResourceId<T>; config: { prefix: T } }>({
		dataType() {
			// create varchar of uuid len + prefix len + 1 for separator
			return `varchar(${36 + prefix.length + 1})`;
		},
	})({ prefix });
}

/**
 * Create the check constraint for resource id column
 *
 * @param name name of the check constraint
 * @param column column to check
 */
function resourceIdCheck(name: string, column: ExtraConfigColumn) {
	// @ts-expect-error shhh
	// oxlint-disable-next-line typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-member-access
	const prefix = column.config?.fieldConfig?.prefix;

	if (!isIdPrefix(prefix)) {
		throw new Error(`Invalid prefix for ${name}: ${prefix}`);
	}

	return check(name, sql`${column} LIKE '${sql.raw(prefix)}_%'`);
}

export const internalSchema = pgSchema('internal');
export const coreSchema = pgSchema('core');

export const stateTable = internalSchema.table('state', {
	key: text().primaryKey(),
	value: text().notNull(),
});

export const packumentTable = internalSchema.table(
	'packument',
	{
		id: text().primaryKey(),
		revId: text(),
		data: jsonb().notNull(),
	},
	(table) => [index('packument_data_gin_idx').using('gin', table.data)],
);

export const changeState = coreSchema.enum('change_state', [
	'pending',
	'processing',
	'failed',
	'completed',
]);

export const changeTable = coreSchema.table(
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

export const packageTable = coreSchema.table(
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

export const typesState = coreSchema.enum('types_state', [
	'definitely-typed',
	'built-in',
	'none',
]);

export const moduleType = coreSchema.enum('module_type', [
	'cjs',
	'esm',
	'dual',
	'faux',
	'dts',
	'unknown',
]);

export const versionTable = coreSchema.table(
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

export const publintTable = coreSchema.table(
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

export const repositoryType = coreSchema.enum(
	'repository_type',
	REPOSITORY_TYPES,
);

export const repositoryTable = coreSchema.table(
	'repository',
	{
		id: resourceId('repo').primaryKey(),
		type: repositoryType().notNull(),
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

export const versionRepositoryTable = coreSchema.table(
	'version_repository',
	{
		versionId: resourceId('pkv')
			.notNull()
			.references(() => versionTable.id, { onDelete: 'cascade' }),
		repositoryId: resourceId('repo')
			.notNull()
			.references(() => repositoryTable.id, { onDelete: 'cascade' }),
		directory: text(),
		branch: text(),
	},
	(table) => [primaryKey({ columns: [table.versionId, table.repositoryId] })],
);

export const dependencyType = coreSchema.enum('dependency_type', [
	'prod',
	'dev',
	'peer',
]);

export const specifierType = coreSchema.enum('specifier_type', [
	'git',
	'tag',
	'version',
	'range',
	'file',
	'directory',
	'remote',
]);

export const specifierTable = coreSchema.table(
	'specifier',
	{
		id: resourceId('spc').primaryKey(),
		name: text().notNull(),
		specifier: text().notNull(),
		type: specifierType().notNull(),
	},
	(table) => [
		resourceIdCheck('specifier_resource_id', table.id),
		uniqueIndex('specifier_name_specifier_idx').on(
			table.name,
			table.specifier,
		),
		index('specifier_name_idx').on(table.name),
	],
);

export const dependencyTable = coreSchema.table(
	'dependency',
	{
		versionId: resourceId('pkv')
			.notNull()
			.references(() => versionTable.id, { onDelete: 'cascade' }),
		specifierId: resourceId('spc')
			.notNull()
			.references(() => specifierTable.id),
		type: dependencyType().notNull(),
		optional: boolean().notNull(),
		alias: text(),
	},
	(table) => [
		primaryKey({
			columns: [table.versionId, table.specifierId, table.type],
		}),
		index('dependency_specifier_idx').on(table.specifierId),
	],
);
