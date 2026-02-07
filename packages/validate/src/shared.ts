import * as v from 'valibot';

export const EmptyableString = v.nullable(
	v.pipe(
		v.string(),
		v.trim(),
		v.transform((value) => (value === '' ? null : value)),
	),
);

export const StrictString = v.pipe(v.string(), v.trim(), v.nonEmpty());

export const Date = v.pipe(v.string(), v.toDate());
// export const Link = v.pipe(v.string(), v.url());
export const Link = v.string(); // will be fixed later
// export const Email = v.pipe(v.string(), v.email());
