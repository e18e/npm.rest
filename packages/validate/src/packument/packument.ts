import { StrictString, nullOnEmpty, Date, Rev } from '../shared';
import { PackumentVersionSchema } from './packument-version';
import * as v from 'valibot';

export const PackumentSchema = v.looseObject({
	_rev: v.optional(Rev),
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
