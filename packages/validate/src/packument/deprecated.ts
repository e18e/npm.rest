import { EmptyableString, TrimmedString } from '../shared';
import * as v from 'valibot';

export const Deprecated = v.optional(
	v.union([
		EmptyableString,
		v.boolean(),
		v.pipe(
			v.record(TrimmedString, TrimmedString),
			v.minEntries(1),
			v.transform((obj) =>
				Object.entries(obj)
					.map(([key, value]) => {
						return `${key}${key && value ? ': ' : ''}${value}`;
					})
					.join(', '),
			),
		),
		v.pipe(v.unknown(), v.transform(Boolean)),
	]),
);
