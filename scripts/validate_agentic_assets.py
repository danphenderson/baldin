#!/usr/bin/env python3
"""Validate Baldin agentic customization assets.

Checks:
  1. YAML frontmatter presence and parseability in Copilot .agent.md, .prompt.md,
     .instructions.md, and SKILL.md files
  2. applyTo globs in instruction files resolve to at least one existing path
  3. Agent files declaring agents: also include agent in tools:
  4. Local markdown links in agentic markdown files and repo AGENTS.md files resolve
  5. .github/AGENTIC_SURFACE.md inventory matches actual Copilot and Codex files
  6. Root and expected scoped AGENTS.md files exist, are non-empty, and match inventory
  7. Tracked AGENTS.md files do not appear outside the approved inventory
  8. Tracked AGENTS.override.md files are rejected
  9. .vscode/mcp.json exists, is parseable, and matches the repo-owned Figma MCP contract
 10. .codex/config.toml exists, is parseable, and does not declare the unsupported webdev MCP mirror
 11. .codex/agents/*.toml files exist, are parseable, and include required keys
 12. .github/copilot-instructions.md stays within the Copilot code review compatibility cap

Requires: Python 3.11+ (stdlib only, uses tomllib).
Exit 0 on pass, exit 1 with diagnostics on failure.
"""

from __future__ import annotations

import fnmatch
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GITHUB_DIR = REPO_ROOT / ".github"
CODEX_DIR = REPO_ROOT / ".codex"
WORKSPACE_MCP_PATH = REPO_ROOT / ".vscode" / "mcp.json"
EXPECTED_WORKSPACE_MCP_SERVERS = {"figma"}
EXPECTED_FIGMA_URL = "https://mcp.figma.com/mcp"
DEFAULT_PROJECT_DOC_MAX_BYTES = 32 * 1024
MAX_COPILOT_INSTRUCTIONS_CHARS = 3900

EXPECTED_SCOPED_AGENTS: tuple[str, ...] = (
    "backend/AGENTS.md",
    "backend/app/AGENTS.md",
    "backend/app/admin_templates/AGENTS.md",
    "backend/app/api/AGENTS.md",
    "backend/app/api/routes/AGENTS.md",
    "backend/app/core/AGENTS.md",
    "backend/app/core/extractor/AGENTS.md",
    "backend/app/core/rag/AGENTS.md",
    "backend/app/extractor/AGENTS.md",
    "backend/app/etl_service/AGENTS.md",
    "backend/app/evals/AGENTS.md",
    "backend/app/tests/AGENTS.md",
    "backend/etl/AGENTS.md",
    "backend/etl/tests/AGENTS.md",
    "backend/alembic/AGENTS.md",
    "backend/public/AGENTS.md",
    "backend/public/seeds/AGENTS.md",
    "frontend/AGENTS.md",
    "frontend/admin/AGENTS.md",
    "frontend/browser-harness/AGENTS.md",
    "frontend/e2e/AGENTS.md",
    "frontend/scripts/AGENTS.md",
    "frontend/src/AGENTS.md",
    "frontend/src/admin/AGENTS.md",
    "frontend/src/browser-harness/AGENTS.md",
    "frontend/src/component/AGENTS.md",
    "frontend/src/design-system/AGENTS.md",
    "frontend/src/layout/AGENTS.md",
    "frontend/src/page/AGENTS.md",
    "frontend/src/route/AGENTS.md",
    "frontend/src/service/AGENTS.md",
    "frontend/test/AGENTS.md",
    "docs/AGENTS.md",
    "docs/docs/AGENTS.md",
    "docs/src/AGENTS.md",
    "docs/static/AGENTS.md",
    "docs/i18n/AGENTS.md",
    "scripts/AGENTS.md",
    "cdk/AGENTS.md",
    "cdk/cdk/AGENTS.md",
    "cdk/tests/AGENTS.md",
    "plans/AGENTS.md",
    ".codex/AGENTS.md",
    ".codex/agents/AGENTS.md",
    ".codex/environments/AGENTS.md",
    ".github/AGENTS.md",
    ".github/agents/AGENTS.md",
    ".github/instructions/AGENTS.md",
    ".github/prompts/AGENTS.md",
    ".github/skills/AGENTS.md",
    ".github/workflows/AGENTS.md",
)
EXPECTED_AGENT_PATHS = {"AGENTS.md", *EXPECTED_SCOPED_AGENTS}
FORBIDDEN_AGENT_GLOBS: tuple[str, ...] = (
    "**/node_modules/**",
    "frontend/dist/**",
    "docs/build/**",
    "docs/.docusaurus/**",
    "**/.venv/**",
    "**/.pytest_cache/**",
    "**/.ruff_cache/**",
    "**/__pycache__/**",
    "**/coverage/**",
    "**/*.egg-info/**",
    "frontend/test-results/**",
    "backend/public/db/**",
    "backend/public/test_db/**",
    "backend/public/logs/**",
    "backend/public/var/**",
    "backend/public/datalake/**",
    "public/**",
    "**/.cdk.staging/**",
    "**/cdk.out/**",
)

