import { EmptyableString } from '../shared';
import * as v from 'valibot';

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
