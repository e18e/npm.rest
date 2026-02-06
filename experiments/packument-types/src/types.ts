// Warning, this is completely vibe coded, please send help
// - ghostdevv

/**
 * Valid JSON Schema primitive types
 */
export type JsonSchemaType =
	| 'string'
	| 'number'
	| 'integer'
	| 'boolean'
	| 'object'
	| 'array'
	| 'null';

/**
 * JSON Schema interface supporting Draft-07 specification
 */
export interface JsonSchema {
	/** Schema identifier */
	$id?: string;
	/** Schema version URI */
	$schema?: string;
	/** The type(s) this schema validates */
	type?: JsonSchemaType | JsonSchemaType[];
	/** Object property schemas */
	properties?: Record<string, JsonSchema>;
	/** Array item schema(s) - single schema or tuple array */
	items?: JsonSchema | JsonSchema[];
	/** Required property names for objects */
	required?: string[];
	/** Whether additional properties are allowed, or their schema */
	additionalProperties?: boolean | JsonSchema;
	/** Schema must match any of these schemas */
	anyOf?: JsonSchema[];
	/** Schema must match exactly one of these schemas */
	oneOf?: JsonSchema[];
	/** Schema must match all of these schemas */
	allOf?: JsonSchema[];
	/** Value must be one of these */
	enum?: unknown[];
	/** Value must be exactly this */
	const?: unknown;
	/** Schema title */
	title?: string;
	/** Schema description */
	description?: string;
	/** Default value */
	default?: unknown;
	/** Example value(s) */
	examples?: unknown[];
	/** String format constraint */
	format?: string;
	/** String pattern (regex) */
	pattern?: string;
	/** Minimum length for strings or arrays */
	minLength?: number;
	/** Maximum length for strings or arrays */
	maxLength?: number;
	/** Minimum value for numbers */
	minimum?: number;
	/** Maximum value for numbers */
	maximum?: number;
	/** Exclusive minimum value for numbers */
	exclusiveMinimum?: number;
	/** Exclusive maximum value for numbers */
	exclusiveMaximum?: number;
	/** Number must be multiple of this */
	multipleOf?: number;
	/** Minimum number of items in array */
	minItems?: number;
	/** Maximum number of items in array */
	maxItems?: number;
	/** Whether array items must be unique */
	uniqueItems?: boolean;
	/** Minimum number of properties in object */
	minProperties?: number;
	/** Maximum number of properties in object */
	maxProperties?: number;
	/** Allow any additional properties */
	[key: string]: unknown;
}
