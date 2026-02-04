import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['lcov'],
		},
		projects: [
			{
				extends: true,
				test: {
					include: ['./packages/*/test/**/*.test.ts'],
					exclude: ['./packages/*/test/**/*.browser.test.ts'],
				},
			},
		],
	},
});
