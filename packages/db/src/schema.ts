import {
	uniqueIndex,
	timestamp,
	pgTable,
	integer,
	pgEnum,
	jsonb,
	text,
	uuid,
} from 'drizzle-orm/pg-core';

export const stateTable = pgTable('state', {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
});

export const packumentTable = pgTable('packument', {
	id: text().primaryKey().notNull(),
	data: jsonb().notNull(),
});

export const queueState = pgEnum('queue_state', [
	'pending',
	'processing',
	'failed',
]);

export const queueTable = pgTable(
	'queue',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		key: text().notNull(),
		state: queueState().notNull(),
		revId: text().notNull(),
		attempts: integer().notNull().default(0),
		createdAt: timestamp().defaultNow().notNull(),
		updatedAt: timestamp().defaultNow().notNull(),
	},
	(table) => [uniqueIndex('queue_key_state_idx').on(table.key, table.state)],
);
