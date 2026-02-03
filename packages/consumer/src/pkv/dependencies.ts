import type { PackumentVersion } from '@npm.rest/validate/packument';
import type { dependencyTable } from '@npm.rest/db/schema';
// import parsePackage from 'npm-package-arg';
import { Result } from 'better-result';

type DependencyType = (typeof dependencyTable.$inferSelect)['type'];

type Dependency = Pick<
	typeof dependencyTable.$inferSelect,
	'type' | 'name' | 'specifier' | 'optional'
>;

/**
 * Helper to collect dependencies from the manifest.
 */
function collect(
	deps: Record<string, string> | undefined,
	type: DependencyType,
	optional: boolean | ((name: string) => boolean),
	skip?: (name: string) => boolean,
): Dependency[] {
	if (!deps) return [];

	return Object.entries(deps)
		.map(([name, specifier]): Dependency | null => {
			if (skip?.(name)) {
				return null;
			}

			return {
				type,
				name,
				specifier,
				optional:
					typeof optional === 'function' ? optional(name) : optional,
			};
		})
		.filter((d): d is Dependency => d !== null);
}

export function getDependencies(manifest: PackumentVersion) {
	return Result.try<Dependency[]>(() => {
		return [
			// Production dependencies (excluding those also declared as optional)
			...collect(
				manifest.dependencies,
				'prod',
				false,
				(name) => !!manifest.optionalDependencies?.[name],
			),

			// Development dependencies
			...collect(manifest.devDependencies, 'dev', false),

			// Optional dependencies (always marked optional)
			...collect(manifest.optionalDependencies, 'prod', true),

			// Peer dependencies (optional may come from peerDependenciesMeta)
			...collect(
				manifest.peerDependencies,
				'peer',
				(name) =>
					manifest.peerDependenciesMeta?.[name]?.optional ?? false,
			),
		];
	});
}
