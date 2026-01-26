import { watchChanges } from './changes';
import { seq } from './shared';
import { seed } from './seed';

if (!(await seq.get())) {
	await seed();
}

await watchChanges();
