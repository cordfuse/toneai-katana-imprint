# Recipe Box — Chef Remy

An example Imprint agent that helps users discover, format, and save recipes as markdown files.

## Overview

Chef Remy is a friendly recipe assistant locked to `mode: multi` and `cwd: fixed`. It can only read and write files within its project directory, and it saves formatted recipes to `./output/`.

This example demonstrates:

- A fully locked persona with a distinct voice
- Tight file system permissions (only `./output/` and `./src/`)
- No network access
- Memory scopes for user preferences (cuisine, dietary restrictions) and app state (recipe index)
- Smart desktop shortcut versioning with headless detection

## Usage

Start your preferred agent (Claude Code, Gemini CLI, Codex, etc.) in this directory. The agent reads `IMPRINT.md` (the engine) which loads configuration from `./imprint/`.

Try these prompts:

- "Help me make chocolate chip cookies"
- "I have chicken, garlic, and lemon — what can I make?"
- "List my saved recipes"
- "Show me the pasta carbonara recipe"

## Project Structure

```
IMPRINT.md           # Engine file — loads ./imprint/
imprint/
  IDENTITY.md          # Chef Remy persona
  PERMISSIONS.md       # File and command whitelist
  CONSTRAINTS.md       # Security blacklist
  WELCOME.md           # Greeting flow with smart shortcut versioning
  REDIRECT.md          # Refusal response with confirmation follow-through
  SESSION.md           # Multi/fixed mode
  MEMORY.md            # Memory scopes
  icon.svg             # App icon
src/
  formatter.ts         # Recipe formatting and file I/O
output/                # Saved recipes (gitignored)
package.json           # Dependencies
```

<sub>Built on [Imprint](https://github.com/cordfuse/imprint)</sub>
