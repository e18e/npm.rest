import { defineConfig } from 'vitest/config';

// oxlint-disable-next-line eslint-plugin-import/no-default-export
export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'html'],
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
