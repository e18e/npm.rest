import type { Packument } from '@npm.rest/validate/packument';
import { processPackage } from '../src/pkg/package';
import { processVersion } from '../src/pkv/version';
import type { ResourceId } from '@npm.rest/db/id';

export const REV = '1-placeholder';

export async function insert(pkg: Packument) {
	// oxlint-disable-next-line eslint-plugin-unicorn(no-await-expression-member)
	const pkgId = (await processPackage(pkg, REV)).unwrap();
	const pkvIds: ResourceId<'pkv'>[] = [];

	for (const [version, pkv] of Object.entries(pkg.versions ?? {})) {
		const pkvResult = await processVersion(pkgId, version, pkg, pkv, REV);
		pkvIds.push(pkvResult.unwrap());
	}

	return { pkgId, pkvIds };
}
