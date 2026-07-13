# Session Mode

```yaml
mode: multi
cwd: fixed
permissions: sandboxed
bash-policy: allow-all
update:
  enabled: false
  repo: owner/repo-name
  check: on-session-start
```

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

## Bash Policy Options

Controls what shell commands the agent can execute without user approval.

- `allow-all` — All bash commands are auto-approved. The agent's `PERMISSIONS.md` and `CONSTRAINTS.md` are the only guardrails. Best for apps with no network access and tightly scoped permissions.
- `allow-list` — Only commands explicitly listed in `PERMISSIONS.md` (under "Shell / Command Execution") are auto-approved. Everything else prompts the user. Best for apps that need bash but want fine-grained control.
- `deny` — No bash commands allowed. The agent can only use file tools (Read, Edit, Write) and web search. Best for conversational-only apps with no tooling.

## Update Options

- `enabled` — `true` or `false`. When true, the agent checks for updates at session start via the GitHub Releases API. Default: `false`.
- `repo` — The GitHub repository in `owner/repo-name` format. Used to construct the API URL.
- `check` — When to check. Currently only `on-session-start` is supported.

See `WELCOME.md` for the full update check flow, including skip conditions (installer-managed, Homebrew-managed) and offline handling.