ERRORS: list[str] = []
WARNINGS: list[str] = []


def error(msg: str) -> None:
    ERRORS.append(msg)


def warn(msg: str) -> None:
    WARNINGS.append(msg)


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def git_ls_files() -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "ls-files", "-z"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except (OSError, subprocess.CalledProcessError):
        return []

    return [REPO_ROOT / item for item in result.stdout.decode("utf-8").split("\\0") if item]


def matches_forbidden_agent_path(path_text: str) -> bool:
    for pattern in FORBIDDEN_AGENT_GLOBS:
        if fnmatch.fnmatch(path_text, pattern):
            return True
        if pattern.startswith("**/") and fnmatch.fnmatch(path_text, pattern[3:]):
            return True
    return False


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


def iter_agent_markdown_files() -> list[Path]:
    files: set[Path] = {REPO_ROOT / "AGENTS.md"}
    files.update(REPO_ROOT / scoped for scoped in EXPECTED_SCOPED_AGENTS)
    files.update(path for path in git_ls_files() if path.name == "AGENTS.md")
    return sorted(path for path in files if path.exists())


def check_local_links() -> None:
    patterns = [
        GITHUB_DIR / "*.md",
        GITHUB_DIR / "agents" / "*.agent.md",
        GITHUB_DIR / "prompts" / "*.prompt.md",
        GITHUB_DIR / "instructions" / "*.instructions.md",
        GITHUB_DIR / "skills" / "*" / "SKILL.md",
    ]

    paths: set[Path] = set(iter_agent_markdown_files())
    for pattern in patterns:
        paths.update(sorted(REPO_ROOT.glob(str(pattern.relative_to(REPO_ROOT)))))

    for path in sorted(paths):
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
                try:
                    display = resolved.relative_to(REPO_ROOT)
                except ValueError:
                    display = resolved
                error(
                    f"{path.relative_to(REPO_ROOT)}: broken link "
                    f"[{match.group(1)}]({match.group(2)}) -> {display}"
                )


def check_agentic_surface_inventory(all_fm: dict[Path, dict[str, str | list[str]]]) -> None:
    surface_path = GITHUB_DIR / "AGENTIC_SURFACE.md"
    if not surface_path.exists():
        error(".github/AGENTIC_SURFACE.md does not exist")
        return

    surface_text = surface_path.read_text(encoding="utf-8")

    if "AGENTS.md" not in surface_text:
        error(".github/AGENTIC_SURFACE.md: missing reference to AGENTS.md")

    if (
        "root/scoped AGENTS.md" not in surface_text
        and "root/scoped `AGENTS.md`" not in surface_text
    ):
        error(".github/AGENTIC_SURFACE.md: missing reference to root/scoped AGENTS.md")

    if ".codex/config.toml" not in surface_text:
        error(".github/AGENTIC_SURFACE.md: missing reference to .codex/config.toml")

    if ".vscode/mcp.json" not in surface_text:
        error(".github/AGENTIC_SURFACE.md: missing reference to .vscode/mcp.json")

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
    root_path = REPO_ROOT / "AGENTS.md"
    if not root_path.exists():
        error("AGENTS.md does not exist")
        return

    root_text = root_path.read_text(encoding="utf-8")
    if not root_text.strip():
        error("AGENTS.md exists but is empty")

    for scoped in EXPECTED_SCOPED_AGENTS:
        scoped_path = REPO_ROOT / scoped
        if not scoped_path.exists():
            error(f"{scoped}: expected scoped AGENTS.md file does not exist")
        elif not scoped_path.read_text(encoding="utf-8").strip():
            error(f"{scoped}: expected scoped AGENTS.md file is empty")

        if scoped not in root_text:
            error(f"AGENTS.md: directory map missing expected scoped path {scoped}")

    tracked_files = git_ls_files()
    tracked_agents = {rel(path) for path in tracked_files if path.name == "AGENTS.md"}
    unexpected_tracked_agents = sorted(tracked_agents - EXPECTED_AGENT_PATHS)
    for path_text in unexpected_tracked_agents:
        error(f"{path_text}: tracked AGENTS.md is outside the expected scoped inventory")

    tracked_overrides = sorted(rel(path) for path in tracked_files if path.name == "AGENTS.override.md")
    for path_text in tracked_overrides:
        error(f"{path_text}: tracked AGENTS.override.md files are not allowed")

    for path_text in sorted(tracked_agents | EXPECTED_AGENT_PATHS):
        if matches_forbidden_agent_path(path_text):
            error(f"{path_text}: AGENTS.md is under a forbidden generated/dependency/runtime path")

    check_instruction_chain_size()


