// Warning, this is completely vibe coded, please send help
// - ghostdevv

import type { JsonSchema } from './types.js';

/**
 * Merges two JSON schemas by widening types (creating unions when they differ).
 * This is similar to TypeScript's union types - when schemas conflict, we create
 * an anyOf to represent all possible variations.
 *
 * @param schema1 - First schema to merge
 * @param schema2 - Second schema to merge
 * @returns Merged schema that accepts values matching either input schema
 */
export function mergeSchemas(
	schema1: JsonSchema,
	schema2: JsonSchema,
): JsonSchema {
	// Handle empty schemas
	if (Object.keys(schema1).length === 0) return schema2;
	if (Object.keys(schema2).length === 0) return schema1;

	// If schemas are structurally identical, return one
	if (schemasEqual(schema1, schema2)) {
		return schema1;
	}

	// Handle anyOf in inputs - flatten them
	const schemas1 = schema1.anyOf ?? [schema1];
	const schemas2 = schema2.anyOf ?? [schema2];

	// If types are completely different, create anyOf union
	if (schema1.type && schema2.type && schema1.type !== schema2.type) {
		// Check if they're both simple types (not objects/arrays)
		if (!isComplexType(schema1.type) && !isComplexType(schema2.type)) {
			return createMergedAnyOf([...schemas1, ...schemas2]);
		}
		// Different complex types - create union
		return createMergedAnyOf([...schemas1, ...schemas2]);
	}

	// Both are objects - merge properties
	if (
		(schema1.type === 'object' || schema1.properties) &&
		(schema2.type === 'object' || schema2.properties)
	) {
		return mergeObjectSchemas(schema1, schema2);
	}

	// Both are arrays - merge items
	if (schema1.type === 'array' && schema2.type === 'array') {
		return mergeArraySchemas(schema1, schema2);
	}

	// Same type but different structure - try to merge or create union
	if (schema1.type === schema2.type) {
		// For primitives with different constraints, create union
		if (
			schema1.enum ||
			schema2.enum ||
			typeof schema1.const !== 'undefined' ||
			typeof schema2.const !== 'undefined'
		) {
			return createMergedAnyOf([...schemas1, ...schemas2]);
		}

		// Merge other properties
		return mergeProperties(schema1, schema2);
	}

	// Fallback: create anyOf union
	return createMergedAnyOf([...schemas1, ...schemas2]);
}

function mergeObjectSchemas(
	schema1: JsonSchema,
	schema2: JsonSchema,
): JsonSchema {
	const props1 = schema1.properties ?? {};
	const props2 = schema2.properties ?? {};
	const required1 = new Set(schema1.required);
	const required2 = new Set(schema2.required);

	// Get all property keys
	const allKeys = new Set([...Object.keys(props1), ...Object.keys(props2)]);

	const mergedProperties: Record<string, JsonSchema> = {};
	const mergedRequired: string[] = [];

	for (const key of allKeys) {
		const prop1 = props1[key];
		const prop2 = props2[key];

		if (prop1 && prop2) {
			// Property exists in both - merge recursively
			mergedProperties[key] = mergeSchemas(prop1, prop2);

			// Only required if required in BOTH schemas
			if (required1.has(key) && required2.has(key)) {
				mergedRequired.push(key);
			}
		} else if (prop1) {
			// Property only in schema1 - include it but not as required
			mergedProperties[key] = prop1;
		} else if (prop2) {
			// Property only in schema2 - include it but not as required
			mergedProperties[key] = prop2;
		}
	}

	const result: JsonSchema = {
		type: 'object',
		properties: mergedProperties,
	};

	if (mergedRequired.length > 0) {
		result.required = mergedRequired;
	}

	// Merge additionalProperties
	if (
		typeof schema1.additionalProperties !== 'undefined' ||
		typeof schema2.additionalProperties !== 'undefined'
	) {
		const addProps1 = schema1.additionalProperties ?? true;
		const addProps2 = schema2.additionalProperties ?? true;

		// If either allows additional properties, the merged schema should too
		if (addProps1 === true || addProps2 === true) {
			result.additionalProperties = true;
		} else if (
			typeof addProps1 === 'object' &&
			typeof addProps2 === 'object'
		) {
			result.additionalProperties = mergeSchemas(addProps1, addProps2);
		} else {
			result.additionalProperties = addProps1 || addProps2;
		}
	}

	return result;
}

