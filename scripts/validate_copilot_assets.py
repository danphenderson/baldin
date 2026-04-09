#!/usr/bin/env python3
"""Validate Baldin Copilot customization assets.

Checks:
  1. YAML frontmatter presence and parseability in .agent.md, .prompt.md, .instructions.md
  2. applyTo globs in instructions resolve to at least one existing path
  3. Agent files declaring agents: also include agent in tools:
  4. Local markdown links in asset bodies resolve to existing files
    5. .github/COPILOT_SURFACE.md inventory matches actual file list

Requires: Python 3.9+ (stdlib only, no third-party deps).
Exit 0 on pass, exit 1 with diagnostics on failure.
"""

from __future__ import annotations

import glob
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GITHUB_DIR = REPO_ROOT / ".github"

ERRORS: list[str] = []
WARNINGS: list[str] = []


def error(msg: str) -> None:
    ERRORS.append(msg)


def warn(msg: str) -> None:
    WARNINGS.append(msg)


# ---------------------------------------------------------------------------
# Minimal YAML frontmatter parser (stdlib-only, no PyYAML dependency)
# ---------------------------------------------------------------------------

def parse_frontmatter(path: Path) -> tuple[dict[str, str | list[str]], str]:
    """Return (frontmatter_dict, body) from a file with --- delimited YAML.

    This is intentionally minimal: it handles flat key: value and key: [list]
    lines plus multi-line list syntax (- item). It does NOT handle nested
    objects, multi-line strings, or anchors, which are not used in Copilot
    asset frontmatter.
    """
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}, text

    end = text.find("\n---", 3)
    if end == -1:
        return {}, text

    raw = text[4:end]
    body = text[end + 4:]
    fm: dict[str, str | list[str]] = {}
    current_key: str | None = None

    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        # List continuation: "  - value"
        if stripped.startswith("- ") and current_key is not None:
            val = stripped[2:].strip().strip('"').strip("'")
            existing = fm.get(current_key)
            if isinstance(existing, list):
                existing.append(val)
            else:
                fm[current_key] = [val]
            continue

        m = re.match(r'^([a-zA-Z_-]+)\s*:\s*(.*)', line)
        if not m:
            continue
        key = m.group(1)
        value = m.group(2).strip()
        current_key = key

        # Inline list: [a, b, c]
        if value.startswith("[") and value.endswith("]"):
            items = [v.strip().strip('"').strip("'") for v in value[1:-1].split(",") if v.strip()]
            fm[key] = items
        elif value:
            fm[key] = value.strip('"').strip("'")
        else:
            fm[key] = []

    return fm, body


# ---------------------------------------------------------------------------
# Check 1: Frontmatter presence and parseability
# ---------------------------------------------------------------------------

def check_frontmatter() -> dict[Path, dict[str, str | list[str]]]:
    """Validate that all Copilot asset files have parseable YAML frontmatter."""
    patterns = [
        GITHUB_DIR / "agents" / "*.agent.md",
        GITHUB_DIR / "prompts" / "*.prompt.md",
        GITHUB_DIR / "instructions" / "*.instructions.md",
    ]
    all_fm: dict[Path, dict[str, str | list[str]]] = {}

    for pattern in patterns:
        for path in sorted(REPO_ROOT.glob(str(pattern.relative_to(REPO_ROOT)))):
            try:
                fm, _ = parse_frontmatter(path)
            except Exception as exc:
                error(f"{path.relative_to(REPO_ROOT)}: frontmatter parse error: {exc}")
                continue

            if not fm:
                error(f"{path.relative_to(REPO_ROOT)}: missing YAML frontmatter")
                continue

            if "description" not in fm:
                error(f"{path.relative_to(REPO_ROOT)}: frontmatter missing 'description'")

            if "name" not in fm:
                error(f"{path.relative_to(REPO_ROOT)}: frontmatter missing 'name'")

            all_fm[path] = fm

    return all_fm


# ---------------------------------------------------------------------------
# Check 2: applyTo globs resolve to at least one existing path
# ---------------------------------------------------------------------------

