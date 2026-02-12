import {
	EmptyableString,
	EmptyableLink,
	nullOnEmpty,
	toArray,
	cleanAndCollapseArray,
} from '../shared';
import * as v from 'valibot';

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
	toArray(),
	v.mapItems((item) => {
		return typeof item === 'string'
			? { type: item, name: null, url: null, file: null }
			: item;
	}),
	cleanAndCollapseArray(),
);

export type License = v.InferOutput<typeof LicenseObjectSchema>;
