import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';
import { join } from 'node:path';

export default defineConfig({
	plugins: [
		nitro({
			serverDir: './src',
			preset: 'cloudflare-module',
			cloudflare: { deployConfig: true },
			errorHandler: './src/error.ts',
		}),
		cloudflare(),
	],
	resolve: {
		alias: {
			$lib: join(import.meta.dirname, './src/lib'),
		},
	},
});
