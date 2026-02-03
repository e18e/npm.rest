import type { PackumentVersion } from '@npm.rest/validate/packument';
import type { dependencyTable, specifierTable } from '@npm.rest/db/schema';
import npa from 'npm-package-arg';
import { Result } from 'better-result';

type DependencyType = (typeof dependencyTable.$inferSelect)['type'];
type SpecifierType = (typeof specifierTable.$inferSelect)['type'];

export type DependencySpec = {
	name: string;
	specifier: string;
	type: SpecifierType;
};

export type VersionDependency = {
	spec: DependencySpec;
	alias: string | null;
	depType: DependencyType;
	optional: boolean;
};

/**
 * Parse a dependency specifier to determine its type and extract alias info.
 */
function parseSpecifier(
	name: string,
	specifier: string,
): { type: SpecifierType; alias: string | null } {
	try {
		const parsed = npa.resolve(name, specifier);

		// If the name in the parsed result differs from the original name,
		// it's an alias (e.g., "my-lodash": "npm:lodash@^4.0.0")
		const alias = parsed.name !== name ? (parsed.name ?? null) : null;

		// Map npm-package-arg types to our specifierType enum
		const typeMap: Record<string, SpecifierType> = {
			git: 'git',
			tag: 'tag',
			version: 'version',
			range: 'range',
			file: 'file',
			directory: 'directory',
			remote: 'remote',
		};

		const type = typeMap[parsed.type] ?? 'range';

		return { type, alias };
	} catch {
		// If parsing fails, default to 'range' with no alias
		return { type: 'range', alias: null };
	}
}

/**
 * Helper to collect dependencies from the manifest.
 */
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

			const parsed = npa.resolve(name, specifier);

			if (parsed.type === 'alias') {
				return {
					spec: {
						name: parsed.subSpec.name!,
						specifier: parsed.subSpec.fetchSpec!,
						type: parsed.subSpec.type! as SpecifierType, // nested aliases aren't a thing,
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
