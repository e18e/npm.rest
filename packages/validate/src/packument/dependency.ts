import { EmptyableString, nullOnEmpty, PretendBoolean } from '../shared';
import * as v from 'valibot';

function dependency<TInput, TOutput, TIssue extends v.BaseIssue<unknown>>(
	schema: v.BaseSchema<TInput, TOutput, TIssue>,
) {
	return v.optional(
		v.nullable(
			v.union([
				nullOnEmpty(
					v.pipe(
						v.record(
							v.pipe(v.string(), v.trim()),
							v.fallback(v.nullable(schema), null),
						),
						v.transform((obj) =>
							Object.fromEntries(
								Object.entries(obj).filter(
									([key]) => key !== '',
								),
							),
						),
					),
				),
				v.pipe(
					v.string(),
					v.transform(() => null),
				),
			]),
		),
		null,
	);
}

export const Dependency = dependency(EmptyableString);

export const PeerDependenciesMeta = dependency(
	v.object({ optional: PretendBoolean }),
);
