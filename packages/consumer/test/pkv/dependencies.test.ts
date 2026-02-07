import { getDependencies } from '../../src/pkv/dependencies';
import { fetchPackument } from '@npm.rest/test/packument';
import { describe, expect, it } from 'vitest';

describe('dependencies parsing', () => {
	it('handles catalog: spec', async () => {
		const pkg = await fetchPackument('@a-type/rsbuild-plugin-unocss');
		const version = pkg.versions?.['0.0.6'];
		expect(version).toBeTruthy();

		const deps = getDependencies(version!);
		expect(deps.status).toBe('ok');
		expect(deps.unwrap()).toMatchSnapshot();
	});

	it('handles workspace: spec', async () => {
		const pkg = await fetchPackument('@aa-lib/sdk');
		const version = pkg.versions?.['0.1.0'];
		expect(version).toBeTruthy();

		const deps = getDependencies(version!);
		expect(deps.status).toBe('ok');
		expect(deps.unwrap()).toMatchSnapshot();
	});
});
