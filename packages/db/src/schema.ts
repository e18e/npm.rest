import {
	timestamp,
	pgTable,
	pgEnum,
	jsonb,
	text,
	index,
} from 'drizzle-orm/pg-core';

export const stateTable = pgTable('state', {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
});

export const packumentTable = pgTable('packument', {
	id: text().primaryKey().notNull(),
	data: jsonb().notNull(),
});

export const changeState = pgEnum('change_state', [
	'pending',
	'processing',
	'failed',
	'completed',
]);

export const changeTable = pgTable(
	'change',
	{
		name: text().primaryKey(),
		revId: text().primaryKey(),
		state: changeState().notNull(),
		createdAt: timestamp().defaultNow().notNull(),
		updatedAt: timestamp().defaultNow().notNull(),
	},
	(table) => [index('change_state_idx').on(table.state)],
);
