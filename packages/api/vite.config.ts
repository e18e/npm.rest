import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import { nitro } from 'nitro/vite';
import { join } from 'node:path';

// Dynamically load the hyperdrive env var from the
// root .env file during development.
if (process.env.NODE_ENV === 'development') {
	const HYPERDRIVE_VAR =
		'CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_PG_HYPERDRIVE';

	const env = loadEnv(
		'development',
		join(import.meta.dirname, '../../'),
		'CLOUDFLARE_HYPERDRIVE',
	);

	process.env[HYPERDRIVE_VAR] ??= env[HYPERDRIVE_VAR];
}

export default defineConfig({
	plugins: [
		nitro({
			serverDir: './src',
			preset: 'cloudflare-module',
			cloudflare: { deployConfig: true },
			errorHandler: './src/error.ts',
			experimental: {
				vite: {},
				openAPI: true,
			},
			openAPI: {
				production: 'runtime',
				route: '/_openapi.json',
				ui: { scalar: false, swagger: false },
				meta: {
					title: 'npm.rest',
				},
			},
		}),
		cloudflare(),
	],
	resolve: {
		alias: {
			$lib: join(import.meta.dirname, './src/lib'),
		},
	},
});
