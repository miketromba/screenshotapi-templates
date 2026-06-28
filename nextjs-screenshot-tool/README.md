# Next.js Screenshot Tool

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmiketromba%2Fscreenshotapi-template-nextjs-screenshot-tool&project-name=screenshotapi-nextjs-tool&repository-name=screenshotapi-nextjs-tool&env=SCREENSHOTAPI_KEY,SCREENSHOTAPI_MOCK_MODE&envDescription=SCREENSHOTAPI_KEY%20enables%20live%20captures.%20Use%20SCREENSHOTAPI_MOCK_MODE%3Dtrue%20for%20a%20mock%20preview.&envLink=https%3A%2F%2Fscreenshotapi.to%2Fdashboard%2Fapi-keys%3Futm_source%3Dstarter-template%26utm_medium%3Ddeploy-button%26utm_campaign%3Dnextjs-screenshot-tool%26ref%3Dnextjs-template)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https%3A%2F%2Fgithub.com%2Fmiketromba%2Fscreenshotapi-template-nextjs-screenshot-tool)

A small App Router tool for capturing a URL with ScreenshotAPI and previewing
the returned image. The app runs without secrets in `SCREENSHOTAPI_MOCK_MODE`
and switches to live captures when `SCREENSHOTAPI_KEY` is set.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=nextjs-screenshot-tool&ref=nextjs-template).

## Requirements

- Bun 1.3+
- Node.js 20+ when deploying to platforms that run Node under the hood
- `SCREENSHOTAPI_KEY` for live captures

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Required | Description |
| --- | --- | --- |
| `SCREENSHOTAPI_KEY` | Live only | API key sent as `x-api-key` to ScreenshotAPI. |
| `SCREENSHOTAPI_MOCK_MODE` | Local smoke | Set `true` to return a generated SVG instead of calling ScreenshotAPI. |
| `SCREENSHOTAPI_BASE_URL` | No | Override for local API gateways or test doubles. |

## Run locally

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000`, enter a URL, and capture.

## Deploy

Vercel:

```bash
vercel env add SCREENSHOTAPI_KEY
vercel deploy
```

Netlify:

```bash
netlify env:set SCREENSHOTAPI_KEY "sk_live_your_key"
netlify deploy --build
```

The deploy buttons above target the public GitHub template repository.

## Sample output

Local smoke writes `sample-output/mock-screenshot.svg`. In live mode,
`/api/screenshot?url=https://example.com&width=1280&height=720&type=png`
returns image bytes and forwards `X-Screenshot-Id` plus
`X-Credits-Remaining`.

## Verify

```bash
bun install
bun run typecheck
bun run build
bun run smoke
```
