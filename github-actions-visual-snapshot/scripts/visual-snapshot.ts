import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

type RuntimeEnv = {
	SCREENSHOTAPI_KEY?: string
	SCREENSHOTAPI_BASE_URL?: string
	SCREENSHOTAPI_MOCK_MODE?: string
}

type PageConfig = {
	name: string
	baselineUrl: string
	candidateUrl: string
	width?: number
	height?: number
	thresholdPercent?: number
}

type VisualConfig = {
	defaults: {
		width: number
		height: number
		thresholdPercent: number
	}
	pages: PageConfig[]
}

type SnapshotResult = {
	name: string
	mismatchedPixels: number
	diffPercent: number
	thresholdPercent: number
	passed: boolean
}

const DEFAULT_BASE_URL = 'https://screenshotapi.to'

const configPath = getArg('--config', 'visual-snapshot.config.json')
const outputDir = getArg('--out', 'artifacts')
const config = parseConfig(await readFile(configPath, 'utf8'))

await mkdir(outputDir, { recursive: true })

const results: SnapshotResult[] = []

for (const page of config.pages) {
	const width = page.width ?? config.defaults.width
	const height = page.height ?? config.defaults.height
	const thresholdPercent =
		page.thresholdPercent ?? config.defaults.thresholdPercent
	const safeName = sanitizeName(page.name)

	const [baseline, candidate] = await Promise.all([
		capturePng({
			url: page.baselineUrl,
			pageName: page.name,
			width,
			height,
			env: process.env
		}),
		capturePng({
			url: page.candidateUrl,
			pageName: page.name,
			width,
			height,
			env: process.env
		})
	])

	const comparison = comparePngs({ baseline, candidate })
	const passed = comparison.diffPercent <= thresholdPercent
	results.push({
		name: page.name,
		mismatchedPixels: comparison.mismatchedPixels,
		diffPercent: comparison.diffPercent,
		thresholdPercent,
		passed
	})

	await writeFile(join(outputDir, `${safeName}-baseline.png`), baseline)
	await writeFile(join(outputDir, `${safeName}-candidate.png`), candidate)
	await writeFile(join(outputDir, `${safeName}-diff.png`), comparison.diff)
}

await writeFile(join(outputDir, 'summary.md'), renderSummary(results))

const failures = results.filter(result => !result.passed)
if (failures.length > 0) {
	for (const failure of failures) {
		console.error(
			`${failure.name} failed: ${failure.diffPercent.toFixed(3)}% > ${failure.thresholdPercent}%`
		)
	}
	process.exitCode = 1
} else {
	console.log(`Visual snapshot passed for ${results.length} page(s)`)
}

async function capturePng({
	url,
	pageName,
	width,
	height,
	env
}: {
	url: string
	pageName: string
	width: number
	height: number
	env: RuntimeEnv
}): Promise<Buffer> {
	if (isEnabled(env.SCREENSHOTAPI_MOCK_MODE)) {
		return createMockPng({ pageName, width, height })
	}

	if (!env.SCREENSHOTAPI_KEY) {
		throw new Error(
			'SCREENSHOTAPI_KEY is required when SCREENSHOTAPI_MOCK_MODE is false'
		)
	}

	const params = new URLSearchParams({
		url: normalizeHttpUrl(url),
		width: String(width),
		height: String(height),
		type: 'png',
		waitUntil: 'networkidle0'
	})

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

	return Buffer.from(await response.arrayBuffer())
}

function comparePngs({
	baseline,
	candidate
}: {
	baseline: Buffer
	candidate: Buffer
}): { mismatchedPixels: number; diffPercent: number; diff: Buffer } {
	const baselinePng = PNG.sync.read(baseline)
	const candidatePng = PNG.sync.read(candidate)

	if (
		baselinePng.width !== candidatePng.width ||
		baselinePng.height !== candidatePng.height
	) {
		throw new Error('Baseline and candidate dimensions do not match')
	}

	const diff = new PNG({
		width: baselinePng.width,
		height: baselinePng.height
	})
	const mismatchedPixels = pixelmatch(
		baselinePng.data,
		candidatePng.data,
		diff.data,
		baselinePng.width,
		baselinePng.height,
		{ threshold: 0.1 }
	)
	const totalPixels = baselinePng.width * baselinePng.height

	return {
		mismatchedPixels,
		diffPercent: (mismatchedPixels / totalPixels) * 100,
		diff: PNG.sync.write(diff)
	}
}

function createMockPng({
	pageName,
	width,
	height
}: {
	pageName: string
	width: number
	height: number
}): Buffer {
	const image = new PNG({
		width: Math.min(width, 160),
		height: Math.min(height, 100)
	})
	const color = colorFromName(pageName)

	for (let y = 0; y < image.height; y += 1) {
		for (let x = 0; x < image.width; x += 1) {
			const index = (image.width * y + x) << 2
			image.data[index] = color.red
			image.data[index + 1] = color.green
			image.data[index + 2] = color.blue
			image.data[index + 3] = 255
		}
	}

	return PNG.sync.write(image)
}

function colorFromName(name: string): {
	red: number
	green: number
	blue: number
} {
	let hash = 0
	for (const char of name) {
		hash = (hash * 31 + char.charCodeAt(0)) % 255
	}

	return {
		red: 50 + (hash % 120),
		green: 80 + (hash % 90),
		blue: 120 + (hash % 70)
	}
}

function parseConfig(raw: string): VisualConfig {
	const value = JSON.parse(raw) as unknown
	if (!isRecord(value) || !Array.isArray(value.pages)) {
		throw new Error('Config must include a pages array')
	}

	const defaultsValue = isRecord(value.defaults) ? value.defaults : {}
	const defaults = {
		width: readNumber(defaultsValue.width, 1440),
		height: readNumber(defaultsValue.height, 900),
		thresholdPercent: readNumber(defaultsValue.thresholdPercent, 0.5)
	}

	return {
		defaults,
		pages: value.pages.map(parsePage)
	}
}

function parsePage(value: unknown): PageConfig {
	if (!isRecord(value)) {
		throw new Error('Each page must be an object')
	}

	const name = readString(value.name, 'page')
	const baselineUrl = readString(value.baselineUrl, '')
	const candidateUrl = readString(value.candidateUrl, '')

	if (!baselineUrl || !candidateUrl) {
		throw new Error(`${name} must include baselineUrl and candidateUrl`)
	}

	return {
		name,
		baselineUrl,
		candidateUrl,
		width: readOptionalNumber(value.width),
		height: readOptionalNumber(value.height),
		thresholdPercent: readOptionalNumber(value.thresholdPercent)
	}
}

function renderSummary(results: SnapshotResult[]): string {
	const lines = [
		'# Visual Snapshot Summary',
		'',
		'| Page | Diff | Threshold | Result |',
		'| --- | ---: | ---: | --- |'
	]

	for (const result of results) {
		lines.push(
			`| ${result.name} | ${result.diffPercent.toFixed(3)}% | ${result.thresholdPercent}% | ${result.passed ? 'pass' : 'fail'} |`
		)
	}

	return `${lines.join('\n')}\n`
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

function getArg(name: string, fallback: string): string {
	const index = process.argv.indexOf(name)
	if (index === -1) {
		return fallback
	}

	return process.argv[index + 1] ?? fallback
}

function sanitizeName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

function isEnabled(value: string | undefined): boolean {
	return value === 'true' || value === '1'
}

function readString(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback
}

function readOptionalNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value)
		? value
		: undefined
}

function readNumber(value: unknown, fallback: number): number {
	return readOptionalNumber(value) ?? fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}
