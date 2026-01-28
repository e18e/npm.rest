import * as v from 'valibot';

const Date = v.pipe(v.string(), v.toDate());
// const Link = v.pipe(v.string(), v.url());
const Link = v.string(); // will be fixed later
const Email = v.pipe(v.string(), v.email());

const FussyString = v.optional(
	v.nullable(
		v.pipe(
			v.string(),
			v.transform((value) =>
				// Some old packuments seem to have some null unicode characters
				// postgres throws a fit by default if we include these so this
				// tries to remove them.
				value.replace(
					/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]+/g,
					'',
				),
			),
			v.transform((value) => (value?.trim() === '' ? undefined : value)),
		),
	),
);

const Maintainer = v.strictObject({
	name: v.string(),
	email: Email,
});

const Repository = v.strictObject({
	type: v.optional(v.union([v.literal('git')])),
	directory: v.optional(v.string()),
	url: Link,
});

const Funding = v.strictObject({
	type: v.optional(v.union([v.literal('patreon'), v.literal('individual')])),
});

const Bugs = v.strictObject({
	url: Link,
});

const Author = v.strictObject({
	name: v.string(),
	email: v.optional(Email),
	url: v.optional(Link),
});

const PackumentVersionSchema = v.looseObject({
	name: v.string(),
	description: FussyString,
	version: v.string(),
	keywords: v.optional(v.array(v.string())),
	// author: v.optional(v.union([Author, Str])),
	license: v.optional(v.string()),
	// maintainers: v.optional(v.array(Maintainer)),
	homepage: v.optional(Link),
	bugs: v.optional(Bugs),
	dist: v.object({
		shasum: v.string(),
		tarball: Link,
		integrity: v.string(),
		// signatures: v.array(
		// 	v.strictObject({
		// 		sig: v.string(),
		// 		keyid: v.string(),
		// 	}),
		// ),
		// unpackedSize: v.optional(v.number()),
		// fileCount: v.optional(v.number()),
		// 'npm-signature': v.optional(v.string()),
	}),
	dependencies: v.optional(v.record(v.string(), v.string())),
	devDependencies: v.optional(v.record(v.string(), v.string())),
	optionalDependencies: v.optional(v.record(v.string(), v.string())),
	peerDependencies: v.optional(v.record(v.string(), v.string())),
	peerDependenciesMeta: v.optional(
		v.record(v.string(), v.strictObject({ optional: v.boolean() })),
	),
	deprecated: v.optional(v.string()),
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
	_rev: v.optional(v.string()),
	name: v.string(),
	description: FussyString,
	'dist-tags': v.optional(
		v.intersect([
			v.object({ latest: v.string() }),
			v.record(v.string(), v.string()),
		]),
	),
	versions: v.optional(v.record(v.string(), PackumentVersionSchema)),
	time: v.intersect([
		v.object({ created: Date, modified: Date }),
		v.record(v.string(), Date),
	]),
	// maintainers: v.array(Maintainer),
	// readme: Str,
	// readmeFilename: v.string(),
	// users: v.optional(v.record(v.string(), v.boolean())),
});

export type Packument = v.InferOutput<typeof PackumentSchema>;
