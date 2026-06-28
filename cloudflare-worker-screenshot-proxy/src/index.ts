export interface Env {
	SCREENSHOTAPI_KEY?: string
	SCREENSHOTAPI_BASE_URL?: string
	SCREENSHOTAPI_MOCK_MODE?: string
	CACHE_TTL_SECONDS?: string
}

type CaptureOptions = {
	targetUrl: string
	width: number
	height: number
	format: 'png' | 'jpeg' | 'webp'
	fullPage: boolean
}

const DEFAULT_BASE_URL = 'https://screenshotapi.to'

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders() })
		}

		const url = new URL(request.url)
		if (url.pathname === '/health') {
			return json({ ok: true, service: 'screenshotapi-worker-proxy' })
		}

		if (url.pathname !== '/screenshot') {
			return json({ error: 'Not found' }, 404)
		}

		if (request.method !== 'GET') {
			return json({ error: 'Only GET is supported' }, 405)
		}

		try {
			return await handleScreenshot(url, env)
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Screenshot proxy failed'
			return json({ error: message }, 400)
		}
	}
}

async function handleScreenshot(url: URL, env: Env): Promise<Response> {
	const targetUrl = url.searchParams.get('url')
	if (!targetUrl) {
		return json({ error: 'url is required' }, 400)
	}

	const options: CaptureOptions = {
		targetUrl: normalizeTargetUrl(targetUrl),
		width: parseDimension(url.searchParams.get('width'), 1280),
		height: parseDimension(url.searchParams.get('height'), 720),
		format: parseFormat(url.searchParams.get('type')),
		fullPage: parseBoolean(url.searchParams.get('fullPage'))
	}

	if (isEnabled(env.SCREENSHOTAPI_MOCK_MODE)) {
		return mockResponse(options)
	}

	if (!env.SCREENSHOTAPI_KEY) {
		throw new Error(
			'SCREENSHOTAPI_KEY is required when SCREENSHOTAPI_MOCK_MODE is false'
		)
	}

	const params = new URLSearchParams({
		url: options.targetUrl,
		width: String(options.width),
		height: String(options.height),
		type: options.format,
		waitUntil: 'networkidle0'
	})

	if (options.fullPage) {
		params.set('fullPage', 'true')
	}

	const baseUrl = (env.SCREENSHOTAPI_BASE_URL ?? DEFAULT_BASE_URL).replace(
		/\/+$/,
		''
	)
	const upstream = await fetch(`${baseUrl}/api/v1/screenshot?${params}`, {
		headers: { 'x-api-key': env.SCREENSHOTAPI_KEY }
	})

	if (!upstream.ok) {
		throw new Error(
			`ScreenshotAPI ${upstream.status}: ${await readErrorMessage(upstream)}`
		)
	}

	const headers = new Headers(corsHeaders())
	headers.set(
		'Content-Type',
		upstream.headers.get('content-type') ?? 'image/png'
	)
	headers.set('Cache-Control', cacheControl(env.CACHE_TTL_SECONDS))
	copyHeader(upstream.headers, headers, 'x-screenshot-id')
	copyHeader(upstream.headers, headers, 'x-credits-remaining')

	return new Response(upstream.body, { headers })
}

function mockResponse(options: CaptureOptions): Response {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="Mock proxied screenshot"><title>Mock proxied screenshot</title><rect width="100%" height="100%" fill="#edf3f7"/><rect x="28" y="28" width="${options.width - 56}" height="${options.height - 56}" rx="8" fill="#ffffff" stroke="#adc1cf"/><text x="56" y="96" fill="#12343f" font-family="Arial, sans-serif" font-size="30" font-weight="700">Cloudflare Worker proxy</text><text x="56" y="142" fill="#59707a" font-family="Arial, sans-serif" font-size="19">${escapeHtml(options.targetUrl)}</text></svg>`

	const headers = new Headers(corsHeaders())
	headers.set('Content-Type', 'image/svg+xml')
	headers.set('Cache-Control', 'no-store')
	headers.set('X-Screenshot-Id', 'mock-worker')

	return new Response(svg, { headers })
}

function normalizeTargetUrl(value: string): string {
	let parsed: URL
	try {
		parsed = new URL(value)
	} catch {
		throw new Error('Enter a valid URL')
	}

	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		throw new Error('Only http and https URLs are supported')
	}

	return parsed.toString()
}

function parseDimension(value: string | null, fallback: number): number {
	if (!value) {
		return fallback
	}

	const parsed = Number.parseInt(value, 10)
	if (!Number.isFinite(parsed)) {
		return fallback
	}

	return Math.min(Math.max(parsed, 320), 2400)
}

function parseFormat(value: string | null): CaptureOptions['format'] {
	if (value === 'jpeg' || value === 'webp') {
		return value
	}

	return 'png'
}

function parseBoolean(value: string | null): boolean {
	return value === 'true' || value === '1' || value === 'on'
}

function isEnabled(value: string | undefined): boolean {
	return value === 'true' || value === '1'
}

function cacheControl(value: string | undefined): string {
	const parsed = Number.parseInt(value ?? '', 10)
	const ttl = Number.isFinite(parsed) ? Math.max(parsed, 0) : 300
	return ttl === 0
		? 'no-store'
		: `public, max-age=${ttl}, stale-while-revalidate=${ttl}`
}

function copyHeader(source: Headers, target: Headers, name: string) {
	const value = source.get(name)
	if (value) {
		target.set(name, value)
	}
}

async function readErrorMessage(response: Response): Promise<string> {
	const contentType = response.headers.get('content-type') ?? ''
	if (!contentType.includes('application/json')) {
		return response.statusText
	}

	const body = (await response.json()) as unknown
	if (isRecord(body)) {
		const message = body.message ?? body.error
		if (typeof message === 'string') {
			return message
		}
	}

	return response.statusText
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function corsHeaders(): HeadersInit {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'content-type'
	}
}

function json(body: unknown, status = 200): Response {
	const headers = new Headers(corsHeaders())
	headers.set('Content-Type', 'application/json')
	headers.set('Cache-Control', 'no-store')

	return new Response(JSON.stringify(body), { status, headers })
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}
