import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateOgImage } from '../src/og-image'

const outputDir = join(import.meta.dir, '..', 'sample-output')
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
