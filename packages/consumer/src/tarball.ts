import type { PackumentVersion } from '@npm.rest/validate/packument';
import { Result } from 'better-result';
import { unpack } from '@publint/pack';

export async function downloadTarball(dist: PackumentVersion['dist']) {
	const result = await Result.tryPromise(async () => {
		const response = await fetch(dist.tarball, {
			headers: {
				'User-Agent':
					'npm.rest (+https://github.com/ghostdevv/npm.rest)',
			},
			integrity: dist.integrity,
		});

		if (!response.ok || !response.body) {
			throw new Error(
				`failed to download tarball "${dist.tarball}" with ${response.status}`,
			);
		}

		const length = Number.parseInt(
			response.headers.get('Content-Length') || '',
		);

		if (Number.isNaN(length)) {
			throw new Error('Content-Length header is missing');
		}

		return { response, length };
	});

	if (result.isErr()) {
		return result;
	}

	return await Result.tryPromise(async () => {
		const { rootDir, files } = await unpack(result.value.response.body!);

		return {
			unpackedSize: files
				.map((file) => file.data.byteLength)
				.reduce((a, b) => a + b, 0),
			packedSize: result.value.length,
			rootDir,
			files,
		};
	});
}
