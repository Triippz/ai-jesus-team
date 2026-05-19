# tool catalog

Browse and install optional AI development tools across Claude Code, Cursor, and Codex.

## Quick Reference

```bash
./tools.sh list                              # Browse all tools
./tools.sh list --category mcp-servers       # Filter by category
./tools.sh bundles                           # See pre-built bundles
./tools.sh search <query>                    # Search by name/tag
./tools.sh info <tool-id>                    # Full details
./tools.sh status                            # What's installed where
./tools.sh install <tool-id>                 # Install to all three tools
./tools.sh install --bundle mcp-essentials   # Install a bundle
./tools.sh --dry-run install ...             # Preview first
```

MCP servers are configured uniformly across Claude Code (`~/.claude/settings.json`), Cursor (`~/.cursor/mcp.json`), and Codex (`~/.codex/config.toml`).

---

## MCP Servers

MCP (Model Context Protocol) servers extend AI assistants with real-time access to external tools, data sources, and services. They run locally and communicate via stdio.

### context7

**What it does:** Fetches up-to-date documentation and code examples for any library or framework. Instead of relying on training data that may be outdated, Context7 pulls live docs so the AI gives answers based on current API surfaces.

**When to use it:** Any time you're working with a library and want accurate, current documentation — especially for fast-moving frameworks (React, Next.js, Flutter, etc.) or recently released versions.

**How it works:** You ask about a library, the AI queries Context7 for the latest docs, and uses that context in its response. No API key required.

```bash
./tools.sh install context7
```

