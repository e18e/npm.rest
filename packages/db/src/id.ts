type UUID = ReturnType<typeof crypto.randomUUID>;

export const ID_PREFIXES = [
	'pkg',
	'pkv',
	'publ',
	'repo',
	'spc',
	'fnd',
] as const;

/**
 * Fixed resource id prefixes
 */
export type IdPrefix = (typeof ID_PREFIXES)[number];

export function isIdPrefix(value: unknown): value is IdPrefix {
	return typeof value === 'string' && ID_PREFIXES.includes(value as IdPrefix);
}

/**
 * A "resource id" is a uuid with a fixed prefix, representing
 * a specific resource type.
 */
export type ResourceId<T extends IdPrefix = IdPrefix> = `${T}_${UUID}`;

/**
 * Generate an resource id.
 */
export function generateId<T extends IdPrefix>(prefix: T): ResourceId<T> {
	return `${prefix}_${crypto.randomUUID()}`;
}
