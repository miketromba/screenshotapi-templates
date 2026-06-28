from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_BASE_URL = "https://screenshotapi.to"
Target = Dict[str, Any]
SummaryRow = Dict[str, Any]
Args = Dict[str, Any]


def main() -> None:
    args = parse_args()
    captured_at = (
        dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    )
    archive_day = captured_at[:10]
    output_root = Path(args["out"]) / archive_day
    output_root.mkdir(parents=True, exist_ok=True)

    targets = load_targets(Path(args["targets"]))
    rows = [
        capture_target(
            target=target,
            output_root=output_root,
            captured_at=captured_at,
            dry_run=args["dry_run"],
        )
        for target in targets
    ]

    summary_path = output_root / "summary.json"
    summary_path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    print(f"Archived {len(rows)} target(s) into {output_root}")


def parse_args() -> Args:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", default="targets.json")
    parser.add_argument(
        "--out",
        default=os.environ.get("SCREENSHOTAPI_OUTPUT_DIR", "archives"),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=is_enabled(os.environ.get("SCREENSHOTAPI_DRY_RUN")),
    )
    parsed = parser.parse_args()
    return {
        "targets": str(parsed.targets),
        "out": str(parsed.out),
        "dry_run": bool(parsed.dry_run),
    }


def load_targets(path: Path) -> List[Target]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Targets file must contain an array")

    return [normalize_target(item) for item in raw]


def normalize_target(item: object) -> Target:
    if not isinstance(item, dict):
        raise ValueError("Each target must be an object")

    raw = dict(item)
    name = str(raw.get("name", "")).strip()
    url = str(raw.get("url", "")).strip()
    if not name:
        raise ValueError("Each target needs a name")
    if not url.startswith(("http://", "https://")):
        raise ValueError(f"Only http and https URLs are supported: {url}")

    image_format = raw.get("format", "png")
    if image_format not in ("png", "jpeg", "webp"):
        image_format = "png"

    return {
        "name": name,
        "url": url,
        "width": clamp_int(raw.get("width", 1280), 320, 2400),
        "height": clamp_int(raw.get("height", 720), 320, 2400),
        "format": image_format,
        "fullPage": bool(raw.get("fullPage", False)),
    }


def capture_target(
    *,
    target: Target,
    output_root: Path,
    captured_at: str,
    dry_run: bool,
) -> SummaryRow:
    if dry_run:
        path = output_root / f"{safe_file_name(target['name'])}.svg"
        path.write_text(create_mock_svg(target), encoding="utf-8")
        return {
            "target": target["name"],
            "path": str(path),
            "contentType": "image/svg+xml",
            "dryRun": True,
            "capturedAt": captured_at,
        }

    api_key = os.environ.get("SCREENSHOTAPI_KEY")
    if not api_key:
        raise RuntimeError(
            "SCREENSHOTAPI_KEY is required when SCREENSHOTAPI_DRY_RUN is false"
        )

    base_url = os.environ.get("SCREENSHOTAPI_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    params = {
        "url": target["url"],
        "width": str(target["width"]),
        "height": str(target["height"]),
        "type": target["format"],
        "waitUntil": "networkidle0",
    }
    if target["fullPage"]:
        params["fullPage"] = "true"

    request = Request(
        f"{base_url}/api/v1/screenshot?{urlencode(params)}",
        headers={"x-api-key": api_key},
        method="GET",
    )

    try:
        with urlopen(request, timeout=90) as response:
            body = response.read()
            content_type = response.headers.get("content-type", "image/png")
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ScreenshotAPI {error.code}: {message}") from error

    path = output_root / f"{safe_file_name(target['name'])}.{target['format']}"
    path.write_bytes(body)
    return {
        "target": target["name"],
        "path": str(path),
        "contentType": content_type,
        "dryRun": False,
        "capturedAt": captured_at,
    }


def create_mock_svg(target: Target) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{target["width"]}" '
        f'height="{target["height"]}" viewBox="0 0 {target["width"]} '
        f'{target["height"]}" role="img" aria-label="Mock archived screenshot">'
        "<title>Mock archived screenshot</title>"
        '<rect width="100%" height="100%" fill="#f6f3ef"/>'
        f'<rect x="30" y="30" width="{target["width"] - 60}" '
        f'height="{target["height"] - 60}" rx="8" fill="#ffffff" '
        'stroke="#ccbda9"/>'
        f'<text x="60" y="96" fill="#3b3027" font-family="Arial, sans-serif" '
        f'font-size="30" font-weight="700">{html.escape(target["name"])}</text>'
        f'<text x="60" y="142" fill="#725f50" font-family="Arial, sans-serif" '
        f'font-size="19">{html.escape(target["url"])}</text>'
        f'<text x="60" y="{target["height"] - 64}" fill="#725f50" '
        'font-family="Arial, sans-serif" font-size="18">'
        f'{target["width"]}x{target["height"]} {target["format"].upper()}'
        "</text></svg>"
    )


def safe_file_name(value: str) -> str:
    normalized = "".join(char if char.isalnum() else "-" for char in value.lower())
    return "-".join(part for part in normalized.split("-") if part)


def clamp_int(value: object, minimum: int, maximum: int) -> int:
    if not isinstance(value, int):
        return minimum
    return min(max(value, minimum), maximum)


def is_enabled(value: Optional[str]) -> bool:
    return value in {"true", "1"}


if __name__ == "__main__":
    main()
