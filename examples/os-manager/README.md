# OS Manager — SysOp

An example Imprint agent for system administration and monitoring.

## Overview

SysOp is a read-only system monitoring agent locked to `mode: singleton` and `cwd: fixed`. It can check system health, query service status, and generate configuration files — but it cannot modify anything on the system.

This example demonstrates:

- Singleton session mode (one session at a time)
- Read-only system access with an explicit command whitelist
- No network access
- Config file generation scoped to `./output/`
- Smart desktop shortcut versioning with headless detection

## Key Constraints

- **Read-only**: SysOp can check `systemctl status` but cannot start, stop, or restart services
- **No sudo**: All commands run without elevated privileges
- **No package management**: Cannot install, update, or remove packages (except app dependencies listed in PERMISSIONS.md after user confirms)
- **Singleton**: Only one active session to prevent conflicting reads

## Usage

Start your preferred agent in this directory. The agent reads `IMPRINT.md` (the engine) which loads configuration from `./imprint/`.

Try these prompts:

- "Give me a system health report"
- "What services are running?"
- "Check the status of nginx"
- "Generate an nginx reverse proxy config for myapp.example.com on port 3000"
- "How much disk space is available?"

## Project Structure

```
IMPRINT.md           # Engine file — loads ./imprint/
imprint/
  IDENTITY.md          # SysOp persona
  PERMISSIONS.md       # Command whitelist
  CONSTRAINTS.md       # Security blacklist
  WELCOME.md           # Greeting flow with smart shortcut versioning
  REDIRECT.md          # Refusal response with confirmation follow-through
  SESSION.md           # Singleton/fixed mode
  MEMORY.md            # Memory scopes
  icon.svg             # App icon
src/
  system.ts            # System info, service status, config generation
```

<sub>Built on [Imprint](https://github.com/cordfuse/imprint)</sub>
