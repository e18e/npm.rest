export function setCoreHeaders(headers: Headers) {
	headers.set('Server', 'nitro');
	headers.set('X-Powered-By', 'sleep deprevation');
}
