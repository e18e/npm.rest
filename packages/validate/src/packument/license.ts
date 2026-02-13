import {
	EmptyableString,
	EmptyableLink,
	nullOnEmpty,
	toArray,
	cleanAndCollapseArray,
} from '../shared';
import * as v from 'valibot';

export const LicenseObjectSchema = v.pipe(
	v.object({
		type: v.optional(EmptyableString),
		name: v.optional(v.fallback(EmptyableString, null)),
		url: v.optional(v.fallback(EmptyableLink, null)),
		file: v.optional(EmptyableString),
	}),
	v.transform(({ type, name, ...value }) => ({
		type: type ?? name,
		...value,
	})),
);

export type License = v.InferOutput<typeof LicenseObjectSchema>;

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
	toArray(),
	v.mapItems((item) => (typeof item === 'string' ? { type: item } : item)),
	cleanAndCollapseArray(),
);
