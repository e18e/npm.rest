import { FetchError, ofetch } from 'ofetch';
import type { PackFile } from 'publint';
import { Result } from 'better-result';
import { join } from 'node:path';
import * as v from 'valibot';

const FileSchema = v.object({
	type: v.literal('file'),
	name: v.string(),
	hash: v.string(),
	size: v.number(),
});

interface Directory {
	type: 'directory';
	name: string;
	files: (Directory | v.InferOutput<typeof FileSchema>)[];
}

const DirectorySchema: v.GenericSchema<Directory> = v.object({
	type: v.literal('directory'),
	name: v.string(),
	files: v.array(v.union([v.lazy(() => DirectorySchema), FileSchema])),
});

const ResponseSchema = v.object({
	type: v.literal('npm'),
	files: v.array(v.union([v.lazy(() => DirectorySchema), FileSchema])),
});

type CreateVFSResult = Result<
	PackFile[],
	FetchError | v.ValiError<typeof ResponseSchema>
>;

export async function createPackFiles(
	name: string,
	version: string,
): Promise<CreateVFSResult> {
	const raw = await Result.tryPromise(async () => {
		return await ofetch(`/npm/${name}@${version}`, {
			baseURL: 'https://data.jsdelivr.com/v1/packages',
			headers: {
				'User-Agent': 'npm.rest (+https://github.com/e18e/npm.rest)',
			},
		});
	});

	if (raw.isErr()) {
		return Result.err(raw.error);
	}

	const data = v.safeParse(ResponseSchema, raw.value);

	if (!data.success) {
		return Result.err(new v.ValiError(data.issues));
	}

	const files: PackFile[] = [];

	function visit(nodes: Directory['files'], prefix: string) {
		for (const node of nodes) {
			if (node.type === 'directory') {
				visit(node.files, join(prefix, node.name));
				continue;
			}

			const path = join(prefix, node.name);

			files.push({
				name: path,
				async data() {
					return await ofetch(path, {
						baseURL: `https://cdn.jsdelivr.net/npm/${name}@${version}`,
						headers: {
							'User-Agent':
								'npm.rest (+https://github.com/e18e/npm.rest)',
						},
						responseType: 'arrayBuffer',
					});
				},
			});
		}
	}

	visit(data.output.files, '/');

	return Result.ok(files);
}