def check_apply_to(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    """Validate that applyTo patterns in instruction files match real files."""
    for path, fm in all_fm.items():
        if not path.name.endswith(".instructions.md"):
            continue
        apply_to = fm.get("applyTo")
        if not apply_to:
            continue

        raw = apply_to if isinstance(apply_to, str) else ", ".join(apply_to)
        segments = [s.strip() for s in raw.split(",") if s.strip()]

        for seg in segments:
            matches = list(REPO_ROOT.glob(seg))
            if not matches:
                warn(f"{path.relative_to(REPO_ROOT)}: applyTo glob '{seg}' matches no files (--warn-only)")


# ---------------------------------------------------------------------------
# Check 3: Agent files declaring agents: must include agent in tools:
# ---------------------------------------------------------------------------

def check_agent_tool_alias(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    """Validate the agent tool alias invariant."""
    for path, fm in all_fm.items():
        if not path.name.endswith(".agent.md"):
            continue

        has_agents = "agents" in fm
        tools = fm.get("tools", [])
        tools_list = tools if isinstance(tools, list) else [tools]

        if has_agents and "agent" not in tools_list:
            error(
                f"{path.relative_to(REPO_ROOT)}: declares 'agents:' but 'agent' "
                f"is missing from 'tools:' list"
            )


# ---------------------------------------------------------------------------
# Check 4: Local markdown links resolve to existing files
# ---------------------------------------------------------------------------

_MD_LINK_RE = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')


def check_local_links(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    """Validate that relative markdown links point to real files."""
    patterns = [
        GITHUB_DIR / "agents" / "*.agent.md",
        GITHUB_DIR / "prompts" / "*.prompt.md",
        GITHUB_DIR / "instructions" / "*.instructions.md",
    ]

    for pattern in patterns:
        for path in sorted(REPO_ROOT.glob(str(pattern.relative_to(REPO_ROOT)))):
            text = path.read_text(encoding="utf-8")
            # Skip frontmatter for link checking
            if text.startswith("---"):
                end = text.find("\n---", 3)
                if end != -1:
                    text = text[end + 4:]

            for match in _MD_LINK_RE.finditer(text):
                target = match.group(2)
                # Skip external URLs, anchors, and template variables
                if target.startswith(("http://", "https://", "#", "{{", "mailto:")):
                    continue
                # Strip anchor from target
                target_path = target.split("#")[0]
                if not target_path:
                    continue

                resolved = (path.parent / target_path).resolve()
                if not resolved.exists():
                    error(
                        f"{path.relative_to(REPO_ROOT)}: broken link "
                        f"[{match.group(1)}]({match.group(2)}) -> "
                        f"{resolved.relative_to(REPO_ROOT)}"
                    )


# ---------------------------------------------------------------------------
# Check 5: .github/COPILOT_SURFACE.md inventory matches actual files
# ---------------------------------------------------------------------------

def check_copilot_surface_inventory() -> None:
    """Validate that .github/COPILOT_SURFACE.md references all actual Copilot assets."""
    surface_path = GITHUB_DIR / "COPILOT_SURFACE.md"
    if not surface_path.exists():
        error(".github/COPILOT_SURFACE.md does not exist")
        return

    surface_text = surface_path.read_text(encoding="utf-8")

    # Check agents
    agent_files = sorted(GITHUB_DIR.glob("agents/*.agent.md"))
    for af in agent_files:
        stem = af.stem.replace(".agent", "")
        # Check for frontmatter name, filename, or slug
        try:
            fm, _ = parse_frontmatter(af)
            agent_name = fm.get("name", "")
        except Exception:
            agent_name = ""
        if agent_name and agent_name in surface_text:
            continue
        if stem in surface_text or af.name in surface_text:
            continue
        error(
            f".github/COPILOT_SURFACE.md: missing reference to agent '{af.name}' "
            f"(name='{agent_name}', slug='{stem}')"
        )

    # Check prompts — README lists them by backtick-delimited name
    prompt_files = sorted(GITHUB_DIR.glob("prompts/*.prompt.md"))
    for pf in prompt_files:
        # Extract the name from frontmatter
        try:
            fm, _ = parse_frontmatter(pf)
            name = fm.get("name", "")
        except Exception:
            name = ""

        # Check for the prompt name (from frontmatter) or the slug
        slug = pf.stem.replace(".prompt", "")
        if name and name in surface_text:
            continue
        if slug in surface_text:
            continue
        error(
            f".github/COPILOT_SURFACE.md: missing reference to prompt '{pf.name}' "
            f"(name='{name}', slug='{slug}')"
        )

    # Check skills
    skill_dirs = sorted(d for d in (GITHUB_DIR / "skills").iterdir() if d.is_dir()) if (GITHUB_DIR / "skills").exists() else []
    for sd in skill_dirs:
        if sd.name not in surface_text:
            error(f".github/COPILOT_SURFACE.md: missing reference to skill '{sd.name}'")

    # Check instructions
    instr_files = sorted(GITHUB_DIR.glob("instructions/*.instructions.md"))
    for inf in instr_files:
        if inf.name not in surface_text and inf.stem.replace(".instructions", "") not in surface_text:
            error(f".github/COPILOT_SURFACE.md: missing reference to instruction '{inf.name}'")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    warn_only = "--warn-only" in sys.argv

    all_fm = check_frontmatter()
    check_apply_to(all_fm)
    check_agent_tool_alias(all_fm)
    check_local_links(all_fm)
    check_copilot_surface_inventory()

    for w in WARNINGS:
        print(f"WARN: {w}", file=sys.stderr)

    if ERRORS:
        for e in ERRORS:
            print(f"ERROR: {e}", file=sys.stderr)
        print(f"\n{len(ERRORS)} error(s), {len(WARNINGS)} warning(s)", file=sys.stderr)
        return 0 if warn_only else 1

    print(f"OK: all Copilot asset checks passed ({len(WARNINGS)} warning(s))", file=sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
