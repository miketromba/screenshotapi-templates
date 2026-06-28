import { type NextRequest, NextResponse } from 'next/server'
import {
	captureScreenshot,
	parseBoolean,
	parseDimension,
	parseFormat
} from '../../../src/screenshot'

export async function GET(request: NextRequest) {
	const targetUrl = request.nextUrl.searchParams.get('url')

	if (!targetUrl) {
		return NextResponse.json({ error: 'url is required' }, { status: 400 })
	}

	try {
		const result = await captureScreenshot({
			targetUrl,
			width: parseDimension(
				request.nextUrl.searchParams.get('width'),
				1280
			),
			height: parseDimension(
				request.nextUrl.searchParams.get('height'),
				720
			),
			format: parseFormat(request.nextUrl.searchParams.get('type')),
			fullPage: parseBoolean(request.nextUrl.searchParams.get('fullPage'))
		})

		return new NextResponse(result.body, {
			headers: {
				'Content-Type': result.contentType,
				'Cache-Control': result.cacheControl,
				'X-Screenshot-Id': result.screenshotId,
				'X-Credits-Remaining': result.creditsRemaining
			}
		})
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Screenshot capture failed'
		return NextResponse.json({ error: message }, { status: 400 })
	}
}
