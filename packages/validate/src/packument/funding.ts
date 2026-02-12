import {
	aliasedLiteralUnion,
	cleanAndCollapseArray,
	EmptyableLink,
	Link,
	toArray,
} from '../shared';
import * as v from 'valibot';

export const FUNDING_TYPES = Object.freeze([
	'patreon',
	'github',
	'open-collective',
	'paypal',
	'ko-fi',
	'cashapp',
	'buy-me-a-coffee',
	'liberapay',
	'thanks.dev',
	'unknown',
] as const);

export type FundingType = (typeof FUNDING_TYPES)[number];

const FUNDING_DOMAIN_MAP = Object.freeze({
	patreon: ['patreon.com'],
	github: ['github.com'],
	'open-collective': ['opencollective.com'],
	paypal: ['paypal.com', 'paypal.me'],
	'ko-fi': ['ko-fi.com'],
	cashapp: ['cash.app'],
	'buy-me-a-coffee': ['buymeacoffee.com'],
	liberapay: ['liberapay.com'],
	'thanks.dev': ['thanks.dev'],
} satisfies Record<Exclude<FundingType, 'unknown'>, string[]>);

export const DOMAIN_FUNDING_TYPE_MAP = Object.freeze(
	Object.entries(FUNDING_DOMAIN_MAP).flatMap(([type, domains]) => {
		return domains.map(
			(domain): readonly [domain: string, type: FundingType] => [
				domain,
				type as FundingType,
			],
		);
	}),
);

export const FundingObjectSchema = v.object({
	type: v.optional(
		v.fallback(
			aliasedLiteralUnion(FUNDING_TYPES, {
				buy_me_a_coffee: 'buy-me-a-coffee',
				buymeacoffee: 'buy-me-a-coffee',
				open_collective: 'open-collective',
				opencollective: 'open-collective',
				thanks_dev: 'thanks.dev',
				librepay: 'liberapay',
				'github*': 'github',
				'paypal*': 'paypal',
				ko_fi: 'ko-fi',
				kofi: 'ko-fi',
			}),
			'unknown',
		),
		'unknown',
	),
	url: Link,
});

export const FundingSchema = v.pipe(
	v.union([
		EmptyableLink,
		v.array(
			v.union([
				EmptyableLink,
				v.fallback(v.nullable(FundingObjectSchema), null),
			]),
		),
		v.fallback(v.nullable(FundingObjectSchema), null),
		v.pipe(
			v.boolean(),
			v.transform(() => null),
		),
	]),
	toArray(),
	v.mapItems((raw) => {
		if (raw === null) return null;

		const item =
			typeof raw === 'string'
				? { type: 'unknown' as const, url: raw }
				: raw;

		const url = new URL(item.url);

		for (const [domain, type] of DOMAIN_FUNDING_TYPE_MAP) {
			if (url.hostname.endsWith(domain)) {
				item.type = type;
				url.protocol = 'https:';
				item.url = url.toString();
				break;
			}
		}

		return item;
	}),
	cleanAndCollapseArray(),
);
