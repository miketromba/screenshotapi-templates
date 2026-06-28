export type ImageFormat = 'png' | 'jpeg' | 'webp'

export type CaptureOptions = {
	targetUrl: string
	width: number
	height: number
	format: ImageFormat
	fullPage: boolean
}

export type RuntimeEnv = {
	SCREENSHOTAPI_KEY?: string
	SCREENSHOTAPI_BASE_URL?: string
	SCREENSHOTAPI_MOCK_MODE?: string
}

export type CaptureResult = {
	body: ArrayBuffer
	contentType: string
	cacheControl: string
	screenshotId: string
	creditsRemaining: string
}

const DEFAULT_BASE_URL = 'https://screenshotapi.to'

export function parseDimension(value: string | null, fallback: number): number {
	if (!value) {
		return fallback
	}

	const parsed = Number.parseInt(value, 10)
	if (!Number.isFinite(parsed)) {
		return fallback
	}

	return Math.min(Math.max(parsed, 320), 2400)
}

export function parseFormat(value: string | null): ImageFormat {
	if (value === 'jpeg' || value === 'webp') {
		return value
	}

	return 'png'
}

export function parseBoolean(value: string | null): boolean {
	return value === 'true' || value === '1' || value === 'on'
}

export function normalizeTargetUrl(value: string): string {
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

export async function captureScreenshot(
	options: CaptureOptions,
	env: RuntimeEnv = readRuntimeEnv()
): Promise<CaptureResult> {
	const targetUrl = normalizeTargetUrl(options.targetUrl)

	if (isEnabled(env.SCREENSHOTAPI_MOCK_MODE)) {
		return createMockImage({ ...options, targetUrl })
	}

	if (!env.SCREENSHOTAPI_KEY) {
		throw new Error(
			'SCREENSHOTAPI_KEY is required when SCREENSHOTAPI_MOCK_MODE is false'
		)
	}

	const params = new URLSearchParams({
		url: targetUrl,
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
	const response = await fetch(`${baseUrl}/api/v1/screenshot?${params}`, {
		headers: { 'x-api-key': env.SCREENSHOTAPI_KEY }
	})

	if (!response.ok) {
		throw new Error(
			`ScreenshotAPI ${response.status}: ${await readErrorMessage(response)}`
		)
	}

	return {
		body: await response.arrayBuffer(),
		contentType: response.headers.get('content-type') ?? 'image/png',
		cacheControl: 'public, max-age=300, stale-while-revalidate=600',
		screenshotId: response.headers.get('x-screenshot-id') ?? '',
		creditsRemaining: response.headers.get('x-credits-remaining') ?? ''
	}
}

function readRuntimeEnv(): RuntimeEnv {
	return {
		SCREENSHOTAPI_KEY: process.env.SCREENSHOTAPI_KEY,
		SCREENSHOTAPI_BASE_URL: process.env.SCREENSHOTAPI_BASE_URL,
		SCREENSHOTAPI_MOCK_MODE: process.env.SCREENSHOTAPI_MOCK_MODE
	}
}

function isEnabled(value: string | undefined): boolean {
	return value === 'true' || value === '1'
}

async function createMockImage(
	options: CaptureOptions
): Promise<CaptureResult> {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="Mock ScreenshotAPI output"><title>Mock ScreenshotAPI output</title><rect width="100%" height="100%" fill="#f5f7fb"/><rect x="32" y="32" width="${options.width - 64}" height="${options.height - 64}" rx="8" fill="#ffffff" stroke="#c9d3e5"/><text x="64" y="104" fill="#172033" font-family="Arial, sans-serif" font-size="32" font-weight="700">ScreenshotAPI mock capture</text><text x="64" y="154" fill="#5b667a" font-family="Arial, sans-serif" font-size="20">${escapeHtml(options.targetUrl)}</text><text x="64" y="${options.height - 72}" fill="#5b667a" font-family="Arial, sans-serif" font-size="18">${options.width}x${options.height} ${options.format.toUpperCase()}${options.fullPage ? ' full page' : ''}</text></svg>`

	return {
		body: await new Blob([svg], { type: 'image/svg+xml' }).arrayBuffer(),
		contentType: 'image/svg+xml',
		cacheControl: 'no-store',
		screenshotId: 'mock-screenshot',
		creditsRemaining: 'mock'
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

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}
