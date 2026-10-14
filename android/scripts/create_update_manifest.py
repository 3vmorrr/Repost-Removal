#!/usr/bin/env python3
"""Create the small update manifest uploaded with an Android GitHub release."""

import argparse
import json
import re
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", required=True)
    parser.add_argument("--repository", default="3vmorrr/Repost-Removal")
    parser.add_argument("--output", default="android-update.json")
    args = parser.parse_args()

    project = Path(__file__).resolve().parents[1]
    gradle = (project / "app" / "build.gradle.kts").read_text(encoding="utf-8")
    release_config = json.loads((project / "release-update.json").read_text(encoding="utf-8"))

    version_code_match = re.search(r"versionCode\s*=\s*(\d+)", gradle)
    version_name_match = re.search(r'versionName\s*=\s*"([^"]+)"', gradle)
    if not version_code_match or not version_name_match:
        raise SystemExit("Could not read Android versionCode/versionName from build.gradle.kts")

    version_code = int(version_code_match.group(1))
    minimum_supported = int(release_config.get("minimumSupportedVersionCode", version_code))
    if minimum_supported < 1 or minimum_supported > version_code:
        raise SystemExit("minimumSupportedVersionCode must be between 1 and this release's versionCode")

    apk_name = "Repost-Remover-Android.apk"
    manifest = {
        "versionCode": version_code,
        "versionName": version_name_match.group(1),
        "minimumSupportedVersionCode": minimum_supported,
        "message": release_config.get("message", "A new version is available."),
        "messageAr": release_config.get("messageAr", "يتوفر إصدار جديد من التطبيق."),
        "apkUrl": f"https://github.com/{args.repository}/releases/download/{args.tag}/{apk_name}",
    }
    Path(args.output).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

