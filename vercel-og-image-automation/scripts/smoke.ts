import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateOgImage } from '../src/og-image'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outputDir = join(scriptDir, '..', 'sample-output')
const outputPath = join(outputDir, 'mock-og-image.svg')

const result = await generateOgImage({
	options: {
		title: 'Smoke test OG image',
		description: 'Generated locally without ScreenshotAPI credentials.',
		label: 'ScreenshotAPI'
	},
	env: { SCREENSHOTAPI_MOCK_MODE: 'true' },
	requestOrigin: 'http://localhost:3000'
})

if (result.contentType !== 'image/svg+xml') {
	throw new Error(`Expected mock SVG, received ${result.contentType}`)
}

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, Buffer.from(result.body))
console.log(`Wrote ${outputPath}`)
