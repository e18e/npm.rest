import {
	primaryKey,
	timestamp,
	pgTable,
	pgEnum,
	jsonb,
	text,
	index,
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
