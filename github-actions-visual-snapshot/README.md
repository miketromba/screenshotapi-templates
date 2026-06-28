# GitHub Actions Visual Snapshot Workflow

A portable GitHub Actions workflow plus a TypeScript diff script. It captures
baseline and candidate URLs through ScreenshotAPI, writes baseline/candidate/diff
PNGs, and fails when the diff exceeds a configured threshold.

Get an API key:
[Start with ScreenshotAPI](https://screenshotapi.to?utm_source=starter-template&utm_medium=readme&utm_campaign=github-actions-visual-snapshot&ref=github-actions-template).

## Requirements

- Bun 1.3+
- GitHub Actions
- `SCREENSHOTAPI_KEY` stored as a GitHub Actions secret for live captures

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `SCREENSHOTAPI_KEY` | CI live runs | API key sent as `x-api-key` to ScreenshotAPI. |
| `SCREENSHOTAPI_MOCK_MODE` | Local smoke | Set `true` to generate deterministic mock PNGs. |
| `SCREENSHOTAPI_BASE_URL` | No | Override for local API gateways or test doubles. |

## Configure pages

Edit `visual-snapshot.config.json`:

```json
{
	"defaults": {
		"width": 1440,
		"height": 900,
		"thresholdPercent": 0.5
	},
	"pages": [
		{
			"name": "homepage",
			"baselineUrl": "https://production.example.com",
			"candidateUrl": "https://preview.example.com"
		}
	]
}
```

## Deploy

Copy `.github/workflows/visual-snapshots.yml`,
`scripts/visual-snapshot.ts`, `package.json`, `tsconfig.json`, and
`visual-snapshot.config.json` into the repository you want to test.

Then prepare GitHub secrets:

```bash
gh secret set SCREENSHOTAPI_KEY --body "sk_live_your_key"
gh workflow run visual-snapshots.yml
```

Do not create repositories or connect accounts from automation. These commands
are the checklist for the repository owner to run.

## Sample output

The workflow writes:

- `artifacts/homepage-baseline.png`
- `artifacts/homepage-candidate.png`
- `artifacts/homepage-diff.png`
- `artifacts/summary.md`

Local smoke runs in `SCREENSHOTAPI_MOCK_MODE=true` and creates deterministic
mock PNGs with a zero-pixel diff.

## Verify

```bash
bun install
bun run typecheck
bun run build
bun run smoke
```
