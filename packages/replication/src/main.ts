import { watchChanges } from './changes';
import { logger, seq } from './shared';
import { seed } from './seed';

logger.info`starting replication service`;

const currentSeq = await seq.get();
logger.info(`current sequence: ${currentSeq?.last_seq}`, { currentSeq });

if (!currentSeq) {
	await seed();
}

await watchChanges();
