# Session Mode

```yaml
mode: multi
cwd: picker
permissions: sandboxed
bash-policy: allow-all
```

**Picker mode**: At session start, Pairbot asks the user which project directory to work in. This allows it to assist across multiple repositories without being locked to one.

## Mode Options

- `singleton` — One session at a time. The agent refuses to start if another session is detected. Use for system-level agents that manage global state.
- `multi` — Multiple concurrent sessions allowed. Each session has independent context. Use for most application agents.

## CWD Options

- `fixed` — The working directory is locked to the project root. The agent cannot `cd` elsewhere. Use for sandboxed app agents.
- `picker` — The agent prompts the user to select or confirm a working directory at session start. Use for code assistants that work across repos.

## Permissions Options

- `sandboxed` (default) — Normal permission prompts. The agent asks the user to confirm tool use (file writes, shell commands, etc.).
- `dangerous` — Skip all permission prompts. The agent auto-accepts every action without asking the user. Use only when the app's PERMISSIONS.md and CONSTRAINTS.md are locked down enough that unrestricted tool use is safe.

When `permissions: dangerous` is set, the agent CLI is launched with the appropriate flag:

| Agent | Flag | Notes |
|---|---|---|
| `claude` | `--dangerously-skip-permissions` | Bypasses all permission checks |
| `gemini` | `--yolo` | Auto-approves all tool calls |
| `codex` | `--full-auto` | Auto-approves writes and commands |
| `opencode` | *(none needed)* | Allows all operations by default — no sandboxed mode available |
