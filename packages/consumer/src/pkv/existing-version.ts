import type { DatabaseLicenses } from './license';
import type { ResourceId } from '@npm.rest/db/id';
import type { DatabaseRepository } from './repo';
import type { DatabaseFunding } from './funding';
import { db } from '@npm.rest/db/server';
import { and, eq } from 'drizzle-orm';
import {
	versionRepositoryTable,
	versionLicenseTable,
	versionFundingTable,
	versionTable,
	licenseTable,
	fundingTable,
	repositoryTable,
} from '@npm.rest/db/schema';

interface ExistingVersion {
	id: ResourceId<'pkv'>;
	licenses: DatabaseLicenses;
	funding: DatabaseFunding;
	repository: DatabaseRepository;
}

export async function getExistingVersion(
	packageId: ResourceId<'pkg'>,
	version: string,
) {
	const exists = await db
		.select({
			id: versionTable.id,
			licenseId: licenseTable.id,
			licenseType: licenseTable.type,
			fundingId: fundingTable.id,
			fundingUrl: fundingTable.url,
			repoId: repositoryTable.id,
			repoUrl: repositoryTable.url,
		})
		.from(versionTable)
		.where(
			and(
				eq(versionTable.packageId, packageId),
				eq(versionTable.version, version),
			),
		)
		.leftJoin(
			versionLicenseTable,
			eq(versionLicenseTable.versionId, versionTable.id),
		)
		.leftJoin(
			licenseTable,
			eq(licenseTable.id, versionLicenseTable.licenseId),
		)
		.leftJoin(
			versionFundingTable,
			eq(versionFundingTable.versionId, versionTable.id),
		)
		.leftJoin(
			fundingTable,
			eq(fundingTable.id, versionFundingTable.fundingId),
		)
		.leftJoin(
			versionRepositoryTable,
			eq(versionRepositoryTable.versionId, versionTable.id),
		)
		.leftJoin(
			repositoryTable,
			eq(repositoryTable.id, versionRepositoryTable.repositoryId),
		);

	if (exists.length === 0) {
		return null;
	}

	const result: ExistingVersion = {
		id: exists[0].id,
		licenses: [],
		funding: [],
		repository: [],
	};

	for (const row of exists) {
		if (row.licenseId && row.licenseType) {
			result.licenses.push({
				id: row.licenseId,
				type: row.licenseType,
			});
		}

		if (row.fundingId && row.fundingUrl) {
			result.funding.push({
				id: row.fundingId,
				url: row.fundingUrl,
			});
		}

		if (row.repoId && row.repoUrl) {
			result.repository.push({
				id: row.repoId,
				url: row.repoUrl,
			});
		}
	}

	return result;
}
