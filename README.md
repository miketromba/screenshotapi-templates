# ScreenshotAPI Starter Templates

Production-oriented starter templates for common ScreenshotAPI workflows. Each
template runs locally in mock or dry-run mode, then switches to live captures
when `SCREENSHOTAPI_KEY` is provided.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=starter-index&ref=templates-index).

## Templates

| Template | Public repo | Use case | Local verification |
| --- | --- | --- | --- |
| `nextjs-screenshot-tool` | `miketromba/screenshotapi-template-nextjs-screenshot-tool` | Hosted form that captures a URL and previews the image | `bun run build && bun run smoke` |
| `cloudflare-worker-screenshot-proxy` | `miketromba/screenshotapi-template-cloudflare-worker-proxy` | Edge proxy with URL validation and cache headers | `bun run build && bun run smoke` |
| `vercel-og-image-automation` | `miketromba/screenshotapi-template-vercel-og-image-automation` | Dynamic OG image route backed by ScreenshotAPI | `bun run build && bun run smoke` |
| `github-actions-visual-snapshot` | `miketromba/screenshotapi-template-github-actions-visual-snapshot` | CI workflow for visual snapshots and diff artifacts | `bun run smoke` |
| `node-batch-screenshot-worker` | `miketromba/screenshotapi-template-node-batch-worker` | Concurrent batch screenshot CLI for queues or jobs | `bun run smoke` |
| `python-scheduled-screenshot-archiver` | `miketromba/screenshotapi-template-python-scheduled-archiver` | Cron-friendly screenshot archive script | `python3 archive.py --dry-run --targets targets.example.json --out sample-output` |

## Validate

From this directory:

```bash
bun install
bun run validate
bun run typecheck
bun run build
bun run smoke
```

The smoke commands use mock or dry-run modes and do not require real
ScreenshotAPI credentials.

## Publish checklist

These templates are prepared for standalone public template repositories. The
GitHub repositories should be marked as template repositories after push.

The root `screenshotapi-templates` repository is an index and validation
workspace; the individual repositories are the one-click template targets.
