import { EmptyableString, EmptyableLink, Link } from '../shared';
import { Dependency, PeerDependenciesMeta } from './dependency';
import { RepositorySchema } from './repository';
import { KeywordsSchema } from './keywords';
import { LicenseSchema } from './license';
import { Deprecated } from './deprecated';
import { FundingSchema } from './funding';
import * as v from 'valibot';

export const PackumentVersionSchema = v.object({
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
	dist: v.object({
		tarball: Link,
		integrity: v.optional(
			v.pipe(v.string(), v.regex(/^sha(256|384|512)-[A-Za-z0-9+/=]+$/)),
		),
	}),
	deprecated: Deprecated,
	funding: v.optional(v.nullable(FundingSchema, null)),
	repository: v.optional(RepositorySchema, null),
	dependencies: Dependency,
	devDependencies: Dependency,
	optionalDependencies: Dependency,
	peerDependencies: Dependency,
	peerDependenciesMeta: PeerDependenciesMeta,
});

export type PackumentVersion = v.InferOutput<typeof PackumentVersionSchema>;
