import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type ImageFormat = 'png' | 'jpeg' | 'webp'

type RuntimeEnv = {
	SCREENSHOTAPI_KEY?: string
	SCREENSHOTAPI_BASE_URL?: string
	SCREENSHOTAPI_DRY_RUN?: string
	SCREENSHOTAPI_CONCURRENCY?: string
	SCREENSHOTAPI_OUTPUT_DIR?: string
}

type Target = {
	name: string
	url: string
	width: number
	height: number
	format: ImageFormat
	fullPage: boolean
}

type CaptureResult = {
	target: string
	path: string
	contentType: string
	dryRun: boolean
}

const DEFAULT_BASE_URL = 'https://screenshotapi.to'

const args = process.argv.slice(2)
const env: RuntimeEnv = process.env
const targetsPath = getArg('--targets', 'targets.json')
const outputDir = getArg(
	'--out',
	env.SCREENSHOTAPI_OUTPUT_DIR?.trim()
		? env.SCREENSHOTAPI_OUTPUT_DIR
		: 'output'
)
const concurrency = readPositiveInteger(
	getArg('--concurrency', env.SCREENSHOTAPI_CONCURRENCY ?? '3'),
	3
)

await mkdir(outputDir, { recursive: true })
const targets = parseTargets(await readFile(targetsPath, 'utf8'))
const results = await runQueue(targets, concurrency, target =>
	captureTarget({ target, outputDir, env })
)

await writeFile(
	join(outputDir, 'summary.json'),
	`${JSON.stringify(results, null, 2)}\n`
)

console.log(`Captured ${results.length} target(s) into ${outputDir}`)

async function captureTarget({
	target,
	outputDir,
	env
}: {
	target: Target
	outputDir: string
	env: RuntimeEnv
}): Promise<CaptureResult> {
	if (isEnabled(env.SCREENSHOTAPI_DRY_RUN)) {
		const path = join(outputDir, `${safeFileName(target.name)}.svg`)
		await writeFile(path, createMockSvg(target))
		return {
			target: target.name,
			path,
			contentType: 'image/svg+xml',
			dryRun: true
		}
	}

	if (!env.SCREENSHOTAPI_KEY) {
		throw new Error(
			'SCREENSHOTAPI_KEY is required when SCREENSHOTAPI_DRY_RUN is false'
		)
	}

	const params = new URLSearchParams({
		url: normalizeHttpUrl(target.url),
		width: String(target.width),
		height: String(target.height),
		type: target.format,
		waitUntil: 'networkidle0'
	})

	if (target.fullPage) {
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

	const contentType = response.headers.get('content-type') ?? 'image/png'
	const path = join(
		outputDir,
		`${safeFileName(target.name)}.${target.format}`
	)
	await writeFile(path, Buffer.from(await response.arrayBuffer()))

	return {
		target: target.name,
		path,
		contentType,
		dryRun: false
	}
}

async function runQueue<TInput, TOutput>(
	items: TInput[],
	limit: number,
	worker: (item: TInput) => Promise<TOutput>
): Promise<TOutput[]> {
	const results: TOutput[] = []
	let index = 0

	async function runNext(): Promise<void> {
		const currentIndex = index
		index += 1

		if (currentIndex >= items.length) {
			return
		}

		results[currentIndex] = await worker(items[currentIndex])
		await runNext()
	}

	const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
		runNext()
	)
	await Promise.all(workers)
	return results
}

function parseTargets(raw: string): Target[] {
	const value = JSON.parse(raw) as unknown
	if (!Array.isArray(value)) {
		throw new Error('Targets file must contain an array')
	}

	return value.map(parseTarget)
}

function parseTarget(value: unknown): Target {
	if (!isRecord(value)) {
		throw new Error('Each target must be an object')
	}

	const name = readString(value.name, '')
	const url = normalizeHttpUrl(readString(value.url, ''))
	if (!name) {
		throw new Error('Each target needs a name')
	}

	return {
		name,
		url,
		width: clamp(readNumber(value.width, 1280), 320, 2400),
		height: clamp(readNumber(value.height, 720), 320, 2400),
		format: readFormat(value.format),
		fullPage: value.fullPage === true
	}
}

function createMockSvg(target: Target): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${target.width}" height="${target.height}" viewBox="0 0 ${target.width} ${target.height}" role="img" aria-label="Mock batch screenshot"><title>Mock batch screenshot</title><rect width="100%" height="100%" fill="#f2f6f2"/><rect x="30" y="30" width="${target.width - 60}" height="${target.height - 60}" rx="8" fill="#ffffff" stroke="#b6c8b6"/><text x="60" y="96" fill="#213521" font-family="Arial, sans-serif" font-size="30" font-weight="700">${escapeHtml(target.name)}</text><text x="60" y="142" fill="#5f715f" font-family="Arial, sans-serif" font-size="19">${escapeHtml(target.url)}</text><text x="60" y="${target.height - 64}" fill="#5f715f" font-family="Arial, sans-serif" font-size="18">${target.width}x${target.height} ${target.format.toUpperCase()}</text></svg>`
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

function normalizeHttpUrl(value: string): string {
	let parsed: URL
	try {
		parsed = new URL(value)
	} catch {
		throw new Error(`Invalid URL: ${value}`)
	}

	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		throw new Error(`Only http and https URLs are supported: ${value}`)
	}

	return parsed.toString()
}

function getArg(name: string, fallback: string): string {
	const index = args.indexOf(name)
	if (index === -1) {
		return fallback
	}

	return args[index + 1] ?? fallback
}

function isEnabled(value: string | undefined): boolean {
	return value === 'true' || value === '1'
}

function readFormat(value: unknown): ImageFormat {
	if (value === 'jpeg' || value === 'webp') {
		return value
	}

	return 'png'
}

function readString(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback
}

function readNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value)
		? value
		: fallback
}

function readPositiveInteger(value: string, fallback: number): number {
	const parsed = Number.parseInt(value, 10)
	if (!Number.isFinite(parsed) || parsed < 1) {
		return fallback
	}

	return parsed
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

function safeFileName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
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
