import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';
import { env } from 'node:process';
import { config } from 'dotenv';

config({ path: resolve('../../.env') });

export default defineConfig({
	out: './.drizzle',
	schema: './src/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		user: env.POSTGRES_USER!,
		password: env.POSTGRES_PASSWORD!,
		database: env.POSTGRES_DB!,
		port: Number.parseInt(env.POSTGRES_PORT!),
		host: env.POSTGRES_HOST!,
	},
});
