import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';
import { env } from 'node:process';
// oxlint-disable-next-line e18e/ban-dependencies
import { config } from 'dotenv';

config({ path: resolve('../../.env'), quiet: true });

// oxlint-disable-next-line eslint-plugin-import(no-default-export))
export default defineConfig({
	out: './.drizzle',
	schema: './src/schema.ts',
	dialect: 'postgresql',
	casing: 'snake_case',
	dbCredentials: {
		user: env.POSTGRES_USER!,
		password: env.POSTGRES_PASSWORD!,
		database: env.POSTGRES_DB!,
		port: Number.parseInt(env.POSTGRES_PORT!, 10),
		host: env.POSTGRES_HOST!,
	},
});
