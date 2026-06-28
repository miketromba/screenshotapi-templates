'use client'

import { type FormEvent, useEffect, useState } from 'react'

type CaptureState = {
	status: 'idle' | 'loading' | 'success' | 'error'
	imageUrl: string
	error: string
	meta: string
}

const initialState: CaptureState = {
	status: 'idle',
	imageUrl: '',
	error: '',
	meta: ''
}

export default function Home() {
	const [targetUrl, setTargetUrl] = useState('https://example.com')
	const [width, setWidth] = useState('1280')
	const [height, setHeight] = useState('720')
	const [format, setFormat] = useState('png')
	const [fullPage, setFullPage] = useState(false)
	const [capture, setCapture] = useState<CaptureState>(initialState)

	useEffect(() => {
		return () => {
			if (capture.imageUrl) {
				URL.revokeObjectURL(capture.imageUrl)
			}
		}
	}, [capture.imageUrl])

	async function submitCapture(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setCapture(current => ({
			...current,
			status: 'loading',
			error: '',
			meta: ''
		}))

		const params = new URLSearchParams({
			url: targetUrl,
			width,
			height,
			type: format,
			fullPage: String(fullPage)
		})

		try {
			const response = await fetch(`/api/screenshot?${params}`)
			if (!response.ok) {
				const body = (await response.json()) as { error?: string }
				throw new Error(body.error ?? 'Screenshot capture failed')
			}

			const blob = await response.blob()
			const nextImageUrl = URL.createObjectURL(blob)
			setCapture(current => {
				if (current.imageUrl) {
					URL.revokeObjectURL(current.imageUrl)
				}

				const screenshotId = response.headers.get('x-screenshot-id')
				const credits = response.headers.get('x-credits-remaining')
				const meta = [screenshotId, credits && `credits ${credits}`]
					.filter(Boolean)
					.join(' | ')

				return {
					status: 'success',
					imageUrl: nextImageUrl,
					error: '',
					meta
				}
			})
		} catch (error) {
			setCapture(current => ({
				...current,
				status: 'error',
				error:
					error instanceof Error
						? error.message
						: 'Screenshot capture failed'
			}))
		}
	}

	return (
		<main className="shell">
			<section className="workspace" aria-label="Screenshot capture tool">
				<form className="controls" onSubmit={submitCapture}>
					<div>
						<p className="eyebrow">ScreenshotAPI</p>
						<h1>Screenshot Tool</h1>
					</div>

					<label className="field">
						<span>URL</span>
						<input
							required
							type="url"
							value={targetUrl}
							onChange={event => setTargetUrl(event.target.value)}
							placeholder="https://example.com"
						/>
					</label>

					<div className="grid">
						<label className="field">
							<span>Width</span>
							<input
								min="320"
								max="2400"
								type="number"
								value={width}
								onChange={event => setWidth(event.target.value)}
							/>
						</label>
						<label className="field">
							<span>Height</span>
							<input
								min="320"
								max="2400"
								type="number"
								value={height}
								onChange={event =>
									setHeight(event.target.value)
								}
							/>
						</label>
					</div>

					<div className="grid">
						<label className="field">
							<span>Format</span>
							<select
								value={format}
								onChange={event =>
									setFormat(event.target.value)
								}
							>
								<option value="png">PNG</option>
								<option value="webp">WebP</option>
								<option value="jpeg">JPEG</option>
							</select>
						</label>
						<label className="toggle">
							<input
								type="checkbox"
								checked={fullPage}
								onChange={event =>
									setFullPage(event.target.checked)
								}
							/>
							<span>Full page</span>
						</label>
					</div>

					<button
						className="button"
						type="submit"
						disabled={capture.status === 'loading'}
					>
						{capture.status === 'loading'
							? 'Capturing...'
							: 'Capture'}
					</button>

					{capture.status === 'error' ? (
						<p className="message error">{capture.error}</p>
					) : null}
				</form>

				<div className="preview" aria-live="polite">
					{capture.status === 'success' ? (
						<>
							<img
								src={capture.imageUrl}
								alt="Generated screenshot"
							/>
							{capture.meta ? (
								<p className="message">{capture.meta}</p>
							) : null}
						</>
					) : (
						<div className="empty">
							<span>Preview</span>
						</div>
					)}
				</div>
			</section>
		</main>
	)
}
