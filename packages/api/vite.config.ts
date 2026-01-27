import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
	plugins: [
		nitro({
			serverDir: './src',
			preset: 'cloudflare-module',
			cloudflare: { deployConfig: true },
		}),
		cloudflare(),
	],
});
