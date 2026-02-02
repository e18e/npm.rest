// Warning, this is completely vibe coded, please send help
// - ghostdevv

import type { JsonSchema, JsonSchemaType } from './types.js';

/**
 * Converts a JavaScript object into a JSON Schema
 * @param obj - The object to convert
 * @param options - Configuration options
 * @returns A JSON Schema object
 */
export function toSchema(
	obj: unknown,
	options: {
		/** Whether to mark all properties as required (default: true) */
		required?: boolean;
		/** Whether to allow additional properties in objects (default: false) */
		additionalProperties?: boolean;
		/** JSON Schema version (default: "http://json-schema.org/draft-07/schema#") */
		$schema?: string;
	} = {},
): JsonSchema {
	const { required = true, additionalProperties = false, $schema } = options;

	const schema = inferSchema(obj, required, additionalProperties);

	// Add $schema if this is the root call
	if ($schema !== undefined || $schema === null) {
		return {
			$schema: $schema || 'http://json-schema.org/draft-07/schema#',
			...schema,
		};
	}

	return schema;
}

function inferSchema(
	value: unknown,
	markRequired: boolean,
	allowAdditionalProps: boolean,
): JsonSchema {
	// Handle null
	if (value === null) {
		return { type: 'null' };
	}

	// Handle arrays
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return {
				type: 'array',
				items: {},
			};
		}

		// Infer schema from array items
		const itemSchemas = value.map((item) =>
			inferSchema(item, markRequired, allowAdditionalProps),
		);

		// Try to merge schemas if they're similar
		const mergedSchema = mergeSchemas(itemSchemas);

		return {
			type: 'array',
			items: mergedSchema,
		};
	}

	// Handle objects
	if (typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const properties: Record<string, JsonSchema> = {};
		const requiredFields: string[] = [];

		for (const [key, val] of Object.entries(obj)) {
			properties[key] = inferSchema(
				val,
				markRequired,
				allowAdditionalProps,
			);
			if (markRequired && val !== undefined) {
				requiredFields.push(key);
			}
		}

		const schema: JsonSchema = {
			type: 'object',
			properties,
			additionalProperties: allowAdditionalProps,
		};

		if (requiredFields.length > 0) {
			schema.required = requiredFields;
		}

		return schema;
	}

	// Handle primitives
	if (typeof value === 'string') {
		return { type: 'string' };
	}

	if (typeof value === 'number') {
		return { type: 'number' };
	}

	if (typeof value === 'boolean') {
		return { type: 'boolean' };
	}

	// Fallback
	return {};
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
	if (schemas.length === 0) {
		return {};
	}

	if (schemas.length === 1) {
		return schemas[0];
	}

	// Get all unique types
	const types = new Set<JsonSchemaType>();
	let hasObject = false;
	let hasArray = false;

	for (const schema of schemas) {
		if (schema.type) {
			if (Array.isArray(schema.type)) {
				schema.type.forEach((t) => types.add(t));
			} else {
				types.add(schema.type);
				if (schema.type === 'object') hasObject = true;
				if (schema.type === 'array') hasArray = true;
			}
		}
	}

	// If all schemas are the same type
	if (types.size === 1) {
		const [type] = types;

		if (type === 'object') {
			// Merge object properties
			const allProperties: Record<string, JsonSchema[]> = {};
			const allRequired = new Set<string>();

			for (const schema of schemas) {
				if (schema.properties) {
					for (const [key, prop] of Object.entries(
						schema.properties,
					)) {
						if (!allProperties[key]) {
							allProperties[key] = [];
						}
						allProperties[key].push(prop);
					}
				}
				if (schema.required) {
					schema.required.forEach((key) => allRequired.add(key));
				}
			}

			const mergedProperties: Record<string, JsonSchema> = {};
			for (const [key, propSchemas] of Object.entries(allProperties)) {
				mergedProperties[key] = mergeSchemas(propSchemas);
			}

			return {
				type: 'object',
				properties: mergedProperties,
				required: Array.from(allRequired),
				additionalProperties: schemas[0].additionalProperties,
			};
		}

		if (type === 'array') {
			// Merge array items
			const itemSchemas = schemas
				.map((s) => s.items)
				.filter((item): item is JsonSchema => item !== undefined);

			return {
				type: 'array',
				items: mergeSchemas(itemSchemas),
			};
		}

		return { type };
	}

	// Multiple types - use union
	return {
		type: Array.from(types) as JsonSchemaType[],
	};
}
