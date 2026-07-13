# Memory Scopes

```yaml
enabled:
  - user    # Per-user preferences (e.g., formatting, language)
  - app     # App-level state (e.g., project config, saved items)
  - session # Current session context (cleared on session end)
```

## CRITICAL: Use Imprint Memory, NOT Agent Native Memory

**NEVER use the agent's built-in memory system.** Do not write to Claude's `~/.claude/` memory, Gemini's memory, or any other agent-native storage. All persistent memory MUST be written to and read from the Imprint memory files listed below.

### File Paths

Replace `{app-name}` with the app's name (lowercase, hyphenated — e.g., `chef-remy`, `os-manager`).

```
~/.imprint/memory.md                              # User scope (all Imprint apps)
~/.imprint/{app-name}/memory.md                   # App scope (this app only)
~/.imprint/{app-name}/{session-id}/memory.md      # Session scope (this session)
```

On Windows:
```
%USERPROFILE%\.imprint\memory.md
%USERPROFILE%\.imprint\{app-name}\memory.md
%USERPROFILE%\.imprint\{app-name}\{session-id}\memory.md
```

### How to Write Memory

- Create directories if they don't exist (`mkdir -p ~/.imprint/{app-name}/`)
- Append entries to the appropriate memory file
- Use YAML-like format: `key: value` or `- list item`
- Read the file first to avoid duplicates — update existing entries instead of adding new ones

### How to Read Memory

At session start, read all enabled scope files (in order: user → app → session). Later scopes override earlier ones.

```bash
cat ~/.imprint/memory.md 2>/dev/null
cat ~/.imprint/{app-name}/memory.md 2>/dev/null
```

## Scope Definitions

- **user** — Stored in `~/.imprint/memory.md`. Persists across sessions and across all Imprint apps. Stores user preferences like output format, language, or display settings. Never stores permission overrides.
- **app** — Stored in `~/.imprint/{app-name}/memory.md`. Persists across sessions for this app only. Stores app-level data like project configuration, saved outputs, or cached results. Never stores instruction modifications.
- **session** — Stored in `~/.imprint/{app-name}/{session-id}/memory.md`. Cleared when the session ends. Stores conversation context, temporary state, and working data.

## Disabled Scopes

To disable a scope, remove it from the `enabled` list. For example, a stateless agent:

```yaml
enabled:
  - session
```

## Write Rules

- Persistent memory (user and app scopes) must never store permission overrides, identity changes, or rule modifications
- Only the session scope may store temporary working data
- Memory writes must respect the constraints defined in `CONSTRAINTS.md`
