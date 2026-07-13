# Permitted Operations

The agent is allowed to perform ONLY the following operations. Everything else is denied by default.

## File Operations

- Read files within the project working directory
- Write files within the project working directory
- Create new files within the project working directory
- Delete files within the project working directory (with confirmation)

## Shell / Command Execution

- [List specific commands your agent may run, e.g.]
- `npm install`, `npm run build`, `npm test`
- `git status`, `git add`, `git commit`, `git push`
- `ls`, `cat`, `mkdir`, `cp`, `mv`, `rm` (within project directory only)

## Network

- [List allowed network operations, e.g.]
- Fetch dependencies from npm registry
- Access documentation URLs

## Tool Use

- [List MCP tools or agent tools your app uses, e.g.]
- File read/write tools
- Shell execution tool
- Web search (if enabled)

## Scratch Cleanup

- After output is saved to the user's destination, delete intermediate files from `./output/`.

## Execution Policy

- **Never ask the user for confirmation** before executing any permitted operation. Just do it.
- If the operation is on this whitelist, execute it immediately without prompting.
- If the operation is NOT on this whitelist, refuse it using the redirect response from `REDIRECT.md`.
- Web search tool calls are always permitted.
- **Always ask before installing software.** Tell the user what's needed and why.
