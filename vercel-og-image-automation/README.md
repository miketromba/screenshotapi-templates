# Vercel OG Image Automation

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmiketromba%2Fscreenshotapi-template-vercel-og-image-automation&project-name=screenshotapi-og-images&repository-name=screenshotapi-og-images&env=SCREENSHOTAPI_KEY,NEXT_PUBLIC_APP_URL,SCREENSHOTAPI_MOCK_MODE&envDescription=SCREENSHOTAPI_KEY%20enables%20live%20captures.%20NEXT_PUBLIC_APP_URL%20must%20be%20your%20deployed%20site%20URL.&envLink=https%3A%2F%2Fscreenshotapi.to%2Fdashboard%2Fapi-keys%3Futm_source%3Dstarter-template%26utm_medium%3Ddeploy-button%26utm_campaign%3Dvercel-og-image-automation%26ref%3Dog-template)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https%3A%2F%2Fgithub.com%2Fmiketromba%2Fscreenshotapi-template-vercel-og-image-automation)

A Next.js template for dynamic Open Graph images. The `/og-template` page
renders HTML, and `/api/og` asks ScreenshotAPI to capture it as a 1200 x 630
image with CDN-friendly cache headers.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=vercel-og-image-automation&ref=og-template).

## Requirements

- Bun 1.3+
- A deployed public URL for live captures
- `SCREENSHOTAPI_KEY` for live captures

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Required | Description |
| --- | --- | --- |
| `SCREENSHOTAPI_KEY` | Live only | API key sent as `x-api-key` to ScreenshotAPI. |
| `NEXT_PUBLIC_APP_URL` | Production | Public URL ScreenshotAPI can reach, for example `https://your-app.vercel.app`. |
| `SCREENSHOTAPI_MOCK_MODE` | Local smoke | Set `true` to return a generated SVG instead of calling ScreenshotAPI. |
| `SCREENSHOTAPI_BASE_URL` | No | Override for local API gateways or test doubles. |

## Run locally

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000` to preview `/api/og` output. Keep mock mode on
for local-only preview URLs because ScreenshotAPI cannot reach `localhost`.

## Deploy

Vercel:

```bash
vercel env add SCREENSHOTAPI_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel deploy
```

Netlify:

```bash
netlify env:set SCREENSHOTAPI_KEY "sk_live_your_key"
netlify env:set NEXT_PUBLIC_APP_URL "https://your-site.netlify.app"
netlify deploy --build
```

After the first deploy, update `NEXT_PUBLIC_APP_URL` to the production URL and
redeploy so ScreenshotAPI captures the public template page.

## Sample output

Local smoke writes `sample-output/mock-og-image.svg`. In live mode,
`/api/og?title=Launch&description=New%20feature&label=Acme` returns a
1200 x 630 image with `Cache-Control:
public, max-age=86400, stale-while-revalidate=604800`.

## Verify

```bash
bun install
bun run typecheck
bun run build
bun run smoke
```
