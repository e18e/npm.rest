import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

export const stateTable = pgTable('state', {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
});

export const packumentTable = pgTable('packument', {
	id: text().primaryKey().notNull(),
	data: jsonb().notNull(),
});
