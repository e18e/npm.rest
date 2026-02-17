import * as v from 'valibot';
import {
	EmptyableString,
	EmptyableLink,
	nullOnEmpty,
	toArray,
	cleanAndCollapseArray,
} from '../shared';

export const LicenseObjectSchema = v.object({
	type: v.optional(EmptyableString),
	name: v.optional(v.fallback(EmptyableString, null)),
	url: v.optional(v.fallback(EmptyableLink, null)),
	file: v.optional(EmptyableString),
});

export interface License {
	type: string;
	url?: string;
	file?: string;
}

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
	v.mapItems((raw): License | null => {
		if (raw === null) return null;

		const { name, ...item } = typeof raw === 'string' ? { type: raw } : raw;

		if (item.url) {
			const url = new URL(item.url);

			if (!url.hostname || !['https:', 'http:'].includes(url.protocol)) {
				item.url = null;
			}
		}

		item.type ??= name;
		return typeof item.type === 'string' ? (item as License) : null;
	}),
	cleanAndCollapseArray(),
);
