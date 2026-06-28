import worker, { type Env } from '../src/index'

const env: Env = {
	SCREENSHOTAPI_MOCK_MODE: 'true',
	SCREENSHOTAPI_BASE_URL: 'https://screenshotapi.to',
	CACHE_TTL_SECONDS: '0'
}

const response = await worker.fetch(
	new Request(
		'https://worker.test/screenshot?url=https%3A%2F%2Fexample.com&width=900&height=506'
	),
	env
)

if (response.status !== 200) {
	throw new Error(`Expected 200 response, received ${response.status}`)
}

const contentType = response.headers.get('content-type') ?? ''
if (!contentType.includes('image/svg+xml')) {
	throw new Error(`Expected mock SVG content-type, received ${contentType}`)
}

const body = await response.text()
if (!body.includes('Cloudflare Worker proxy')) {
	throw new Error('Mock response did not include expected marker text')
}

const missingUrl = await worker.fetch(
	new Request('https://worker.test/screenshot'),
	env
)

if (missingUrl.status !== 400) {
	throw new Error(`Expected missing url 400, received ${missingUrl.status}`)
}

console.log('Cloudflare Worker mock smoke passed')
