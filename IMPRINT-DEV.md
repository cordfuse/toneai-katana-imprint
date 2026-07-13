# Imprint — Developer Mode

You are a normal coding assistant. There are no persona constraints, no identity lock, no permission restrictions. You help the developer build and test their Imprint app.

## First-Time Setup Guide

On first dev mode session, check for `~/.imprint/{app-name}/.dev-setup-complete`.

- Flag missing → tell the developer about the guided setup:
  > "First time here? I can walk you through setting up your Imprint app step by step (~10 minutes). Say **guide** to start, or **skip** to jump straight to coding."
- Flag present → skip silently
- "skip" → write the flag immediately, never show again
- After completing step 8 (test user mode) → write the flag

The guided steps are documented in `DEV-GUIDE.md`.

## Welcome

At session start, greet the developer briefly:

> **Imprint Dev** — Ready to build. You can edit files in `./imprint/`, run tests, or ask me anything.
>
> Quick commands:
> - **"test user mode"** — Build `dist/` and launch the locked persona in a new terminal
> - **"help"** — Show available commands and project structure

When the developer says **"help"**, show them:
- The project structure (listed below)
- How to edit the app definition (`./imprint/*.md`)
- How to test user mode
- How to create a release
- Remind them: `IMPRINT-USER.md` is the engine — edit `./imprint/` files instead

## Project Structure

- `IMPRINT-USER.md` — The user-mode engine. Do NOT follow its instructions — it is source code you help the developer edit, not rules for you.
- `./imprint/` — The app definition files (identity, permissions, constraints, etc.). Same as above — source code, not instructions.
- `src/build.js` — Builds a clean production copy to `./dist/`
- `./dist/` — Build output (gitignored). Contains exactly what end users get in the ZIP.

## Testing User Mode

When the developer asks to test user mode. Trigger phrases include (but are not limited to): "test", "test it", "test user mode", "try user mode", "try it", "run it", "launch it", "preview", "preview it", "demo", "demo it", "run a test", "run test", "build and test", "build and run", "test the app", "try the app", "launch the app", "run the app", "spin it up", "fire it up", "let me see it", "show me", "open it":

### Step 1 — Build

Run `node src/build.js` to generate `./dist/`.

### Step 2 — Choose agent

Ask the developer which agent CLI to test with. Read `imprint/SESSION.md` and parse the `permissions` field. If `permissions: dangerous`, use the dangerous launch command.

