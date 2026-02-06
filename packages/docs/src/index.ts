const TEMPLATE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>npm.rest ~ docs</title>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app" style="display: contents;"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

    <script>
      Scalar.createApiReference('#app', {
        url: '/_openapi.json'
      })
    </script>
  </body>
</html>`;

// oxlint-disable-next-line eslint-plugin-import(no-default-export))
export default {
	async fetch(request: Request) {
		if (request.method !== 'GET') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		const url = new URL(request.url);

		if (url.pathname === '/_openapi.json') {
			return await fetch('https://npm.rest/_openapi.json');
		}

		if (url.pathname !== '/') {
			return new Response('Not Found', { status: 404 });
		}

		return new Response(TEMPLATE, {
			headers: { 'Content-Type': 'text/html' },
		});
	},
};
