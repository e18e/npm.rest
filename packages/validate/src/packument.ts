import * as v from 'valibot';
import {
	aliasedLiteralUnion,
	EmptyableString,
	PretendBoolean,
	EmptyableLink,
	StrictString,
	nullOnEmpty,
	EmptyString,
	MaybeLink,
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

export const RepositoryObjectSchema = v.object({
	type: v.optional(
		v.fallback(
			v.nullable(
				v.union([
					EmptyString,
					aliasedLiteralUnion(['git', 'unknown'], { github: 'git' }),
				]),
			),
			'unknown',
		),
		null,
	),
	url: Link,
	directory: v.optional(EmptyableString, null),
	branch: v.optional(EmptyableString, null),
});

export type RepositoryObject = v.InferOutput<typeof RepositoryObjectSchema>;

export const RepositorySchema = v.pipe(
	v.union([
		MaybeLink,
		v.array(
			v.union([
				MaybeLink,
				v.fallback(v.nullable(RepositoryObjectSchema), null),
			]),
		),
		v.fallback(v.nullable(RepositoryObjectSchema), null),
	]),
	v.transform((value) => {
		if (value === null) {
			return null;
		}

		const array = (Array.isArray(value) ? value : [value])
			.map((item) => {
				if (typeof item === 'string') {
					return {
						type: null,
						url: item,
						directory: null,
						branch: null,
					};
				}

				return item;
			})
			.filter((item) => item !== null)
			.filter((item) => {
				const url = new URL(item.url);
				return !url.hostname.endsWith('npmjs.com');
			});

		return array.length === 0 ? null : array;
	}),
);

export type Repository = v.InferOutput<typeof RepositorySchema>;

export const FUNDING_TYPES = Object.freeze([
	'patreon',
	'github',
	'open-collective',
	'paypal',
	'ko-fi',
	'cashapp',
	'buy-me-a-coffee',
	'liberapay',
	'thanks.dev',
	'unknown',
] as const);

export type FundingType = (typeof FUNDING_TYPES)[number];

const FUNDING_DOMAIN_MAP = Object.freeze({
	patreon: ['patreon.com'],
	github: ['github.com'],
	'open-collective': ['opencollective.com'],
	paypal: ['paypal.com', 'paypal.me'],
	'ko-fi': ['ko-fi.com'],
	cashapp: ['cash.app'],
	'buy-me-a-coffee': ['buymeacoffee.com'],
	liberapay: ['liberapay.com'],
	'thanks.dev': ['thanks.dev'],
} satisfies Record<Exclude<FundingType, 'unknown'>, string[]>);

export const DOMAIN_FUNDING_TYPE_MAP = Object.freeze(
	Object.entries(FUNDING_DOMAIN_MAP).flatMap(([type, domains]) => {
		return domains.map(
			(domain): readonly [domain: string, type: FundingType] => [
				domain,
				type as FundingType,
			],
		);
	}),
);

export const FundingObject = v.object({
	type: v.optional(
		v.fallback(
			aliasedLiteralUnion(FUNDING_TYPES, {
				buy_me_a_coffee: 'buy-me-a-coffee',
				buymeacoffee: 'buy-me-a-coffee',
				open_collective: 'open-collective',
				opencollective: 'open-collective',
				thanks_dev: 'thanks.dev',
				librepay: 'liberapay',
				'github*': 'github',
				'paypal*': 'paypal',
				ko_fi: 'ko-fi',
				kofi: 'ko-fi',
			}),
			'unknown',
		),
		'unknown',
	),
	url: Link,
});

export const Funding = v.pipe(
	v.union([
		EmptyableLink,
		v.array(
			v.union([
				EmptyableLink,
				v.fallback(v.nullable(FundingObject), null),
			]),
		),
		v.fallback(v.nullable(FundingObject), null),
		v.pipe(
			v.boolean(),
			v.transform(() => null),
		),
	]),
	v.transform((value) => {
		if (value === null) return null;

		const array = (Array.isArray(value) ? value : [value])
			.map((raw) => {
				if (raw === null) return null;

				const item =
					typeof raw === 'string'
						? { type: 'unknown' as const, url: raw }
						: raw;

				const url = new URL(item.url);

				for (const [domain, type] of DOMAIN_FUNDING_TYPE_MAP) {
					if (url.hostname.endsWith(domain)) {
						item.type = type;
						url.protocol = 'https:';
						item.url = url.toString();
						break;
					}
				}

				return item;
			})
			.filter((item) => item !== null);

		return array.length === 0 ? null : array;
	}),
);

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

export const LicenseObjectSchema = v.object({
	type: v.optional(EmptyableString, null),
	name: v.optional(v.fallback(EmptyableString, null), null),
	url: v.optional(v.fallback(EmptyableLink, null), null),
	file: v.optional(EmptyableString, null),
});

export const LicenseSchema = v.pipe(
	v.union([
		EmptyableString,
		v.array(v.union([EmptyableString, LicenseObjectSchema])),
		v.pipe(
			v.boolean(),
			v.transform(() => 'UNKNOWN'),
		),
		v.pipe(
			v.number(),
			v.transform(() => null),
		),
		nullOnEmpty(LicenseObjectSchema),
	]),
	v.transform((value) => {
		if (value === null) return null;

		const array = (Array.isArray(value) ? value : [value])
			.map((item) =>
				typeof item === 'string'
					? { type: item, name: null, url: null, file: null }
					: item,
			)
			.filter((item) => item !== null);

		return array.length === 0 ? null : array;
	}),
);

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

function dependency<TInput, TOutput, TIssue extends v.BaseIssue<unknown>>(
	schema: v.BaseSchema<TInput, TOutput, TIssue>,
) {
	return v.optional(
		v.nullable(
			v.union([
				nullOnEmpty(
					v.pipe(
						v.record(
							v.pipe(v.string(), v.trim()),
							v.fallback(v.nullable(schema), null),
						),
						v.transform((obj) =>
							Object.fromEntries(
								Object.entries(obj).filter(
									([key]) => key !== '',
								),
							),
						),
					),
				),
				v.pipe(
					v.string(),
					v.transform(() => null),
				),
			]),
		),
		null,
	);
}

export const PackumentVersionSchema = v.looseObject({
	name: v.optional(EmptyableString, null),
	version: v.optional(EmptyableString, null),
	description: v.optional(
		v.union([
			EmptyableString,
			v.pipe(
				v.array(EmptyableString),
				v.filterItems((item) => typeof item === 'string'),
				v.transform((arr) => arr.join(' ') || null),
			),
		]),
		null,
	),
	keywords: v.optional(v.fallback(KeywordsSchema, null), null),
	license: v.optional(LicenseSchema, null),
	homepage: v.optional(v.fallback(EmptyableLink, null)),
	// bugs: v.optional(BugsObjectSchema),
	dist: v.object({
		tarball: Link,
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
			v.pipe(v.unknown(), v.transform(Boolean)),
		]),
	),
	funding: v.optional(v.nullable(Funding, null)),
	repository: v.optional(RepositorySchema, null),
	dependencies: dependency(EmptyableString),
	devDependencies: dependency(EmptyableString),
	optionalDependencies: dependency(EmptyableString),
	peerDependencies: dependency(EmptyableString),
	peerDependenciesMeta: dependency(v.object({ optional: PretendBoolean })),
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
				v.object({
					time: Date,
					versions: v.array(StrictString),
				}),
			),
		},
		Date,
	),
});

export type Packument = v.InferOutput<typeof PackumentSchema>;
