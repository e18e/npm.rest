import '../setup';
import { databaseSnapshot } from '@npm.rest/test/mock-db';
import { processVersion } from '../../src/pkv/version';
import { describe, expect, it } from 'vitest';
import { generateId } from '@npm.rest/db/id';
import { insert, REV } from '../utils';
import {
	createPackumentVersion,
	createPackument,
} from '@npm.rest/test/packument';

describe('process version', () => {
	it('works basically', async () => {
		const pkv = createPackumentVersion('1.0.0');
		const pkg = createPackument([pkv]);

		const { pkgId, pkvIds } = await insert(pkg);
		const snapshot = await databaseSnapshot();

		expect(snapshot.package).toHaveLength(1);
		expect(snapshot.version).toHaveLength(1);

		expect(snapshot).toMatchObject({
			package: [
				{
					id: pkgId,
					revId: REV,
					name: 'my-package',
					distTags: { latest: '1.0.0' },
				},
			],
			version: [
				{
					id: pkvIds[0],
					packageId: pkgId,
					version: '1.0.0',
				},
			],
		});
	});

	it('errors if given version and pkv.version are different', async () => {
		const pkv = createPackumentVersion('1.0.0');
		const pkg = createPackument([pkv]);

		const result = await processVersion(
			generateId('pkg'),
			'1.0.1',
			pkg,
			pkv,
			REV,
		);

		expect(result).toMatchObject({
			status: 'error',
			error: new Error('Version mismatch'),
		});
	});

	it.todo('updates repositories that change');
	it.todo('updates funding that changes');
});
