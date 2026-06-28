import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

type TemplateSpec = {
	dir: string
	envFile: boolean
	requiredEnv: string[]
	vercelButton: boolean
	netlifyButton: boolean
}

const specs: TemplateSpec[] = [
	{
		dir: 'nextjs-screenshot-tool',
		envFile: true,
		requiredEnv: ['SCREENSHOTAPI_KEY', 'SCREENSHOTAPI_MOCK_MODE'],
		vercelButton: true,
		netlifyButton: true
	},
	{
		dir: 'cloudflare-worker-screenshot-proxy',
		envFile: true,
		requiredEnv: ['SCREENSHOTAPI_KEY', 'SCREENSHOTAPI_MOCK_MODE'],
		vercelButton: false,
		netlifyButton: false
	},
	{
		dir: 'vercel-og-image-automation',
		envFile: true,
		requiredEnv: [
			'SCREENSHOTAPI_KEY',
			'SCREENSHOTAPI_MOCK_MODE',
			'NEXT_PUBLIC_APP_URL'
		],
		vercelButton: true,
		netlifyButton: true
	},
	{
		dir: 'github-actions-visual-snapshot',
		envFile: true,
		requiredEnv: ['SCREENSHOTAPI_KEY', 'SCREENSHOTAPI_MOCK_MODE'],
		vercelButton: false,
		netlifyButton: false
	},
	{
		dir: 'node-batch-screenshot-worker',
		envFile: true,
		requiredEnv: ['SCREENSHOTAPI_KEY', 'SCREENSHOTAPI_DRY_RUN'],
		vercelButton: false,
		netlifyButton: false
	},
	{
		dir: 'python-scheduled-screenshot-archiver',
		envFile: true,
		requiredEnv: ['SCREENSHOTAPI_KEY', 'SCREENSHOTAPI_DRY_RUN'],
		vercelButton: false,
		netlifyButton: false
	}
]

const ctaPattern =
	/https:\/\/screenshotapi\.to[^\s)]*utm_source=starter-template[^\s)]*ref=/i

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch {
		return false
	}
}

function assertContains({
	content,
	needle,
	file,
	errors
}: {
	content: string
	needle: string
	file: string
	errors: string[]
}) {
	if (!content.includes(needle)) {
		errors.push(`${file} must contain ${needle}`)
	}
}

async function validateTemplate(spec: TemplateSpec): Promise<string[]> {
	const errors: string[] = []
	const root = join(import.meta.dir, '..', spec.dir)
	const readmePath = join(root, 'README.md')

	if (!(await fileExists(readmePath))) {
		return [`${spec.dir}/README.md is missing`]
	}

	const readme = await readFile(readmePath, 'utf8')
	assertContains({
		content: readme,
		needle: '## Deploy',
		file: `${spec.dir}/README.md`,
		errors
	})
	assertContains({
		content: readme,
		needle: '## Sample output',
		file: `${spec.dir}/README.md`,
		errors
	})

	if (!ctaPattern.test(readme)) {
		errors.push(
			`${spec.dir}/README.md needs a ScreenshotAPI CTA link with UTM and ref`
		)
	}

	if (spec.vercelButton && !readme.includes('https://vercel.com/button')) {
		errors.push(`${spec.dir}/README.md needs a Vercel Deploy Button`)
	}

	if (
		spec.netlifyButton &&
		!readme.includes('https://www.netlify.com/img/deploy/button.svg')
	) {
		errors.push(`${spec.dir}/README.md needs a Netlify Deploy Button`)
	}

	if (!spec.envFile) {
		return errors
	}

	const envPath = join(root, '.env.example')
	if (!(await fileExists(envPath))) {
		errors.push(`${spec.dir}/.env.example is missing`)
		return errors
	}

	const env = await readFile(envPath, 'utf8')
	for (const key of spec.requiredEnv) {
		assertContains({
			content: readme,
			needle: key,
			file: `${spec.dir}/README.md`,
			errors
		})
		assertContains({
			content: env,
			needle: key,
			file: `${spec.dir}/.env.example`,
			errors
		})
	}

	return errors
}

const allErrors = (await Promise.all(specs.map(validateTemplate))).flat()

if (allErrors.length > 0) {
	for (const error of allErrors) {
		console.error(error)
	}
	process.exitCode = 1
} else {
	console.log(`Validated ${specs.length} template metadata files`)
}
