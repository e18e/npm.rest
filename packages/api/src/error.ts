import { setCoreHeaders } from '$lib/headers';
import { defineErrorHandler } from 'nitro';

export default defineErrorHandler((error) => {
	const headers = new Headers();
	setCoreHeaders(headers);

	const data = {
		success: false,
		status: error.status,
		statusText: error.statusText ?? null,
		message: error.unhandled
			? 'Internal Server Error'
			: error.message || null,
	};

	return Response.json(data, {
		headers,
		status: error.status,
		statusText: error.statusText,
	});
});
