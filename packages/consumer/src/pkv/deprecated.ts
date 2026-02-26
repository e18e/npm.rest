import type { PackumentVersion } from '@npm.rest/validate/packument';

export function formatDeprecated(pkv: PackumentVersion): string | null {
	return typeof pkv.deprecated === 'string'
		? pkv.deprecated
		: pkv.deprecated === true
			? '__no_reason__' // todo is this really best way
			: null;
}