function mergeArraySchemas(
	schema1: JsonSchema,
	schema2: JsonSchema,
): JsonSchema {
	const items1 = schema1.items;
	const items2 = schema2.items;

	if (!items1 && !items2) {
		return { type: 'array' };
	}

	if (!items1) return schema2;
	if (!items2) return schema1;

	// Both have items - merge them
	if (Array.isArray(items1) || Array.isArray(items2)) {
		// Tuple types - create union
		return createMergedAnyOf([schema1, schema2]);
	}

	return {
		type: 'array',
		items: mergeSchemas(items1, items2),
	};
}

function mergeProperties(schema1: JsonSchema, schema2: JsonSchema): JsonSchema {
	const result: JsonSchema = {};

	// Copy common properties
	const keys = new Set([...Object.keys(schema1), ...Object.keys(schema2)]);

	for (const key of keys) {
		if (key === 'required' || key === 'properties' || key === 'items') {
			continue;
		}

		const val1 = schema1[key];
		const val2 = schema2[key];

		if (val1 === val2) {
			result[key] = val1;
		} else if (typeof val1 !== 'undefined' && typeof val2 !== 'undefined') {
			// Values differ - would need anyOf
			return createMergedAnyOf([schema1, schema2]);
		} else {
			result[key] = val1 ?? val2;
		}
	}

	return result;
}

function isComplexType(type: string | string[]): boolean {
	if (Array.isArray(type)) {
		return type.some((t) => t === 'object' || t === 'array');
	}
	return type === 'object' || type === 'array';
}

function schemasEqual(schema1: JsonSchema, schema2: JsonSchema): boolean {
	// Simple deep equality check
	return JSON.stringify(schema1) === JSON.stringify(schema2);
}

/**
 * Removes duplicate schemas from an array based on deep equality
 */
function deduplicateSchemas(schemas: JsonSchema[]): JsonSchema[] {
	const unique: JsonSchema[] = [];
	const seen = new Set<string>();

	for (const schema of schemas) {
		const key = JSON.stringify(schema);
		if (!seen.has(key)) {
			seen.add(key);
			unique.push(schema);
		}
	}

	return unique;
}

/**
 * Creates an anyOf union, but merges all object schemas together first.
 * This prevents creating unions like `{ foo: string } | { bar: string }`
 * and instead creates `{ foo?: string, bar?: string }` for object schemas.
 */
function createMergedAnyOf(schemas: JsonSchema[]): JsonSchema {
	// First, flatten any nested anyOf structures
	const flattened: JsonSchema[] = [];
	for (const schema of schemas) {
		if (schema.anyOf) {
			flattened.push(...schema.anyOf);
		} else {
			flattened.push(schema);
		}
	}

	const deduplicated = deduplicateSchemas(flattened);

	// Separate schemas into objects, arrays, and other types
	const objectSchemas: JsonSchema[] = [];
	const arraySchemas: JsonSchema[] = [];
	const otherSchemas: JsonSchema[] = [];

	for (const schema of deduplicated) {
		if (schema.type === 'object' || schema.properties) {
			objectSchemas.push(schema);
		} else if (schema.type === 'array') {
			arraySchemas.push(schema);
		} else {
			otherSchemas.push(schema);
		}
	}

	// Start with non-object/non-array schemas
	const finalSchemas = [...otherSchemas];

	// If there are multiple object schemas, merge them into one
	if (objectSchemas.length > 1) {
		let merged = objectSchemas[0];
		for (let i = 1; i < objectSchemas.length; i++) {
			merged = mergeObjectSchemas(merged, objectSchemas[i]);
		}
		finalSchemas.push(merged);
	} else if (objectSchemas.length === 1) {
		finalSchemas.push(objectSchemas[0]);
	}

	// If there are multiple array schemas, merge them into one
	if (arraySchemas.length > 1) {
		let merged = arraySchemas[0];
		for (let i = 1; i < arraySchemas.length; i++) {
			merged = mergeArraySchemas(merged, arraySchemas[i]);
		}
		finalSchemas.push(merged);
	} else if (arraySchemas.length === 1) {
		finalSchemas.push(arraySchemas[0]);
	}

	// If only one schema remains, return it directly
	if (finalSchemas.length === 1) {
		return finalSchemas[0];
	}

	return {
		anyOf: finalSchemas,
	};
}
