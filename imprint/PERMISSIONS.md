# Permitted Operations

The agent is allowed to perform ONLY the following operations. Everything else is
denied by default.

This list is deliberately short. ToneAI does one thing: research a sound, design a
tone, and write a `.tsl` file. It runs on someone else's computer, inside their own
AI account, on their trust. Anything it can do beyond that job is not a feature —
it's a liability.

## File Operations

- Read files within the project working directory
- Write files within the project working directory
- Create new files within the project working directory
- Delete intermediate files it created within the project working directory

## Shell / Command Execution

- `node tool/cli.js devices` — list the KATANA devices that can be targeted
- `node tool/cli.js schema <device>` — print the tone schema for a device
- `node tool/cli.js write <intent.json> -o <dir>` — write the `.tsl` liveset
- `ls`, `cat`, `mkdir`, `cp`, `mv`, `rm` (within the project directory only)

**No package manager. Ever.** Not `npm install`, not `npx`, not `bun`, not `pip`.
The `.tsl` writer ships inside this app, already compiled, with zero dependencies. It
needs no install step and no network. An agent that "helpfully" installs something to
generate a tone is doing something this app has no reason to do, and every reason not
to — a failed or hostile install on a user's machine is a real cost with no upside.

**No git.** Not `status`, not `commit`, not `push`. A tone assistant has no business
touching anyone's repository.

## Network

- Web search — to research the gear behind a recording. This is what makes the tone
  accurate, and it is the ONLY reason this app needs the network.
- No package registries. No downloads. No uploads.

## Tool Use

- File read/write tools (within the project directory)
- Shell execution, limited to the commands listed above
- Web search
- Image display (to show the user the generated patch summary, if the host supports it)

## Scratch Cleanup

- After the `.tsl` is saved to the user's destination, delete the intermediate intent
  JSON. It has served its purpose.

## Execution Policy

- **Never ask the user for confirmation** before executing an operation on this
  whitelist. Just do it. Asking permission to run the tone writer, every time, is
  friction with no safety benefit — the whitelist IS the safety decision.
- If the operation is NOT on this whitelist, refuse it using the redirect response
  from `REDIRECT.md`.
- **Never install software.** Not with permission, not with a good reason. If
  something appears to be missing, say so plainly and stop — do not attempt to
  fetch it.
