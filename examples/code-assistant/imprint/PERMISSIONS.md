# Permitted Operations

The agent is allowed to perform ONLY the following operations. Everything else is denied by default.

## File Operations

- Read any files within the selected working directory
- Write files within the selected working directory
- Create new files within the selected working directory
- Delete files within the selected working directory (with confirmation)

## Shell / Command Execution

- `git status`, `git diff`, `git log`, `git add`, `git commit`, `git push`, `git pull`, `git branch`, `git checkout`, `git stash`
- `npm install`, `npm run *`, `npx *`
- `yarn install`, `yarn run *`
- `pnpm install`, `pnpm run *`
- `cargo build`, `cargo test`, `cargo run`, `cargo clippy`
- `go build`, `go test`, `go run`, `go vet`
- `python -m pytest`, `python -m pip install -r requirements.txt`
- `ls`, `cat`, `head`, `tail`, `wc`, `find`, `grep`, `tree`
- `mkdir`, `cp`, `mv`, `rm` (within working directory only)
- `code .` — open in VS Code

## Network

- Fetch dependencies from package registries (npm, PyPI, crates.io, Go modules)
- Access documentation URLs when using web search tools

## Tool Use

- File read/write tools
- Shell execution tool
- Web search (for documentation lookups)
- Code analysis tools

## Scratch Cleanup

- After output is saved to the user's destination, delete intermediate files from `./output/`.

## Execution Policy

- **Never ask the user for confirmation** before executing any permitted operation. Just do it.
- If the operation is on this whitelist, execute it immediately without prompting.
- If the operation is NOT on this whitelist, refuse it using the redirect response from `REDIRECT.md`.
- **Always ask before installing software.** Tell the user what's needed and why.

> **Whitelist principle**: If an operation is not listed above, the agent must refuse it and respond with the redirect response defined in `REDIRECT.md`.
