import * as v from 'valibot';
import {
	EmptyableString,
	StrictString,
	nullOnEmpty,
	Date,
	Link,
	Rev,
} from './shared';

// const Maintainer = v.strictObject({
// 	name: v.string(),
// 	email: Email,
// });

// const Author = v.strictObject({
// 	name: v.string(),
// 	email: v.optional(Email),
// 	url: v.optional(Link),
// });

const Repository = v.strictObject({
	type: v.optional(v.union([v.literal('git')])),
	directory: v.optional(v.string()),
	url: v.optional(Link),
});

const Funding = v.strictObject({
	type: v.optional(v.union([v.literal('patreon'), v.literal('individual')])),
});

const Bugs = v.object({
	url: Link,
});

export const PackumentVersionSchema = v.looseObject({
	name: v.string(),
	description: EmptyableString,
	version: v.string(),
	keywords: v.optional(v.array(v.string())),
	license: v.optional(
		v.union([
			v.string(),
			v.strictObject({
				type: v.optional(v.string()),
				name: v.optional(v.string()),
				url: v.string(),
			}),
		]),
	),
	homepage: v.optional(Link),
	bugs: v.optional(Bugs),
	dist: v.object({
		shasum: v.string(),
		tarball: Link,
		integrity: v.string(),
	}),
	dependencies: v.optional(v.record(v.string(), v.string())),
	devDependencies: v.optional(v.record(v.string(), v.string())),
	optionalDependencies: v.optional(v.record(v.string(), v.string())),
	peerDependencies: v.optional(v.record(v.string(), v.string())),
	peerDependenciesMeta: v.optional(
		v.record(v.string(), v.strictObject({ optional: v.boolean() })),
	),
	deprecated: v.optional(v.union([v.string(), v.literal(false)])),
	funding: v.optional(
		v.union([v.string(), Funding, v.array(v.union([v.string(), Funding]))]),
	),
	repository: v.optional(
		v.union([
			v.pipe(
				v.string(),
				v.transform((repo) => ({
					url: URL.canParse(repo)
						? repo
						: // should validate this assumption
							`https://github.com/${repo}`,
					directory: null,
				})),
			),
			Repository,
		]),
	),
});

export type PackumentVersion = v.InferOutput<typeof PackumentVersionSchema>;

export const PackumentSchema = v.looseObject({
	_rev: v.optional(Rev),
	name: StrictString,
	'dist-tags': v.optional(
		nullOnEmpty(
			v.objectWithRest(
				{ latest: v.optional(StrictString) },
				StrictString,
			),
		),
	),
	versions: v.optional(v.record(v.string(), PackumentVersionSchema)),
	time: v.objectWithRest(
		{
			created: Date,
			modified: Date,
		},
		Date,
	),
});

export type Packument = v.InferOutput<typeof PackumentSchema>;
