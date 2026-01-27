import { setCoreHeaders } from '$lib/headers';
import { defineHandler } from 'nitro/h3';

export default defineHandler((event) => {
	setCoreHeaders(event.res.headers);
});