| | |
|---|---|
| Package | `@upstash/context7-mcp` |
| API Key | None required |
| Homepage | [context7.com](https://context7.com) |

---

### sequential-thinking

**What it does:** Provides structured step-by-step reasoning and problem decomposition. Gives the AI a dedicated "thinking" tool where it can break complex problems into sequential steps, revise its thinking, and branch into alternative approaches.

**When to use it:** Complex debugging, architecture decisions, multi-step problem solving, or any task where you want the AI to show its work and reason more carefully.

**How it works:** The AI uses the sequential thinking tool to create numbered thought steps, mark them as hypotheses or conclusions, and build on previous steps. This produces more thorough analysis than single-pass responses.

```bash
./tools.sh install sequential-thinking
```

| | |
|---|---|
| Package | `@modelcontextprotocol/server-sequential-thinking` |
| API Key | None required |

---

### puppeteer

**What it does:** Browser automation — navigate to URLs, click elements, fill forms, take screenshots, and extract page content. Gives the AI the ability to interact with web applications.

**When to use it:** Testing web UIs, debugging frontend issues, scraping rendered content, verifying deployments, taking screenshots for documentation, or automating browser workflows.

**How it works:** Launches a headless Chromium browser that the AI controls through Puppeteer commands. The AI can navigate pages, interact with elements, capture screenshots, and read page content.

```bash
./tools.sh install puppeteer
```

| | |
|---|---|
| Package | `@modelcontextprotocol/server-puppeteer` |
| API Key | None required |
| Homepage | [pptr.dev](https://pptr.dev) |

---

### perplexity

**What it does:** Web-grounded search, research, and reasoning with citations. Connects to Perplexity's Sonar API for real-time web search with AI-synthesized answers.

**When to use it:** When you need current information — recent library releases, breaking changes, best practices that evolved after training data cutoff, or researching unfamiliar topics with citations.

**How it works:** Provides search, ask, research, and reason tools. Search returns ranked URLs with snippets. Ask gives quick AI answers with citations. Research does deep multi-source investigation. Reason provides step-by-step logical analysis.

```bash
./tools.sh install perplexity
# Requires: PERPLEXITY_API_KEY from https://www.perplexity.ai/settings/api
```

| | |
|---|---|
| Package | `perplexity-mcp` |
| API Key | Required — [Get one here](https://www.perplexity.ai/settings/api) |
| Homepage | [perplexity.ai](https://www.perplexity.ai) |

---

### firecrawl

**What it does:** Web scraping, crawling, and structured content extraction. Converts web pages to clean markdown, crawls entire sites, and extracts structured data.

**When to use it:** Scraping documentation sites, extracting content from web pages for analysis, crawling sitemaps, or converting web content to markdown for ingestion into your project.

**How it works:** Provides scrape (single page), crawl (follow links), map (discover URLs), and extract (structured data) tools. Handles JavaScript-rendered content, bypasses common anti-scraping measures.

```bash
./tools.sh install firecrawl
# Requires: FIRECRAWL_API_KEY from https://firecrawl.dev
```

| | |
|---|---|
| Package | `firecrawl-mcp` |
| API Key | Required — [Get one here](https://firecrawl.dev) |
| Homepage | [firecrawl.dev](https://firecrawl.dev) |

---

### notion

**What it does:** Read, create, search, and update Notion pages, databases, comments, and views. Full bidirectional integration with your Notion workspace.

**When to use it:** Managing project documentation in Notion, creating meeting notes, querying databases for task status, updating pages with generated content, or searching across your workspace.

**How it works:** Connects to the Notion API with an integration token. The AI can search pages, read content, create new pages, update existing ones, query databases, and manage comments.

```bash
./tools.sh install notion
# Requires: NOTION_API_KEY from https://www.notion.so/my-integrations
```

| | |
|---|---|
| Package | `@notionhq/notion-mcp-server` |
| API Key | Required — [Create integration here](https://www.notion.so/my-integrations) |
| Homepage | [notion.so](https://www.notion.so) |

---

### slack

**What it does:** Send messages, search channels, list users, get channel history, reply to threads, and add reactions in Slack workspaces.

**When to use it:** Posting deployment notifications, searching for context in Slack discussions, sending status updates, or automating team communications.

**How it works:** Uses a Slack Bot token to interact with the Slack API. Supports listing channels, posting messages, threaded replies, reactions, channel history, and user lookups.

```bash
./tools.sh install slack
# Requires: SLACK_BOT_TOKEN (xoxb-...) from https://api.slack.com/apps
```

| | |
|---|---|
| Package | `slack-mcp-server` |
| API Key | Required — [Create app here](https://api.slack.com/apps) |
| Homepage | [api.slack.com](https://api.slack.com) |

---

### sentry

**What it does:** Query Sentry issues, events, error traces, and project health. Get insights into production errors and their impact.

**When to use it:** Investigating production bugs, checking error rates before deployment, correlating code changes with new errors, or triaging incoming issues.

**How it works:** Connects to Sentry's API to fetch issues, events, and project data. The AI can search for recent errors, analyze stack traces, check error frequencies, and help prioritize fixes.

```bash
./tools.sh install sentry
# Requires: SENTRY_AUTH_TOKEN from https://sentry.io/settings/auth-tokens/
```

| | |
|---|---|
| Package | `@sentry/mcp-server` |
| API Key | Required — [Get token here](https://sentry.io/settings/auth-tokens/) |
| Homepage | [sentry.io](https://sentry.io) |

---

### serena

**What it does:** Semantic code analysis with symbol-level navigation, reference finding, and precise code editing. Uses Language Server Protocol (LSP) under the hood.

**When to use it:** Navigating large codebases by symbol (find all references, go to definition), making precise edits to specific functions or classes, understanding code relationships without reading entire files.

**How it works:** Runs a language server that indexes your project. Provides tools for finding symbols, reading symbol bodies, getting overviews, and making targeted edits at the symbol level rather than line level.

```bash
./tools.sh install serena
# Requires: uv (Python package manager) — install with: brew install uv
```

| | |
|---|---|
| Package | `git+https://github.com/oraios/serena` (via uvx) |
| API Key | None required |
| Requires | `uv` — install via `./tools.sh install uv` |
| Homepage | [github.com/oraios/serena](https://github.com/oraios/serena) |

---

### mermaid-chart

**What it does:** Create, validate, and render Mermaid diagrams. Supports flowcharts, sequence diagrams, ERDs, class diagrams, Gantt charts, and more.

**When to use it:** Generating architecture diagrams, visualizing data flows, creating sequence diagrams for API interactions, or any time you need a diagram in documentation.

**How it works:** The AI writes Mermaid syntax and the server validates and renders it. Can search for Mermaid icons and generate properly formatted diagrams.

```bash
./tools.sh install mermaid-chart
```

| | |
|---|---|
| Package | `mermaid-mcp-server` |
| API Key | None required |
| Homepage | [mermaidchart.com](https://www.mermaidchart.com) |

---

## CLI Tools

Command-line tools installed directly to your system.

### jq

**What it does:** Lightweight command-line JSON processor. Filter, transform, and format JSON data.

**When to use it:** Parsing API responses, filtering JSON config files, transforming data between formats, or pretty-printing JSON output.

```bash
./tools.sh install jq
```

| | |
|---|---|
| Install | `brew install jq` (macOS) / `apt install jq` (Linux) |
| Homepage | [jqlang.github.io/jq](https://jqlang.github.io/jq/) |

---

### ripgrep

**What it does:** Blazing fast recursive text search. Respects `.gitignore`, searches compressed files, supports regex.

**When to use it:** Searching codebases for patterns, finding usages of functions or variables, grepping through logs. Significantly faster than `grep -r`.

```bash
./tools.sh install ripgrep
```

| | |
|---|---|
| Install | `brew install ripgrep` (macOS) / `apt install ripgrep` (Linux) |
| Binary | `rg` |
| Homepage | [github.com/BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) |

---

### gh

**What it does:** GitHub from the command line. Create PRs, manage issues, trigger actions, browse repos.

**When to use it:** Creating pull requests, reviewing PRs, managing issues, checking CI status, or any GitHub workflow without leaving the terminal.

```bash
./tools.sh install gh
```

| | |
|---|---|
| Install | `brew install gh` (macOS) / `apt install gh` (Linux) |
| Homepage | [cli.github.com](https://cli.github.com) |

---

### glab

**What it does:** GitLab from the command line. Create MRs, manage issues, check pipelines, browse projects.

**When to use it:** Creating merge requests, reviewing MRs, managing issues, checking CI pipelines on GitLab.

```bash
./tools.sh install glab
```

| | |
|---|---|
| Install | `brew install glab` (macOS) |
| Homepage | [gitlab.com/gitlab-org/cli](https://gitlab.com/gitlab-org/cli) |

---

### uv

**What it does:** Ultra-fast Python package manager and project tool. Replaces pip, virtualenv, and pip-tools with a single fast binary.

**When to use it:** Managing Python projects, creating virtual environments, installing packages. Required for running some MCP servers (like Serena) via `uvx`.

```bash
./tools.sh install uv
```

| | |
|---|---|
| Install | `brew install uv` (macOS) / `curl -LsSf https://astral.sh/uv/install.sh \| sh` (Linux) |
| Homepage | [docs.astral.sh/uv](https://docs.astral.sh/uv/) |

---

### delta

**What it does:** Beautiful diff viewer with syntax highlighting for git. Makes `git diff` output actually readable.

**When to use it:** Reviewing code changes, comparing files, reading git diffs. Configure as your default git pager for permanent improvement.

```bash
./tools.sh install delta
```

| | |
|---|---|
| Install | `brew install git-delta` (macOS) |
| Homepage | [github.com/dandavison/delta](https://github.com/dandavison/delta) |

---

### fzf

**What it does:** Fuzzy finder for anything — files, command history, git branches, processes. Interactive filtering with preview.

**When to use it:** Finding files in large projects, searching command history, switching git branches, or any time you need to pick from a list interactively.

```bash
./tools.sh install fzf
```

| | |
|---|---|
| Install | `brew install fzf` (macOS) / `apt install fzf` (Linux) |
| Homepage | [github.com/junegunn/fzf](https://github.com/junegunn/fzf) |

---

## AI Assistants

### taskmaster

**What it does:** AI-powered task management. Break down PRDs and specs into structured tasks with dependencies, priorities, and implementation details.

**When to use it:** Starting a new feature from a spec, breaking down complex work into actionable tasks, tracking implementation progress with AI-generated subtasks.

```bash
./tools.sh install taskmaster
```

| | |
|---|---|
| Install | `npm i -g task-master-ai` |
| Homepage | [github.com/eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) |

---

### beads

**What it does:** Distributed graph-based task tracker and persistent memory for AI coding agents. Built on Dolt (a version-controlled SQL database), it gives agents a structured, queryable memory system instead of unstructured markdown notes.

**When to use it:** Long-running projects where AI agents need persistent context across sessions. Task dependency tracking, multi-agent workflows where multiple agents coordinate on shared tasks, or any time you want your AI assistant to remember and track work across conversations.

**How it works:** Beads stores tasks as a dependency-aware graph in a Dolt database. Tasks have hash-based IDs (e.g., `bd-a1b2`) to prevent collisions in multi-agent workflows. Agents can create tasks, claim them atomically, track dependencies (blocks/blocked-by), and query for ready tasks. Closed tasks are compacted via "semantic memory decay" to preserve context windows. Supports stealth mode (no `.beads/` in git) and contributor mode (separate planning repo).

**Key commands:**

| Command | Purpose |
|---------|---------|
| `bd ready` | List unblocked tasks ready for work |
| `bd create "Title" -p 0` | Create a priority-0 task |
| `bd update <id> --claim` | Atomically assign and start a task |
| `bd dep add <child> <parent>` | Link task dependencies |
| `bd show <id>` | Show task details and history |
| `bd init --stealth` | Use locally without committing to git |

```bash
./tools.sh install beads
```

| | |
|---|---|
| Install | `brew install beads` (macOS) / `npm i -g @beads/bd` (Linux/Windows) |
| Binary | `bd` |
| Homepage | [github.com/steveyegge/beads](https://github.com/steveyegge/beads) |

---

## Code Quality Tools

### ruff

**What it does:** Ultra-fast Python linter and formatter. Replaces flake8, isort, pyupgrade, and Black with a single Rust-based tool.

**When to use it:** Linting and formatting Python code. Used for Python projects.

```bash
./tools.sh install ruff
```

| | |
|---|---|
| Install | `brew install ruff` (macOS) / `pip install ruff` |
| Profiles | python-project |
| Homepage | [docs.astral.sh/ruff](https://docs.astral.sh/ruff/) |

---

### dart

**What it does:** Dart language SDK — compiler, analyzer, formatter, and package manager.

**When to use it:** Flutter/Dart development. Included with Flutter but can be installed standalone for Dart-only projects.

```bash
./tools.sh install dart
```

| | |
|---|---|
| Install | `brew install dart` (macOS) |
| Profiles | flutter-project |
| Homepage | [dart.dev](https://dart.dev) |

---

### flutter

**What it does:** Google's cross-platform UI framework for mobile, web, and desktop from a single codebase.

**When to use it:** Building cross-platform mobile, web, and desktop apps from a single codebase.

```bash
./tools.sh install flutter
```

| | |
|---|---|
| Install | `brew install flutter` (macOS) / `snap install flutter --classic` (Linux) |
| Profiles | flutter-project |
| Homepage | [flutter.dev](https://flutter.dev) |

---

### rustup

**What it does:** Rust toolchain manager — installs and manages the Rust compiler, Cargo, Clippy, and rustfmt.

**When to use it:** Rust projects — installs the compiler, Cargo, Clippy, and rustfmt.

```bash
./tools.sh install rustup
```

| | |
|---|---|
| Install | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Profiles | rust-project |
| Homepage | [rustup.rs](https://rustup.rs) |

---

### terraform

**What it does:** Infrastructure as Code tool for provisioning and managing cloud resources across AWS, Azure, GCP, and more.

**When to use it:** Infrastructure-as-code — provisioning and managing cloud resources across AWS, Azure, GCP, and more.

```bash
./tools.sh install terraform
```

| | |
|---|---|
| Install | `brew install terraform` (macOS) |
| Profiles | iac-project |
| Homepage | [terraform.io](https://www.terraform.io) |

---

## Bundles

Pre-built collections for quick setup:

| Bundle | Tools | Description |
|--------|-------|-------------|
| `mcp-essentials` | context7, sequential-thinking, puppeteer | Core MCP servers (no API keys needed) |
| `mcp-research` | context7, perplexity, firecrawl | Documentation and web research |
| `mcp-productivity` | notion, slack, sentry, mermaid-chart | Team and project tools |
| `mcp-all` | All 10 MCP servers | Everything |
| `agent-tools` | beads, taskmaster | AI agent memory and task management |
| `cli-essentials` | jq, ripgrep, gh, glab, fzf, delta, uv | Essential CLI tools |
| `flutter-tools` | flutter, dart | Flutter/Dart cross-platform development |
| `python-tools` | ruff, uv | Python project linting and packaging |
| `rust-tools` | rustup | Rust toolchain setup |
| `iac-tools` | terraform | Infrastructure-as-code projects |

Install a bundle:
```bash
./tools.sh install --bundle mcp-essentials
./tools.sh install --bundle cli-essentials
```

---

## How MCP Servers Work

MCP (Model Context Protocol) is an open standard that lets AI assistants connect to external tools and data sources. When you install an MCP server:

1. The server runs locally on your machine as a subprocess
2. It communicates with the AI tool via stdio (standard input/output)
3. The AI can call the server's tools during conversations
4. No data leaves your machine except to the tool's own API (if applicable)

**Configuration locations:**

| Tool | Config File | Format |
|------|------------|--------|
| Claude Code | `~/.claude/settings.json` | JSON (`mcpServers` object) |
| Cursor | `~/.cursor/mcp.json` | JSON (`mcpServers` object) |
| Codex | `~/.codex/config.toml` | TOML (`[mcp_servers.<name>]` tables) |

The `./tools.sh install` command writes to all three simultaneously.
