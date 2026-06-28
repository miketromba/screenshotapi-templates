import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { captureScreenshot } from '../src/screenshot'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputDir = join(scriptDir, '..', 'sample-output')
const outputPath = join(outputDir, 'mock-screenshot.svg')

const result = await captureScreenshot(
	{
		targetUrl: 'https://example.com',
		width: 1200,
		height: 675,
		format: 'png',
		fullPage: false
	},
	{ SCREENSHOTAPI_MOCK_MODE: 'true' }
)

if (result.contentType !== 'image/svg+xml') {
	throw new Error(`Expected mock SVG, received ${result.contentType}`)
}

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, Buffer.from(result.body))
console.log(`Wrote ${outputPath}`)
