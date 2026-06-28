import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { captureScreenshot } from '../src/screenshot'

const outputDir = join(import.meta.dir, '..', 'sample-output')
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
