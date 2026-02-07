import * as v from 'valibot';
import {
	EmptyableString,
	EmptyableLink,
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

// export const BugsObjectSchema = v.object({
// 	url: Link,
// 	email: v.optional(v.string()),
// });

// export const BugsSchema = v.union([
// 	v.pipe(
// 		v.string(),
// 		v.transform((value) => ({ url: value })),
// 	),
// 	BugsObjectSchema,
// ]);

export const LicenseObjectSchema = v.strictObject({
	type: v.optional(EmptyableString, null),
	name: v.optional(EmptyableString, null),
	url: EmptyableLink,
});

export const LicenseSchema = v.union([
	EmptyableString,
	LicenseObjectSchema,
	v.pipe(
		v.array(v.union([StrictString, LicenseObjectSchema])),
		v.filterItems((item) => item !== null),
	),
]);

export const KeywordsSchema = v.union([
	v.pipe(
		EmptyableString,
		v.transform((value) => (value ? [value] : null)),
	),
	v.pipe(
		v.array(v.union([EmptyableString, v.array(EmptyableString)])),
		v.transform((value): string[] => {
			return new Set(value.flat())
				.values()
				.filter((item) => typeof item === 'string')
				.toArray();
		}),
	),
]);

export const PackumentVersionSchema = v.looseObject({
	name: StrictString,
	description: v.optional(EmptyableString, null),
	version: StrictString,
	keywords: v.optional(KeywordsSchema),
	license: v.optional(LicenseSchema, null),
	homepage: v.optional(v.fallback(EmptyableLink, null)),
	// bugs: v.optional(BugsObjectSchema),
	dist: v.object({
		tarball: Link,
		shasum: StrictString,
		integrity: v.optional(
			v.pipe(v.string(), v.regex(/^sha(256|384|512)-[A-Za-z0-9+/=]+$/)),
		),
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
	versions: v.optional(
		nullOnEmpty(v.record(StrictString, PackumentVersionSchema)),
	),
	time: v.objectWithRest(
		{
			created: Date,
			modified: Date,
			unpublished: v.optional(
				v.strictObject({
					time: Date,
					versions: v.pipe(v.array(StrictString), v.minLength(1)),
				}),
			),
		},
		Date,
	),
});

export type Packument = v.InferOutput<typeof PackumentSchema>;
