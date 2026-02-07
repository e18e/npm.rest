import { getDependencies } from '../../src/pkv/dependencies';
import { describe, expect, it } from 'vitest';

describe('dependencies parsing', () => {
	it('handles workspace: spec', () => {
		const deps = getDependencies({
			name: '@a-type/rsbuild-plugin-unocss',
			version: '0.0.6',
			dist: {
				shasum: '2a23597f192ba0de07c26a6686cc56c0e9055296',
				tarball:
					'https://registry.npmjs.org/@a-type/rsbuild-plugin-unocss/-/rsbuild-plugin-unocss-0.0.6.tgz',
				integrity:
					'sha512-rVZxVkwEDh9bS6/BIx1WTC4ZS7zfS9PGXiM3GpeIONodiWXrL8BK+q5R/lzI3X1B2UNBGAmsQzENQaHbo+aSeg==',
			},
			devDependencies: {
				react: 'catalog:',
				unocss: '^66.4.2',
				vitest: '^3.2.4',
				'react-dom': 'catalog:',
				playwright: '^1.53.2',
				typescript: '^5.8.3',
				'@rslib/core': '^0.10.4',
				'@types/node': '^22.15.34',
				'@types/react': 'catalog:',
				'@rsbuild/core': '^1.4.2',
				'@biomejs/biome': '^2.1.1',
				'@playwright/test': '^1.53.2',
				'@types/react-dom': 'catalog:',
				'simple-git-hooks': '^2.13.0',
				'@rsbuild/plugin-react': 'catalog:',
			},
		});

		expect(deps.status).toBe('ok');
		expect(deps.unwrap()).toMatchSnapshot();
	});
});
