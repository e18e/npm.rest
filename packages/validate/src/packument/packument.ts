import { PackumentVersionSchema } from './packument-version';
import { StrictString, nullOnEmpty, Date } from '../shared';
import * as v from 'valibot';

export const PackumentSchema = v.object({
	_rev: v.optional(
		v.pipe(
			StrictString,
			v.check((value) => {
				const [num, rest] = value.split('-');
				return (
					!Number.isNaN(Number.parseInt(num, 10)) && rest.length > 0
				);
			}),
		),
	),
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
