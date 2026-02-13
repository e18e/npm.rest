import {
	EmptyableString,
	EmptyableLink,
	nullOnEmpty,
	toArray,
	cleanAndCollapseArray,
} from '../shared';
import * as v from 'valibot';

export const LicenseObjectSchema = v.object({
	type: v.optional(EmptyableString),
	name: v.optional(v.fallback(EmptyableString, null)),
	url: v.optional(v.fallback(EmptyableLink, null)),
	file: v.optional(EmptyableString),
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
	toArray(),
	v.mapItems((item) => (typeof item === 'string' ? { type: item } : item)),
	cleanAndCollapseArray(),
);

export type License = v.InferOutput<typeof LicenseObjectSchema>;
