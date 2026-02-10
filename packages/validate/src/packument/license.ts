import { EmptyableString, EmptyableLink, nullOnEmpty } from '../shared';
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
