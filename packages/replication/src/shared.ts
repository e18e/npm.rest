import { createState } from '@npm.rest/db';

export const seq = createState<{ last_seq: number }>('seq');
