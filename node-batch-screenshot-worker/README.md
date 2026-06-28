# Node Batch Screenshot Worker

A concurrent batch worker that reads a target list, captures each URL through
ScreenshotAPI, and writes images plus `summary.json`. Dry-run mode writes SVG
stand-ins and does not require secrets.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=node-batch-screenshot-worker&ref=node-worker-template).

## Requirements

- Bun 1.3+
- Node-compatible runtime if you bundle `dist/index.js`
- `SCREENSHOTAPI_KEY` for live captures

## Environment

Copy `.env.example` to `.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `SCREENSHOTAPI_KEY` | Live only | API key sent as `x-api-key` to ScreenshotAPI. |
| `SCREENSHOTAPI_DRY_RUN` | Local smoke | Set `true` to write mock SVG files instead of calling ScreenshotAPI. |
| `SCREENSHOTAPI_BASE_URL` | No | Override for local API gateways or test doubles. |
| `SCREENSHOTAPI_CONCURRENCY` | No | Number of concurrent captures. |
| `SCREENSHOTAPI_OUTPUT_DIR` | No | Output directory for images and `summary.json`. |

## Targets

Use `targets.example.json` as the starting point:

```json
[
	{
		"name": "homepage",
		"url": "https://example.com",
		"width": 1280,
		"height": 720,
		"format": "png"
	}
]
```

## Run locally

```bash
bun install
SCREENSHOTAPI_DRY_RUN=true bun src/index.ts --targets targets.example.json --out sample-output
```

Live run:

```bash
SCREENSHOTAPI_KEY="sk_live_your_key" bun src/index.ts --targets targets.json --out output --concurrency 3
```

## Deploy

Container:

```bash
docker build -t screenshot-batch-worker .
docker run --rm \
  -e SCREENSHOTAPI_KEY="sk_live_your_key" \
  -v "$PWD/output:/app/output" \
  screenshot-batch-worker
```

Cron example:

```cron
15 * * * * cd /srv/screenshot-worker && SCREENSHOTAPI_KEY=sk_live_your_key bun src/index.ts --targets targets.json --out output
```

Stop before creating cloud jobs, queues, repositories, or connected accounts.

## Sample output

Dry-run mode writes `sample-output/example-home.svg`,
`sample-output/example-mobile.svg`, and `sample-output/summary.json`. Live mode
writes PNG/JPEG/WebP files matching each target's `format`.

## Verify

```bash
bun install
bun run typecheck
bun run build
bun run smoke
```
