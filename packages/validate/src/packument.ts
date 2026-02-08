import * as v from 'valibot';
import {
	EmptyableString,
	PretendBoolean,
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

// export const RepositoryObjectSchema = v.pipe(
// 	v.strictObject({
// 		type: v.optional(
// 			v.pipe(
// 				v.string(),
// 				v.toLowerCase(),
// 				v.union([
// 					v.literal('git'),
// 					v.pipe(
// 						v.literal('github'),
// 						v.transform(() => 'git' as const),
// 					),
// 					v.literal('npm'),
// 					v.literal('https'),
// 				]),
// 			),
// 		),
// 		directory: v.optional(v.string()),
// 		url: v.optional(Link),
// 		branch: v.optional(v.string()),
// 	}),
// 	v.transform((value) => {
// 		return value.type === 'npm' ? null : value;
// 	}),
// );

// export type RepositoryObject = v.InferOutput<typeof RepositoryObjectSchema>;

// export const RepositorySchema = v.union([
// 	v.pipe(
// 		v.string(),
// 		v.transform((value): RepositoryObject | null => {
// 			return URL.canParse(value) ? { url: value } : null;
// 		}),
// 	),
// 	RepositoryObjectSchema,
// 	v.pipe(
// 		v.array(RepositoryObjectSchema),
// 		v.filterItems((item) => item !== null),
// 	), // todo remove null from this type
// ]);

// export type Repository = v.InferOutput<typeof RepositorySchema>;

// export const FundingObject = v.strictObject({
// 	type: v.optional(
// 		v.union([
// 			v.literal('patreon'),
// 			v.literal('individual'),
// 			v.literal('github'),
// 			v.literal('opencollective'),
// 			v.literal('paypal'),
// 			v.literal('ko_fi'),
// 			v.literal('buymeacoffee'),
// 		]),
// 	),
// 	url: v.optional(v.string()),
// });

// export const Funding = v.union([
// 	v.string(),
// 	FundingObject,
// 	v.array(v.union([v.string(), FundingObject])),
// ]);

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
	url: v.optional(EmptyableLink, null),
});

export const LicenseSchema = v.union([
	EmptyableString,
	LicenseObjectSchema,
	v.pipe(
		v.array(v.union([StrictString, LicenseObjectSchema])),
		v.filterItems((item) => item !== null),
	),
	v.pipe(
		v.literal(false),
		v.transform(() => 'UNLICENSED'),
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
	deprecated: v.optional(
		v.union([
			EmptyableString,
			v.boolean(),
			v.pipe(
				v.record(StrictString, StrictString),
				v.minEntries(1),
				v.transform((obj) =>
					Object.entries(obj)
						.map(([key, value]) => `${key}: ${value}`)
						.join(', '),
				),
			),
		]),
	),
	// funding: v.optional(Funding),
	// repository: v.optional(RepositorySchema),
	dependencies: v.optional(
		v.nullable(nullOnEmpty(v.record(StrictString, EmptyableString))),
		null,
	),
	devDependencies: v.optional(
		v.nullable(nullOnEmpty(v.record(StrictString, EmptyableString))),
		null,
	),
	optionalDependencies: v.optional(
		v.nullable(nullOnEmpty(v.record(StrictString, EmptyableString))),
		null,
	),
	peerDependencies: v.optional(
		v.nullable(nullOnEmpty(v.record(StrictString, EmptyableString))),
		null,
	),
	peerDependenciesMeta: v.optional(
		nullOnEmpty(
			v.record(
				StrictString,
				v.fallback(
					v.nullable(v.object({ optional: PretendBoolean })),
					null,
				),
			),
		),
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
					versions: v.array(StrictString),
				}),
			),
		},
		Date,
	),
});

export type Packument = v.InferOutput<typeof PackumentSchema>;
