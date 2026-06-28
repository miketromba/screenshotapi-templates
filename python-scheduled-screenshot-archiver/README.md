# Python Scheduled Screenshot Archiver

A dependency-free Python script for scheduled screenshot archives. It reads a
target list, captures each URL with ScreenshotAPI, writes dated image folders,
and stores a `summary.json` manifest. Dry-run mode writes SVG stand-ins and
does not require secrets.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=python-scheduled-screenshot-archiver&ref=python-archiver-template).

## Requirements

- Python 3.7+
- Cron, systemd timer, GitHub Actions, or another scheduler
- `SCREENSHOTAPI_KEY` for live captures

## Environment

Copy `.env.example` into your scheduler's environment manager.

| Variable | Required | Description |
| --- | --- | --- |
| `SCREENSHOTAPI_KEY` | Live only | API key sent as `x-api-key` to ScreenshotAPI. |
| `SCREENSHOTAPI_DRY_RUN` | Local smoke | Set `true` to write mock SVG files instead of calling ScreenshotAPI. |
| `SCREENSHOTAPI_BASE_URL` | No | Override for local API gateways or test doubles. |
| `SCREENSHOTAPI_OUTPUT_DIR` | No | Output directory for dated archive folders. |

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
python3 archive.py --dry-run --targets targets.example.json --out sample-output
```

Live run:

```bash
SCREENSHOTAPI_KEY="sk_live_your_key" python3 archive.py --targets targets.json --out archives
```

## Deploy

Cron:

```cron
17 6 * * * cd /srv/screenshot-archiver && SCREENSHOTAPI_KEY=sk_live_your_key python3 archive.py --targets targets.json --out archives
```

GitHub Actions:

```bash
mkdir -p .github/workflows
cp .github/workflows/scheduled-archive.yml .github/workflows/scheduled-archive.yml
gh secret set SCREENSHOTAPI_KEY --body "sk_live_your_key"
```

Stop before creating repositories, configuring schedules, or adding connected
accounts unless the repository owner approves those actions.

## Sample output

Dry-run mode writes dated output:

```text
sample-output/YYYY-MM-DD/example-home.svg
sample-output/YYYY-MM-DD/example-mobile.svg
sample-output/YYYY-MM-DD/summary.json
```

Live mode writes PNG/JPEG/WebP files matching each target's `format`.

## Verify

```bash
python3 -m py_compile archive.py
python3 archive.py --dry-run --targets targets.example.json --out sample-output
```
