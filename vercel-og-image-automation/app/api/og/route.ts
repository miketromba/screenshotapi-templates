import { type NextRequest, NextResponse } from 'next/server'
import { generateOgImage } from '../../../src/og-image'

export async function GET(request: NextRequest) {
	const title =
		request.nextUrl.searchParams.get('title') ?? 'Automated visual evidence'
	const description =
		request.nextUrl.searchParams.get('description') ??
		'Fast dynamic OG images generated from a real web template.'
	const label = request.nextUrl.searchParams.get('label') ?? 'ScreenshotAPI'

	try {
		const result = await generateOgImage({
			options: { title, description, label },
			requestOrigin: request.nextUrl.origin
		})

		return new NextResponse(result.body, {
			headers: {
				'Content-Type': result.contentType,
				'Cache-Control': result.cacheControl,
				'X-Screenshot-Id': result.screenshotId
			}
		})
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: 'OG image generation failed'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
