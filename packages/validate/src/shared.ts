import * as v from 'valibot';

export const EmptyableString = v.nullable(
	v.pipe(
		v.string(),
		v.trim(),
		v.transform((value) => (value === '' ? null : value)),
	),
);

export const StrictString = v.pipe(v.string(), v.trim(), v.nonEmpty());

export const Rev = v.pipe(
	StrictString,
	v.check((value) => {
		const [num, rest] = value.split('-');
		return !Number.isNaN(Number.parseInt(num, 10)) && rest.length > 0;
	}),
);

export const Date = v.pipe(v.string(), v.trim(), v.toDate());
export const Email = v.pipe(v.string(), v.trim(), v.email());
export const Link = v.pipe(v.string(), v.trim(), v.url());

export const EmptyableLink = v.nullable(
	v.union([
		v.pipe(
			v.string(),
			v.trim(),
			v.empty(),
			v.transform(() => null),
		),
		Link,
	]),
);

export const PretendBoolean = v.union([
	v.boolean(),
	v.pipe(
		v.literal('true'),
		v.transform(() => true),
	),
	v.pipe(
		v.literal('false'),
		v.transform(() => false),
	),
]);

export function nullOnEmpty<
	TInput,
	TOutput extends Record<string, unknown>,
	TIssue extends v.BaseIssue<unknown> = v.BaseIssue<unknown>,
>(schema: v.GenericSchema<TInput, TOutput, TIssue>) {
	return v.pipe(
		schema,
		v.transform((value) => {
			const empty = Object.values(value).every(
				(value) => value === null || typeof value === 'undefined',
			);

			return empty ? null : value;
		}),
	);
}
