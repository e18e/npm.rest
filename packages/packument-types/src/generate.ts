// Warning, while this isn't vibe coded, please send help
// - ghostdevv

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { toJsonSchema } from '@valibot/to-json-schema';
import { packumentTable } from '@npm.rest/db/schema';
import { compile } from 'json-schema-to-typescript';
import { mergeSchemas } from './merge-schemas';
import type { JsonSchema } from './types';
import { db } from '@npm.rest/db/server';
import { toSchema } from './to-schema';
import { Result } from 'better-result';
import { existsSync } from 'node:fs';
import { inspect } from 'node:util';
import { join } from 'node:path';
import { config } from 'dotenv';
import * as v from 'valibot';

config({ path: join(import.meta.dirname, '../../../.env') });

const OUTPUT_DIR = join(import.meta.dirname, '../output');

if (!existsSync(OUTPUT_DIR)) {
	await mkdir(OUTPUT_DIR);
}

const Version = v.looseObject({
	scripts: v.optional(v.record(v.string(), v.string())),
	bin: v.optional(v.union([v.string(), v.record(v.string(), v.string())])),
	imports: v.optional(
		v.record(
			v.string(),
			v.union([v.string(), v.record(v.string(), v.string())]),
		),
	),
	// exports
	dependencies: v.optional(v.record(v.string(), v.string())),
	devDependencies: v.optional(v.record(v.string(), v.string())),
	optionalDependencies: v.optional(v.record(v.string(), v.string())),
	peerDependencies: v.optional(v.record(v.string(), v.string())),
	// exports: v.optional(
	// 	v.union([
	// 		v.string(),
	// 		v.record(
	// 			v.string(),
	// 			v.nullable(
	// 				v.union([
	// 					v.string(),
	// 					v.record(
	// 						v.string(),
	// 						v.nullable(
	// 							v.union([
	// 								v.string(),
	// 								v.record(
	// 									v.string(),
	// 									v.union([
	// 										v.string(),
	// 										v.record(v.string(), v.string()),
	// 									]),
	// 								),
	// 							]),
	// 						),
	// 					),
	// 					v.array(
	// 						v.union([
	// 							v.string(),
	// 							v.record(v.string(), v.string()),
	// 						]),
	// 					),
	// 					v.literal(false),
	// 				]),
	// 			),
	// 		),
	// 	]),
	// ),
});

const Root = v.looseObject({
	time: v.optional(
		v.looseObject({
			created: v.string(),
			modified: v.string(),
			unpublished: v.optional(
				v.strictObject({
					time: v.string(),
					versions: v.array(v.string()),
				}),
			),
		}),
	),
	// time: v.optional(
	// 	v.intersect([
	// 		v.object({
	// 			created: v.string(),
	// 			modified: v.string(),
	// 			unpublished: v.optional(
	// 				v.strictObject({
	// 					time: v.string(),
	// 					versions: v.array(v.string()),
	// 				}),
	// 			),
	// 		}),
	// 		v.record(v.string(), v.string()),
	// 	]),
	// ),
	users: v.optional(v.record(v.string(), v.literal(true))),
	'dist-tags': v.optional(
		v.intersect([
			v.object({ latest: v.optional(v.string()) }),
			v.record(v.string(), v.string()),
		]),
	),
});

async function packumentToSchema(packument: unknown) {
	const parsed = v.safeParse(
		v.looseObject({
			...Root.entries,
			versions: v.optional(v.record(v.string(), Version)),
		}),
		packument,
	);

	if (!parsed.success) {
		return Result.err(new v.ValiError(parsed.issues));
	}

	return Result.try(() => {
		const {
			time,
			users,
			versions,
			'dist-tags': distTags,
			...data
		} = parsed.output;

		const versionsSchema = Object.values(versions || {})
			.map(
				({
					scripts,
					bin,
					imports,
					dependencies,
					devDependencies,
					optionalDependencies,
					peerDependencies,
					// peerDependenciesMeta,
					// exports,
					...v
				}) => {
					const schema = toSchema(v);
					// schema.properties!.scripts = recordStringStringSchema();
					// schema.properties!.bin = recordStringStringSchema();
					// schema.properties!.dependencies =
					// 	recordStringStringSchema();
					// schema.properties!.devDependencies =
					// 	recordStringStringSchema();
					// schema.properties!.peerDependencies =
					// 	recordStringStringSchema();
					// schema.properties!.peerDependenciesMeta =
					//                schema.properties!.imports =

					return mergeSchemas(
						schema,
						toJsonSchema(Version) as JsonSchema,
					);
				},
			)
			.reduce(
				(acc, schema) => mergeSchemas(acc, schema),
				{} as JsonSchema,
			);

		const schema = mergeSchemas(
			toSchema(data),
			toJsonSchema(Root) as JsonSchema,
		);

		schema.properties!.versions = {
			type: 'object',
			additionalProperties: versionsSchema,
		};

		schema.properties!.time.additionalProperties = {
			type: 'string',
		};

		return schema;
	});
}

async function checkpoint(offset: number, schema: JsonSchema | null) {
	console.log(`checkpoint at ${offset}`);

	await writeFile(
		join(OUTPUT_DIR, './checkpoint.json'),
		JSON.stringify({ offset }),
	);

	await writeFile(
		join(OUTPUT_DIR, './schema.json'),
		JSON.stringify(schema, null, 2),
	);

	if (schema) {
		const ts = await compile(schema as unknown as any, 'Packument');
		await writeFile(join(OUTPUT_DIR, './types.ts'), ts);
	}
}

const check = await Result.tryPromise(async () => {
	const checkpointRaw = await readFile(
		join(OUTPUT_DIR, './checkpoint.json'),
		'utf-8',
	);

	const parsed = JSON.parse(checkpointRaw) as { offset: number };

	const schemaRaw = await readFile(
		join(OUTPUT_DIR, './schema.json'),
		'utf-8',
	);

	const schema = JSON.parse(schemaRaw) as JsonSchema;

	return {
		offset: parsed.offset,
		schema,
	};
});

let schema = check.map((v) => v.schema).unwrapOr(null);
let offset = check.map((v) => v.offset).unwrapOr(0);

while (true) {
	const packuments = await db
		.select({ packument: packumentTable.data })
		.from(packumentTable)
		.orderBy(packumentTable.id)
		.offset(offset)
		.limit(100);

	console.log('another', packuments.length, 'with offset', offset);

	for (const { packument } of packuments) {
		const newSchema = await packumentToSchema(packument);

		if (newSchema.isErr()) {
			await checkpoint(offset, schema);

			if (newSchema.error instanceof v.ValiError) {
				console.log(
					inspect(v.flatten(newSchema.error.issues), {
						depth: 5,
						colors: true,
					}),
				);

				if (
					packument &&
					typeof packument === 'object' &&
					'name' in packument
				) {
					console.log('name', packument.name);
				}

				process.exit(1);
			}

			throw newSchema.error;
		}

		if (schema) {
			schema = mergeSchemas(schema, newSchema.value);
		} else {
			schema = newSchema.value;
		}
	}

	offset += 100;

	if (packuments.length < 100) {
		break;
	}

	if (offset % 5000 === 0) {
		await checkpoint(offset, schema);
	}
}

await checkpoint(offset, schema);
