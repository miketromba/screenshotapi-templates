'use client'

import { type FormEvent, useMemo, useState } from 'react'

export default function Home() {
	const [title, setTitle] = useState('Automated visual evidence')
	const [description, setDescription] = useState(
		'Fast dynamic OG images generated from a real web template.'
	)
	const [label, setLabel] = useState('ScreenshotAPI')
	const [submitted, setSubmitted] = useState({
		title,
		description,
		label
	})

	const imageUrl = useMemo(() => {
		const params = new URLSearchParams(submitted)
		return `/api/og?${params}`
	}, [submitted])

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmitted({ title, description, label })
	}

	return (
		<main className="shell">
			<section className="tool" aria-label="OG image generator">
				<form className="panel" onSubmit={submit}>
					<p className="eyebrow">ScreenshotAPI</p>
					<h1>OG Image Automation</h1>

					<label className="field">
						<span>Label</span>
						<input
							value={label}
							onChange={event => setLabel(event.target.value)}
						/>
					</label>

					<label className="field">
						<span>Title</span>
						<input
							value={title}
							onChange={event => setTitle(event.target.value)}
						/>
					</label>

					<label className="field">
						<span>Description</span>
						<textarea
							value={description}
							onChange={event =>
								setDescription(event.target.value)
							}
						/>
					</label>

					<button className="button" type="submit">
						Render Preview
					</button>
				</form>

				<div className="preview">
					<img src={imageUrl} alt="Generated Open Graph preview" />
					<code>{imageUrl}</code>
				</div>
			</section>
		</main>
	)
}
