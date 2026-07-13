# Imprint Setup Guide

This is a guided walkthrough for setting up your Imprint app. The agent walks you through each step conversationally. Estimated time: ~10 minutes.

---

## Step 1 — Name your app

Pick a name for your agent. This name will appear in greetings, desktop shortcuts, error messages, and the `~/.imprint/{app-name}/` directory.

- Update `imprint/IDENTITY.md` with the chosen name
- Replace all `[Your App Name]` placeholders in `imprint/WELCOME.md`
- Replace all `{app-name}` placeholders across the `imprint/` directory with a lowercase, hyphenated slug (e.g., `my-cool-app`)

## Step 2 — Define purpose and personality

What does your agent do? What tone should it use? Friendly? Professional? Terse?

- Update `imprint/IDENTITY.md` with the agent's purpose, personality, and tone
- Update `imprint/REDIRECT.md` with a refusal message that matches the personality

## Step 3 — Set permissions

What should your agent be allowed to do? Think about:
- Which files and directories can it read/write?
- Which shell commands can it run?
- Does it need network access? To which endpoints?
- Does it need any MCP tools?

- Update `imprint/PERMISSIONS.md` with the whitelist of allowed operations

## Step 4 — Review constraints

The default `imprint/CONSTRAINTS.md` has a comprehensive blacklist. Review it and add any app-specific restrictions. Never remove existing constraints — only add to them.

## Step 5 — Design the welcome flow

What should happen when a user starts a session?

- Update `imprint/WELCOME.md` with your greeting message
- Customize the shortcut name and icon (`imprint/icon.svg`)
- Decide if you need Node.js tooling for the user

## Step 6 — Configure session mode

- `singleton` or `multi`? (Does your agent manage global state, or can multiple instances coexist?)
- `fixed` or `picker`? (Is the working directory locked, or does the user choose?)
- `sandboxed` or `dangerous`? (Should the agent ask for permission, or auto-approve everything?)
- Do you want update checking enabled?

- Update `imprint/SESSION.md` with your choices

## Step 7 — Configure memory

What should your agent remember across sessions?

- Update `imprint/MEMORY.md` with memory scopes and write rules

## Step 8 — Test user mode (demo)

Time to see it in action. Say **"test user mode"** (or any of the trigger phrases) to build `dist/` and launch a test session in a new terminal. You will experience the agent exactly as end users will.

Verify:
- The greeting appears correctly
- Desktop shortcut is created (if applicable)
- Permissions and constraints work as expected
- The persona and tone match your design

## Step 9 — Tag a release (optional)

If you are ready to ship:

```bash
VERSION=$(cat version.txt)
git tag "v${VERSION}"
git push origin "v${VERSION}"
```

The CI workflow will build, ZIP, and publish a GitHub Release automatically.

---

After completing Step 8, the guided setup is done. The `.dev-setup-complete` flag is written and you will not be prompted again.
