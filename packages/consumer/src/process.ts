import { processPackument } from './shared/packument';
import { processVersion } from './pkv/version';
import { processPackage } from './pkg/package';
import { Result } from 'better-result';
import pLimit from 'p-limit';

export async function process(name: string, rev: string) {
	const packument = await processPackument(name, rev);
	if (packument.isErr()) return packument;

	const packageId = await processPackage(packument.value, rev);
	if (packageId.isErr()) return packageId;

	if (packument.value.versions) {
		const limit = pLimit(3);

		// Process N versions in parallel
		const results = await Promise.all(
			Object.values(packument.value.versions).map((pkv) =>
				limit(async () => {
					return await processVersion(
						packageId.value,
						packument.value,
						pkv,
						rev,
					);
				}),
			),
		);

		// Return first error if any version failed
		for (const result of results) {
			if (result.isErr()) {
				return result;
			}
		}
	}

	return Result.ok();
}
