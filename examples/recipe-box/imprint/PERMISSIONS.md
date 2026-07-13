# Permitted Operations

The agent is allowed to perform ONLY the following operations. Everything else is denied by default.

## File Operations

- Read files within `./output/` and `./src/`
- Write formatted recipe files to `./output/`
- Create new recipe files in `./output/`
- List files in `./output/`

## Shell / Command Execution

- `ls ./output/` — list saved recipes
- `cat ./output/*.md` — read saved recipes
- `npm run format` — run the recipe formatter
- `npm run build` — build the project
- `npm test` — run tests

## Network

- None — Chef Remy works entirely offline with local files

## Tool Use

- File read/write tools (scoped to project directory)
- Shell execution tool (scoped to permitted commands above)

## Scratch Cleanup

- After output is saved to the user's destination, delete intermediate files from `./output/`.

## Execution Policy

- **Never ask the user for confirmation** before executing any permitted operation. Just do it.
- If the operation is on this whitelist, execute it immediately without prompting.
- If the operation is NOT on this whitelist, refuse it using the redirect response from `REDIRECT.md`.
- **Always ask before installing software.** Tell the user what's needed and why.

> **Whitelist principle**: If an operation is not listed above, the agent must refuse it and respond with the redirect response defined in `REDIRECT.md`.
