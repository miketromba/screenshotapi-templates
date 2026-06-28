export type OgImageOptions = {
	title: string
	description: string
	label: string
}

export type RuntimeEnv = {
	SCREENSHOTAPI_KEY?: string
	SCREENSHOTAPI_BASE_URL?: string
	SCREENSHOTAPI_MOCK_MODE?: string
	NEXT_PUBLIC_APP_URL?: string
}

export type OgImageResult = {
	body: ArrayBuffer
	contentType: string
	cacheControl: string
	screenshotId: string
}

const DEFAULT_BASE_URL = 'https://screenshotapi.to'
const OG_WIDTH = 1200
const OG_HEIGHT = 630

export async function generateOgImage({
	options,
	env = readRuntimeEnv(),
	requestOrigin
}: {
	options: OgImageOptions
	env?: RuntimeEnv
	requestOrigin?: string
}): Promise<OgImageResult> {
	if (isEnabled(env.SCREENSHOTAPI_MOCK_MODE)) {
		return createMockOgImage(options)
	}

	if (!env.SCREENSHOTAPI_KEY) {
		throw new Error(
			'SCREENSHOTAPI_KEY is required when SCREENSHOTAPI_MOCK_MODE is false'
		)
	}

	const appUrl = resolveAppUrl(env.NEXT_PUBLIC_APP_URL, requestOrigin)
	const templateParams = new URLSearchParams({
		title: options.title,
		description: options.description,
		label: options.label
	})

	const screenshotParams = new URLSearchParams({
		url: `${appUrl}/og-template?${templateParams}`,
		width: String(OG_WIDTH),
		height: String(OG_HEIGHT),
		type: 'png',
		waitUntil: 'networkidle0'
	})

	const baseUrl = (env.SCREENSHOTAPI_BASE_URL ?? DEFAULT_BASE_URL).replace(
		/\/+$/,
		''
	)
	const response = await fetch(
		`${baseUrl}/api/v1/screenshot?${screenshotParams}`,
		{ headers: { 'x-api-key': env.SCREENSHOTAPI_KEY } }
	)

	if (!response.ok) {
		throw new Error(
			`ScreenshotAPI ${response.status}: ${await readErrorMessage(response)}`
		)
	}

	return {
		body: await response.arrayBuffer(),
		contentType: response.headers.get('content-type') ?? 'image/png',
		cacheControl: 'public, max-age=86400, stale-while-revalidate=604800',
		screenshotId: response.headers.get('x-screenshot-id') ?? ''
	}
}

function readRuntimeEnv(): RuntimeEnv {
	return {
		SCREENSHOTAPI_KEY: process.env.SCREENSHOTAPI_KEY,
		SCREENSHOTAPI_BASE_URL: process.env.SCREENSHOTAPI_BASE_URL,
		SCREENSHOTAPI_MOCK_MODE: process.env.SCREENSHOTAPI_MOCK_MODE,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
	}
}

function resolveAppUrl(value: string | undefined, requestOrigin?: string) {
	const appUrl = value?.trim() ? value : requestOrigin
	if (!appUrl) {
		throw new Error('NEXT_PUBLIC_APP_URL is required')
	}

	return appUrl.replace(/\/+$/, '')
}

function isEnabled(value: string | undefined): boolean {
	return value === 'true' || value === '1'
}

async function createMockOgImage(
	options: OgImageOptions
): Promise<OgImageResult> {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" role="img" aria-label="Mock OG image"><title>Mock OG image</title><rect width="1200" height="630" fill="#f2f4f0"/><rect x="58" y="58" width="1084" height="514" rx="8" fill="#102624"/><circle cx="1038" cy="158" r="54" fill="#d9b86f"/><text x="92" y="142" fill="#d9b86f" font-family="Arial, sans-serif" font-size="30" font-weight="700">${escapeHtml(options.label)}</text><text x="92" y="292" fill="#ffffff" font-family="Arial, sans-serif" font-size="64" font-weight="800">${escapeHtml(options.title).slice(0, 72)}</text><text x="92" y="368" fill="#cbd8d5" font-family="Arial, sans-serif" font-size="30">${escapeHtml(options.description).slice(0, 110)}</text><text x="92" y="514" fill="#9fb4af" font-family="Arial, sans-serif" font-size="24">Generated with ScreenshotAPI mock mode</text></svg>`

	return {
		body: await new Blob([svg], { type: 'image/svg+xml' }).arrayBuffer(),
		contentType: 'image/svg+xml',
		cacheControl: 'no-store',
		screenshotId: 'mock-og-image'
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