def configured_project_doc_max_bytes() -> int:
    config_path = CODEX_DIR / "config.toml"
    if not config_path.exists():
        return DEFAULT_PROJECT_DOC_MAX_BYTES

    try:
        data = tomllib.loads(config_path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError:
        return DEFAULT_PROJECT_DOC_MAX_BYTES

    value = data.get("project_doc_max_bytes")
    if isinstance(value, int) and value > 0:
        return value
    return DEFAULT_PROJECT_DOC_MAX_BYTES


def check_instruction_chain_size() -> None:
    max_bytes = configured_project_doc_max_bytes()
    root_path = REPO_ROOT / "AGENTS.md"
    if not root_path.exists():
        return

    expected_set = set(EXPECTED_SCOPED_AGENTS)
    for scoped in EXPECTED_SCOPED_AGENTS:
        chain = [root_path]
        current = Path()
        for part in Path(scoped).parent.parts:
            current = current / part
            candidate = (current / "AGENTS.md").as_posix()
            if candidate in expected_set:
                chain.append(REPO_ROOT / candidate)

        total = sum(path.stat().st_size for path in chain if path.exists())
        if total > max_bytes:
            chain_text = " -> ".join(rel(path) for path in chain)
            warn(
                f"instruction chain for {scoped} is {total} bytes, exceeding "
                f"project_doc_max_bytes={max_bytes}: {chain_text}"
            )


def check_copilot_instructions_size() -> None:
    path = GITHUB_DIR / "copilot-instructions.md"
    if not path.exists():
        error(".github/copilot-instructions.md does not exist")
        return

    text = path.read_text(encoding="utf-8")
    length = len(text)
    if length > MAX_COPILOT_INSTRUCTIONS_CHARS:
        error(
            ".github/copilot-instructions.md: exceeds "
            f"{MAX_COPILOT_INSTRUCTIONS_CHARS} characters ({length}); keep this file "
            "under GitHub Copilot code review's 4,000-character custom-instruction limit"
        )


def check_workspace_mcp_contract() -> None:
    if not WORKSPACE_MCP_PATH.exists():
        error(".vscode/mcp.json does not exist")
        return

    try:
        data = json.loads(WORKSPACE_MCP_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        error(f".vscode/mcp.json: parse error: {exc}")
        return

    servers = data.get("servers")
    if not isinstance(servers, dict):
        error(".vscode/mcp.json: missing top-level 'servers' object")
        return

    if set(servers) != EXPECTED_WORKSPACE_MCP_SERVERS:
        server_names = ", ".join(sorted(str(name) for name in servers))
        error(
            ".vscode/mcp.json: must declare exactly servers.figma "
            f"(found: {server_names})"
        )

    figma = servers.get("figma")
    if not isinstance(figma, dict):
        error(".vscode/mcp.json: missing 'servers.figma' object")
    else:
        if figma.get("type") != "http":
            error('.vscode/mcp.json: servers.figma.type must be "http"')
        if figma.get("url") != EXPECTED_FIGMA_URL:
            error(
                ".vscode/mcp.json: servers.figma.url must be "
                f'"{EXPECTED_FIGMA_URL}"'
            )


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

    mcp_servers = data.get("mcp_servers", {})
    if isinstance(mcp_servers, dict) and "webdev" in mcp_servers:
        error(
            ".codex/config.toml: must not configure mcp_servers.webdev; "
            "use the frontend Playwright runtime or host browser tooling instead"
        )
    elif mcp_servers not in ({}, None):
        server_names = ", ".join(sorted(str(name) for name in mcp_servers))
        error(
            ".codex/config.toml: must not declare repo-owned MCP servers in this patch "
            f"(found: {server_names})"
        )


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
    check_copilot_instructions_size()
    check_workspace_mcp_contract()
    check_codex_config()
    check_codex_agents()

    for warning in WARNINGS:
        print(f"WARN: {warning}", file=sys.stderr)

    if ERRORS:
        for err in ERRORS:
            print(f"ERROR: {err}", file=sys.stderr)
        print(f"\\n{len(ERRORS)} error(s), {len(WARNINGS)} warning(s)", file=sys.stderr)
        return 0 if warn_only else 1

    print(f"OK: all agentic asset checks passed ({len(WARNINGS)} warning(s))", file=sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
