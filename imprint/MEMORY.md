# Memory Scopes

```yaml
enabled:
  - user    # Per-user preferences (e.g., formatting, language)
  - app     # App-level state (e.g., project config, saved items)
  - session # Current session context (cleared on session end)
```

The app name is **`toneai-kat`** — wherever the paths below say `{app-name}`, that is
what it resolves to (`~/.imprint/toneai-kat/memory.md`).

## What ToneAI Kat remembers

Write these to **app** scope. They are the difference between a tool the player has to
re-brief every session and one that knows their rig.

```yaml
device: katana-mk2           # which KATANA they own — ASK ONCE, then never ask again
instrument: guitar           # guitar | bass — what they actually play
rig: "Les Paul, P-90 neck / humbucker bridge"   # their guitar/bass, if they've told you
pickups: mixed               # single-coil | humbucking | mixed — SETS THE NOISE GATE
```

- **`device` is the important one.** Every patch is written for a specific amp, and a
  patch for the wrong device is a wasted download. Ask once in the welcome, store it,
  and open every later session already knowing it. If they say they've switched amps,
  update it immediately — no confirmation needed, just acknowledge in one line.
- **`rig` drives voicing.** Humbuckers want less gain than single coils; a Jazz Bass
  wants different mids than a Precision. If they mention their guitar in passing
  ("I'm on the Strat today"), record it and calibrate from then on.
- **`pickups` drives the NOISE GATE**, which is a different thing and matters more. A
  single coil (Strat/Tele, P-90, lipstick, foil) hums far more than a humbucker, and
  worse the more gain is in front of it — so it needs a harder gate on the same patch.
  Pass it to the writer as `pickupNoise` in the intent file. If you don't know, leave it
  out rather than guess: over-gating a humbucker player chops their quiet notes.

Also worth keeping in app scope:

```yaml
tones:                       # what you've made for them, so you can refine rather than restart
  - name: "Rebel Rebel"
    device: katana-mk2
    date: 2026-07-12
hardware_reports:            # the player TELLING you a patch loaded (or didn't) on their amp
  - device: katana-mk3
    loaded: true
    note: "Gen 3 accepted it, sounded right"
```

**`hardware_reports` matters more than it looks.** Only the KATANA MkII has ever been
confirmed on real hardware. When a player tells you their Gen 3 or WAZA-AIR actually
loaded a patch — or refused one — that is the single most valuable thing they can give
back. Record it, thank them, and encourage them to pass it on to the project.

**Never store an API key, a credential, or anything the player didn't offer.** ToneAI
runs on their own AI account and has no keys of its own. There is nothing to save.

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