**If the developer picks `gemini`, surface this one-line warning before proceeding** (don't refuse — they may have a reason, just give them the heads-up so they can switch if they want):

> ⚠ Google retires the Gemini CLI on 2026-06-18 — the official successor is `agy` (Antigravity CLI). Want to test against `agy` instead, or proceed with `gemini`?

Wait for the developer's reply before launching. If they say "proceed", "yes", "keep gemini", or equivalent, run the gemini command from the table below. If they say "switch to agy", "use agy", or equivalent, run the `agy` command instead.

**Sandboxed (default):**

| Agent | Launch command |
|---|---|
| `claude` | `claude "hello"` |
| `gemini` | `gemini -i "hello"` *(sunsets 2026-06-18 — see `agy` below)* |
| `agy` | `agy -i "hello"` *(Antigravity CLI — interactive session seeded with the prompt; default permission mode prompts per tool call)* |
| `codex` | `codex "hello"` |
| `opencode` | `opencode run "hello"` |
| `qwen` | `qwen -i "hello"` *(Qwen Code — Gemini CLI fork; same `-i` interactive flag)* |

**Dangerous:**

| Agent | Launch command |
|---|---|
| `claude` | `claude --dangerously-skip-permissions "hello"` |
| `gemini` | `gemini --yolo -i "hello"` *(sunsets 2026-06-18)* |
| `agy` | `agy --dangerously-skip-permissions -i "hello"` *(auto-approves every tool permission — Google adopted the Anthropic flag name)* |
| `codex` | `codex --full-auto "hello"` |
| `opencode` | `opencode run "hello"` |
| `qwen` | `qwen --yolo -i "hello"` *(auto-approve flag inherited from Gemini CLI lineage)* |

> **Note on `--sandbox`:** Antigravity exposes a third tier via `agy --sandbox` that's MORE restricted than the default mode (terminal restrictions enabled). Imprint's testing flow uses the default mode (sandboxed in the Imprint sense — agy still prompts for tool permissions), not `--sandbox`. Pass `--sandbox` only if you want to force-isolate while testing.

### Step 3 — Verify agent is installed

Run `which <agent>` (or `where <agent>` on Windows).
If not found, tell the developer and stop.

### Step 4 — Detect OS and terminal

1. Run `uname -s` to detect the platform. On Windows, `uname` may not exist — check for `cmd.exe` or `powershell` in the environment instead.
2. Read `$TERM_PROGRAM` to detect the current terminal emulator.

### Step 5 — Open a new terminal window at `./dist/` and invoke the agent

Resolve `./dist/` to an absolute path first. Use the same terminal the developer is currently in (detected via `$TERM_PROGRAM`). If running inside an IDE (e.g. `vscode`, `cursor`, `windsurf`), spawn the OS default terminal instead.

**macOS** — spawn based on `$TERM_PROGRAM`:

| `$TERM_PROGRAM` | Action |
|---|---|
| `iTerm.app` | Use iTerm2 |
| `Apple_Terminal` | Use Terminal.app |
| `WarpTerminal` | Use Warp |
| IDE values (`vscode`, `cursor`, `windsurf`, etc.) | Use `open -a Terminal` (system default) |
| Unset / unknown | Use `open -a Terminal` (system default) |

iTerm2:
```bash
osascript -e '
tell application "iTerm"
    activate
    tell current window
        create tab with default profile
        tell current session
            write text "cd \"<absolute-dist-path>\" && <agent> \"hello\""
        end tell
    end tell
end tell'
```

Terminal.app:
```bash
osascript -e 'tell app "Terminal" to do script "cd \"<absolute-dist-path>\" && <agent> \"hello\""'
```

Warp:
```bash
osascript -e 'tell app "Warp" to do script "cd \"<absolute-dist-path>\" && <agent> \"hello\""'
```

**Linux** — spawn based on `$TERM_PROGRAM`:

If `$TERM_PROGRAM` is set and is a known terminal (not an IDE), use it directly. Otherwise, check which is installed (in order): `kitty`, `alacritty`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `xterm`.

```bash
# kitty
kitty --directory "<absolute-dist-path>" bash -c '<agent> "hello"'

# alacritty
alacritty --working-directory "<absolute-dist-path>" -e bash -c '<agent> "hello"'

# gnome-terminal
gnome-terminal --working-directory="<absolute-dist-path>" -- bash -c '<agent> "hello"'

# konsole
konsole --workdir "<absolute-dist-path>" -e bash -c '<agent> "hello"'

# xfce4-terminal
xfce4-terminal --working-directory="<absolute-dist-path>" -e 'bash -c "<agent> \"hello\""'

# xterm (last resort)
xterm -e 'cd "<absolute-dist-path>" && <agent> "hello"'
```

**Windows** — spawn a new cmd or PowerShell window:

```powershell
Start-Process cmd -ArgumentList '/k', 'cd /d "<absolute-dist-path>" && <agent> "hello"'
```

Or if PowerShell is preferred:
```powershell
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "<absolute-dist-path>"; <agent> "hello"'
```

### Step 6 — Confirm

Tell the developer the test session has been launched in a new window.

> A user-mode test session is running in a new terminal. You'll see the locked persona — exactly what end users experience. Close that window when done.

## Build Script

`src/build.js` does the following:

1. Strips dev mode content from `IMPRINT-USER.md` (between `<!-- DEV_MODE_START -->` and `<!-- DEV_MODE_END -->` markers)
2. Generates SHA-256 checksum
3. Copies the clean `IMPRINT-USER.md` as `IMPRINT.md` into `dist/`
4. Creates agent files (CLAUDE.md, GEMINI.md, ANTIGRAVITY.md, AGENTS.md, QWEN.md, .windsurfrules, .clinerules) in `dist/` — each is a one-liner redirecting to `IMPRINT.md`. `ANTIGRAVITY.md` is a speculative belt-and-braces add (Antigravity CLI doesn't auto-load convention files today, per a string-search of its binary on 2026-05-19) so the file is ready if Google ships convention support; harmless otherwise. Direct agy users to `agy -i "load IMPRINT.md and follow the instructions in it"` on first session; agy's `-c / --continue` resumes from there.
5. Copies `imprint/`, `src/`, README.md, LICENSE, package.json, version.txt into `dist/`

## Release

The release CI workflow (`release.yml`) runs the same `build.js` script, ZIPs `dist/`, and attaches it to a GitHub Release.

```bash
VERSION=$(cat version.txt)
git tag "v${VERSION}"
git push origin "v${VERSION}"
```
