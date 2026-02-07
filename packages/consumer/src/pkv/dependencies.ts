import type { dependencyTable, specifierTable } from '@npm.rest/db/schema';
import type { PackumentVersion } from '@npm.rest/validate/packument';
import { Result } from 'better-result';
import npa from 'npm-package-arg';

type DependencyType = (typeof dependencyTable.$inferSelect)['type'];
type SpecifierType = (typeof specifierTable.$inferSelect)['type'];

export interface DependencySpec {
	name: string;
	specifier: string;
	type: SpecifierType;
}

export interface VersionDependency {
	spec: DependencySpec;
	alias: string | null;
	depType: DependencyType;
	optional: boolean;
}

const EXTRA_ALIASES = ['catalog:', 'workspace:'];

function resolve(name: string, spec: string) {
	for (const alias of EXTRA_ALIASES) {
		if (spec.startsWith(alias)) {
			const result = npa.resolve(name, spec.slice(alias.length));

			if (result.type === 'alias') {
				throw new Error('alias not supported on sub special spec');
			}

			return result;
		}
	}

	return npa.resolve(name, spec);
}

// Helper to collect dependencies from the manifest.
function collect(
	deps: Record<string, string> | undefined,
	depType: DependencyType,
	optional: boolean | ((name: string) => boolean),
	skip?: (name: string) => boolean,
): VersionDependency[] {
	if (!deps) return [];

	return Object.entries(deps)
		.map(([name, specifier]): VersionDependency | null => {
			if (skip?.(name)) {
				return null;
			}

			const isOptional =
				typeof optional === 'function' ? optional(name) : optional;

			const parsed = resolve(name, specifier);

			if (parsed.type === 'alias') {
				return {
					spec: {
						name: parsed.subSpec.name!,
						specifier: parsed.subSpec.fetchSpec!,
						type: parsed.subSpec.type as SpecifierType, // nested aliases aren't a thing,
					},
					alias: name,
					optional: isOptional,
					depType,
				};
			}

			return {
				spec: {
					name,
					specifier,
					type: parsed.type,
				},
				alias: null,
				depType,
				optional: isOptional,
			};
		})
		.filter((d): d is VersionDependency => d !== null);
}

export function getDependencies(manifest: PackumentVersion) {
	return Result.try<VersionDependency[]>(() => {
		return [
			// Production dependencies (excluding those also declared as optional)
			...collect(manifest.dependencies, 'prod', false, (name) =>
				Boolean(manifest.optionalDependencies?.[name]),
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
