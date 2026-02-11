import * as v from 'valibot';

export const TrimmedString = v.pipe(v.string(), v.trim());

export const EmptyableString = v.nullable(
	v.pipe(
		TrimmedString,
		v.transform((value) => (value === '' ? null : value)),
	),
);

export const StrictString = v.pipe(TrimmedString, v.nonEmpty());

export const EmptyString = v.pipe(
	TrimmedString,
	v.empty(),
	v.transform(() => null),
);

export const Date = v.pipe(TrimmedString, v.toDate());
export const Email = v.pipe(TrimmedString, v.email());
export const Link = v.pipe(TrimmedString, v.url());

export const EmptyableLink = v.nullable(v.union([EmptyString, Link]));

export const MaybeLink = v.nullable(
	v.pipe(
		TrimmedString,
		v.transform((str) => (URL.canParse(str) ? str : null)),
	),
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

export function aliasedLiteralUnion<
	const T extends string,
	const A extends Record<string, T>,
>(input: readonly T[], aliases?: A) {
	const stars =
		aliases &&
		Object.entries(aliases)
			.filter(([key]) => key.endsWith('*'))
			.map(([key, value]): [string, T] => [key.slice(0, -1), value]);

	return v.pipe(
		v.string(),
		v.transform((raw) => {
			const input = raw.toLowerCase().replaceAll(/\s/g, '').trim();

			if (aliases?.[input]) return aliases[input];

			const match = stars?.find(([key]) => input.startsWith(key));
			if (match) return match[1];

			return input;
		}),
		v.union(input.map((value) => v.literal(value))),
	);
}

type ToArray<T> = (T extends (infer U)[] ? U : T)[];

export function toArray<T>(): v.TransformAction<T, ToArray<T>> {
	return v.transform(
		(input) => (Array.isArray(input) ? input : [input]) as ToArray<T>,
	);
}

type CleanArray<Item> = Exclude<Item, null>[] | null;

export function cleanAndCollapseArray<
	Item,
	Input extends Item[],
>(): v.TransformAction<Input, CleanArray<Item>> {
	return v.transform((value) => {
		const filtered = value.filter((item) => item !== null);
		return (filtered.length === 0 ? null : filtered) as CleanArray<Item>;
	});
}
