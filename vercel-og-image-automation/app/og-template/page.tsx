export default async function OgTemplate({
	searchParams
}: {
	searchParams: Promise<{
		title?: string
		description?: string
		label?: string
	}>
}) {
	const params = await searchParams
	const title = params.title ?? 'Automated visual evidence'
	const description =
		params.description ??
		'Fast dynamic OG images generated from a real web template.'
	const label = params.label ?? 'ScreenshotAPI'

	return (
		<main className="og-frame">
			<div className="og-topline">
				<span>{label}</span>
				<span>1200 x 630</span>
			</div>
			<h1>{title}</h1>
			<p>{description}</p>
			<div className="og-footer">Generated on demand</div>
		</main>
	)
}
