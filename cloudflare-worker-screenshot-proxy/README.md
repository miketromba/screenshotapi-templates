# Cloudflare Worker Screenshot Proxy

A Cloudflare Worker that exposes `/screenshot?url=...`, validates input, calls
ScreenshotAPI from the edge, and returns the image bytes with cache and CORS
headers. Mock mode returns an SVG and requires no secrets.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=cloudflare-worker-screenshot-proxy&ref=cloudflare-worker-template).

## Requirements

- Bun 1.3+
- Node.js 22+ for Wrangler `dev` and `deploy`
- Cloudflare account for deployment
- `SCREENSHOTAPI_KEY` configured as a Wrangler secret for live captures

## Environment

Copy `.dev.vars.example` to `.dev.vars` for local development. `.env.example`
is included for hosts and secret managers that use dotenv-style import.

| Variable | Required | Description |
| --- | --- | --- |
| `SCREENSHOTAPI_KEY` | Live only | Secret API key sent as `x-api-key` to ScreenshotAPI. |
| `SCREENSHOTAPI_MOCK_MODE` | Local smoke | Set `true` to return a generated SVG instead of calling ScreenshotAPI. |
| `SCREENSHOTAPI_BASE_URL` | No | Override for local API gateways or test doubles. |
| `CACHE_TTL_SECONDS` | No | Public cache TTL for successful image responses. |

## Run locally

```bash
bun install
cp .dev.vars.example .dev.vars
bun run dev
```

Then request:

```bash
curl "http://localhost:8787/screenshot?url=https://example.com"
```

## Deploy

Cloudflare Workers:

```bash
bunx wrangler secret put SCREENSHOTAPI_KEY
bun run deploy
```

This template intentionally has no Vercel or Netlify deploy button because it
targets Cloudflare Workers. Stop before connecting an account or deploying if
you are preparing the starter repository only.

## Sample output

Local smoke validates:

- `GET /screenshot?url=https://example.com` returns a mock SVG image.
- `GET /screenshot` returns a JSON `400` error.

In live mode the Worker streams ScreenshotAPI output and forwards
`x-screenshot-id` plus `x-credits-remaining`.

## Verify

```bash
bun install
bun run typecheck
bun run build
bun run smoke
```
