#!/usr/bin/env python3
"""Validate Baldin agentic customization assets.

Checks:
  1. YAML frontmatter presence and parseability in Copilot .agent.md, .prompt.md,
     .instructions.md, and SKILL.md files
  2. applyTo globs in instruction files resolve to at least one existing path
  3. Agent files declaring agents: also include agent in tools:
  4. Local markdown links in agentic markdown files resolve to existing files
  5. .github/AGENTIC_SURFACE.md inventory matches actual Copilot and Codex files
  6. Root AGENTS.md exists and is non-empty
  7. .codex/config.toml exists and is parseable
  8. .codex/agents/*.toml files exist, are parseable, and include required keys

Requires: Python 3.11+ (stdlib only, uses tomllib).
Exit 0 on pass, exit 1 with diagnostics on failure.
"""

from __future__ import annotations

import re
import sys
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GITHUB_DIR = REPO_ROOT / ".github"
CODEX_DIR = REPO_ROOT / ".codex"

ERRORS: list[str] = []
WARNINGS: list[str] = []


def error(msg: str) -> None:
    ERRORS.append(msg)


def warn(msg: str) -> None:
    WARNINGS.append(msg)


def parse_frontmatter(path: Path) -> tuple[dict[str, str | list[str]], str]:
    """Return (frontmatter_dict, body) from a file with --- delimited YAML."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}, text

    end = text.find("\n---", 3)
    if end == -1:
        return {}, text

    raw = text[4:end]
    body = text[end + 4 :]
    fm: dict[str, str | list[str]] = {}
    current_key: str | None = None

    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("- ") and current_key is not None:
            val = stripped[2:].strip().strip('"').strip("'")
            existing = fm.get(current_key)
            if isinstance(existing, list):
                existing.append(val)
            else:
                fm[current_key] = [val]
            continue

        match = re.match(r"^([a-zA-Z_-]+)\s*:\s*(.*)", line)
        if not match:
            continue

        key = match.group(1)
        value = match.group(2).strip()
        current_key = key

        if value.startswith("[") and value.endswith("]"):
            items = [
                segment.strip().strip('"').strip("'")
                for segment in value[1:-1].split(",")
                if segment.strip()
            ]
            fm[key] = items
        elif value:
            fm[key] = value.strip('"').strip("'")
        else:
            fm[key] = []

    return fm, body


def check_frontmatter() -> dict[Path, dict[str, str | list[str]]]:
    patterns = [
        GITHUB_DIR / "agents" / "*.agent.md",
        GITHUB_DIR / "prompts" / "*.prompt.md",
        GITHUB_DIR / "instructions" / "*.instructions.md",
        GITHUB_DIR / "skills" / "*" / "SKILL.md",
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


def check_apply_to(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    for path, fm in all_fm.items():
        if not path.name.endswith(".instructions.md"):
            continue

        apply_to = fm.get("applyTo")
        if not apply_to:
            continue

        raw = apply_to if isinstance(apply_to, str) else ", ".join(apply_to)
        segments = [segment.strip() for segment in raw.split(",") if segment.strip()]

        for segment in segments:
            matches = list(REPO_ROOT.glob(segment))
            if not matches:
                warn(
                    f"{path.relative_to(REPO_ROOT)}: applyTo glob '{segment}' "
                    "matches no files (--warn-only)"
                )


def check_agent_tool_alias(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    for path, fm in all_fm.items():
        if not path.name.endswith(".agent.md"):
            continue

        has_agents = "agents" in fm
        tools = fm.get("tools", [])
        tools_list = tools if isinstance(tools, list) else [tools]

        if has_agents and "agent" not in tools_list:
            error(
                f"{path.relative_to(REPO_ROOT)}: declares 'agents:' but 'agent' "
                "is missing from 'tools:' list"
            )


_MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")


def check_local_links() -> None:
    patterns = [
        GITHUB_DIR / "*.md",
        GITHUB_DIR / "agents" / "*.agent.md",
        GITHUB_DIR / "prompts" / "*.prompt.md",
        GITHUB_DIR / "instructions" / "*.instructions.md",
        GITHUB_DIR / "skills" / "*" / "SKILL.md",
    ]

    for pattern in patterns:
        for path in sorted(REPO_ROOT.glob(str(pattern.relative_to(REPO_ROOT)))):
            text = path.read_text(encoding="utf-8")
            if text.startswith("---"):
                end = text.find("\n---", 3)
                if end != -1:
                    text = text[end + 4 :]

            for match in _MD_LINK_RE.finditer(text):
                target = match.group(2)
                if target.startswith(("http://", "https://", "#", "{{", "mailto:")):
                    continue

                target_path = target.split("#", 1)[0]
                if not target_path:
                    continue

                resolved = (path.parent / target_path).resolve()
                if not resolved.exists():
                    error(
                        f"{path.relative_to(REPO_ROOT)}: broken link "
                        f"[{match.group(1)}]({match.group(2)}) -> "
                        f"{resolved.relative_to(REPO_ROOT)}"
                    )


def check_agentic_surface_inventory(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    surface_path = GITHUB_DIR / "AGENTIC_SURFACE.md"
    if not surface_path.exists():
        error(".github/AGENTIC_SURFACE.md does not exist")
        return

    surface_text = surface_path.read_text(encoding="utf-8")

    if "AGENTS.md" not in surface_text:
        error(".github/AGENTIC_SURFACE.md: missing reference to AGENTS.md")

    if ".codex/config.toml" not in surface_text:
        error(".github/AGENTIC_SURFACE.md: missing reference to .codex/config.toml")

    agent_files = sorted(GITHUB_DIR.glob("agents/*.agent.md"))
    for agent_file in agent_files:
        fm = all_fm.get(agent_file, {})
        agent_name = fm.get("name", "") if fm else ""
        slug = agent_file.stem.replace(".agent", "")
        if agent_name and agent_name in surface_text:
            continue
        if slug in surface_text or agent_file.name in surface_text:
            continue
        error(
            f".github/AGENTIC_SURFACE.md: missing reference to agent '{agent_file.name}' "
            f"(name='{agent_name}', slug='{slug}')"
        )

    prompt_files = sorted(GITHUB_DIR.glob("prompts/*.prompt.md"))
    for prompt_file in prompt_files:
        fm = all_fm.get(prompt_file, {})
        prompt_name = fm.get("name", "") if fm else ""
        slug = prompt_file.stem.replace(".prompt", "")
        if prompt_name and prompt_name in surface_text:
            continue
        if slug in surface_text or prompt_file.name in surface_text:
            continue
        error(
            f".github/AGENTIC_SURFACE.md: missing reference to prompt '{prompt_file.name}' "
            f"(name='{prompt_name}', slug='{slug}')"
        )

    skill_dirs = sorted(
        directory for directory in (GITHUB_DIR / "skills").iterdir() if directory.is_dir()
    )
    for skill_dir in skill_dirs:
        if skill_dir.name not in surface_text:
            error(f".github/AGENTIC_SURFACE.md: missing reference to skill '{skill_dir.name}'")

    instruction_files = sorted(GITHUB_DIR.glob("instructions/*.instructions.md"))
    for instruction_file in instruction_files:
        if (
            instruction_file.name not in surface_text
            and instruction_file.stem.replace(".instructions", "") not in surface_text
        ):
            error(
                ".github/AGENTIC_SURFACE.md: missing reference to instruction "
                f"'{instruction_file.name}'"
            )

    codex_agent_files = sorted((CODEX_DIR / "agents").glob("*.toml"))
    for codex_agent_file in codex_agent_files:
        try:
            data = tomllib.loads(codex_agent_file.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError:
            continue

        name = data.get("name", "")
        slug = codex_agent_file.stem
        if name and name in surface_text:
            continue
        if slug in surface_text or codex_agent_file.name in surface_text:
            continue
        error(
            f".github/AGENTIC_SURFACE.md: missing reference to Codex agent '{codex_agent_file.name}' "
            f"(name='{name}', slug='{slug}')"
        )


def check_agents_md() -> None:
    path = REPO_ROOT / "AGENTS.md"
    if not path.exists():
        error("AGENTS.md does not exist")
        return

    if not path.read_text(encoding="utf-8").strip():
        error("AGENTS.md exists but is empty")


def check_codex_config() -> None:
    config_path = CODEX_DIR / "config.toml"
    if not config_path.exists():
        error(".codex/config.toml does not exist")
        return

    try:
        data = tomllib.loads(config_path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        error(f".codex/config.toml: parse error: {exc}")
        return

    agents_table = data.get("agents")
    if not isinstance(agents_table, dict):
        error(".codex/config.toml: missing [agents] table")
        return

    if "max_threads" not in agents_table:
        warn(".codex/config.toml: [agents] missing max_threads (--warn-only)")

    if "max_depth" not in agents_table:
        warn(".codex/config.toml: [agents] missing max_depth (--warn-only)")


def check_codex_agents() -> None:
    agents_dir = CODEX_DIR / "agents"
    if not agents_dir.exists():
        error(".codex/agents does not exist")
        return

    agent_files = sorted(agents_dir.glob("*.toml"))
    if not agent_files:
        error(".codex/agents contains no *.toml files")
        return

    seen_names: set[str] = set()

    for path in agent_files:
        try:
            data = tomllib.loads(path.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError as exc:
            error(f"{path.relative_to(REPO_ROOT)}: parse error: {exc}")
            continue

        for key in ("name", "description", "developer_instructions"):
            value = data.get(key)
            if not isinstance(value, str) or not value.strip():
                error(f"{path.relative_to(REPO_ROOT)}: missing required non-empty '{key}'")

        name = data.get("name")
        if isinstance(name, str) and name in seen_names:
            error(f"{path.relative_to(REPO_ROOT)}: duplicate Codex agent name '{name}'")
        elif isinstance(name, str):
            seen_names.add(name)


def main() -> int:
    warn_only = "--warn-only" in sys.argv

    all_fm = check_frontmatter()
    check_apply_to(all_fm)
    check_agent_tool_alias(all_fm)
    check_local_links()
    check_agentic_surface_inventory(all_fm)
    check_agents_md()
    check_codex_config()
    check_codex_agents()

    for warning in WARNINGS:
        print(f"WARN: {warning}", file=sys.stderr)

    if ERRORS:
        for err in ERRORS:
            print(f"ERROR: {err}", file=sys.stderr)
        print(f"\n{len(ERRORS)} error(s), {len(WARNINGS)} warning(s)", file=sys.stderr)
        return 0 if warn_only else 1

    print(f"OK: all agentic asset checks passed ({len(WARNINGS)} warning(s))", file=sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
