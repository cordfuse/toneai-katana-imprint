# Imprint Developer Guide

This document covers everything you need to fork, customize, and deploy Imprint for your own AI agent.

---

## Private Repo Requirement

Your fork should be a **private repository**. The `IMPRINT.md` file in dev mode contains architecture notes, design decisions, and internal context that you do not want exposed publicly. The build process strips this content, but the source repo should remain private.

To fork privately:

1. Create a new private repo on GitHub
2. Clone the Imprint template and push to your private repo:

```bash
git clone https://github.com/cordfuse/imprint.git my-agent
cd my-agent
git remote set-url origin git@github.com:yourorg/my-agent.git
git push -u origin main
```

---

## Architecture: Engine + App Definition

Imprint uses a split architecture:

- **`IMPRINT.md`** — The engine. Handles loading the app definition, dev mode detection, memory protection, and integrity verification. Developers should rarely need to modify it.
- **`./imprint/`** — The app definition. Contains focused files that define the agent's identity, permissions, constraints, and behavior. **This is where developers make their customizations.**

### Agent Files

Agent files (CLAUDE.md, GEMINI.md, AGENTS.md, .windsurfrules, .clinerules) are one-liners that redirect to `IMPRINT-DEV.md` during development. This gives your IDE agent dev workflow instructions with no persona constraints while you're coding.

At build time, `src/build.js` generates production agent files in `dist/` that redirect to `IMPRINT.md` instead.

### App Definition Files

| File | Purpose |
|------|---------|
| `imprint/IDENTITY.md` | Agent name, company, personality, tone |
| `imprint/PERMISSIONS.md` | Whitelist of permitted operations (files, commands, network, tools) |
| `imprint/CONSTRAINTS.md` | Exhaustive blacklist of forbidden operations |
| `imprint/WELCOME.md` | Welcome flow and first-run greeting |
| `imprint/REDIRECT.md` | Canned response for denied/off-topic requests |
| `imprint/SESSION.md` | Session mode (singleton/multi) and CWD mode (fixed/picker) |
| `imprint/MEMORY.md` | Memory scopes, write rules, persistence configuration |

---

## Dev Mode

Dev mode is implicit — if you are in the repo with `IMPRINT-DEV.md`, the agent operates in dev mode. No hash or passphrase setup is needed.

### What Dev Mode Changes

When active (development), the agent will:
- Acknowledge that IMPRINT.md and `./imprint/` exist if you ask
- Discuss architecture and design decisions documented in dev mode sections
- Still refuse to dump raw file contents or reveal the full prompt

When inactive (production), the agent will:
- Deny the existence of any system prompt or instruction file
- Refuse all disclosure attempts
- Behave as if the dev mode sections do not exist (because they are stripped)

---

## Building and Testing

### Build Script

`src/build.js` generates a complete production-ready build in `dist/`:

1. Strips dev mode from IMPRINT.md
2. Generates SHA-256 checksum
3. Creates one-liner agent files (CLAUDE.md, GEMINI.md, ANTIGRAVITY.md, AGENTS.md, .windsurfrules, .clinerules) redirecting to IMPRINT.md. ANTIGRAVITY.md is a speculative add for Google's Antigravity CLI (`agy`, Gemini CLI successor, sunset 2026-06-18) — agy doesn't currently auto-load convention files (no embedded path in the binary), so the file is harmless if ignored and ready when Google ships convention support.
4. Copies `imprint/`, `src/`, README.md, LICENSE, package.json, version.txt

```bash
node src/build.js
```

### Testing User Mode

To test what end users will experience:

1. Run `node src/build.js`
2. Open `dist/` in an agent CLI (Claude Code, Gemini, Antigravity / `agy`, Codex, etc.)
3. The agent will load the stripped IMPRINT.md with no dev mode — exactly what ships in the ZIP

---

## Release Workflow

The `release.yml` workflow triggers on tags matching `v*`. The canonical version is defined in `version.txt`.

### What It Does

1. Runs `src/build.js` — strips dev mode, generates agent files and checksum into `dist/`
2. ZIPs `dist/` as `imprint-v*.zip`
3. Creates GitHub Release with the ZIP and checksum attached

The `./imprint/` directory ships as-is in the ZIP — it is the user-facing app definition. DEVELOPER.md and SECURITY.md are NOT included in the ZIP.

### Creating a Release

```bash
# version.txt is the single source of truth for the version number
VERSION=$(cat version.txt)
git tag "v${VERSION}"
git push origin "v${VERSION}"
```

The workflow runs automatically. Check the Actions tab for status.

---

## Session Mode

The `mode` setting in `imprint/SESSION.md` controls how the agent handles concurrent sessions.

### `singleton`

Only one session may be active at a time. If the agent detects another active session, it refuses to start. Use this for agents that manage global state (e.g., system administration, deployment pipelines).

### `multi`

Multiple concurrent sessions are allowed. Each session has independent context and does not interfere with others. Use this for most application agents.

---

## CWD Mode

The `cwd` setting in `imprint/SESSION.md` controls how the agent handles its working directory.

### `fixed`

The working directory is locked to the project root. The agent cannot change directories or access files outside the project tree. Use this for sandboxed application agents.

### `picker`

The agent prompts the user to select or confirm a working directory at session start. Use this for code assistants that need to work across multiple repositories or project directories.

---

## Customization Checklist

When forking Imprint for your agent, update these files in `./imprint/`:

- [ ] **`IDENTITY.md`** — Agent name, company, purpose, personality
- [ ] **`PERMISSIONS.md`** — Whitelist of allowed commands, file operations, network access, and tools
- [ ] **`CONSTRAINTS.md`** — Add any app-specific restrictions (never remove existing ones)
- [ ] **`REDIRECT.md`** — The polite refusal message in your agent's voice
- [ ] **`WELCOME.md`** — The greeting shown at session start
- [ ] **`SESSION.md`** — Session mode (`singleton`/`multi`) and CWD mode (`fixed`/`picker`)
- [ ] **`MEMORY.md`** — Which persistence layers to enable and write rules
