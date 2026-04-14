#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent.parent
CI_WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"
BRANCH_PROTECTION = ROOT / ".github" / "branch-protection.md"


def parse_ci_job_names(path: Path) -> list[str]:
    names: list[str] = []
    in_jobs = False
    current_job: str | None = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        if not in_jobs:
            if raw_line.strip() == "jobs:":
                in_jobs = True
            continue

        if raw_line and not raw_line.startswith(" "):
            break

        if raw_line.startswith("  ") and not raw_line.startswith("    ") and raw_line.rstrip().endswith(":"):
            current_job = raw_line.strip()[:-1]
            continue

        if current_job and raw_line.startswith("    name:"):
            names.append(raw_line.split(":", 1)[1].strip())
            current_job = None

    return names


def parse_required_checks(path: Path) -> list[str]:
    checks: list[str] = []
    capture = False

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if stripped == "- Require these CI jobs to pass:":
            capture = True
            continue

        if not capture:
            continue

        if raw_line.startswith("  - "):
            checks.append(raw_line.removeprefix("  - ").strip().strip("`"))
            continue

        if checks:
            break

    return checks


def main() -> int:
    ci_job_names = parse_ci_job_names(CI_WORKFLOW)
    required_checks = parse_required_checks(BRANCH_PROTECTION)

    if not ci_job_names:
        print(f"Unable to find CI job names in {CI_WORKFLOW}", file=sys.stderr)
        return 1

    if not required_checks:
        print(
            f"Unable to find required status checks in {BRANCH_PROTECTION}",
            file=sys.stderr,
        )
        return 1

    if ci_job_names != required_checks:
        print("Branch protection status checks are out of sync with CI job names.", file=sys.stderr)
        print("CI workflow jobs:", file=sys.stderr)
        for name in ci_job_names:
            print(f"  - {name}", file=sys.stderr)
        print("Documented required checks:", file=sys.stderr)
        for name in required_checks:
            print(f"  - {name}", file=sys.stderr)
        return 1

    print("Branch protection required checks match CI job names.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
