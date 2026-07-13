# Welcome Flow

**Network calls in the welcome flow (weather check, update check) must never block session start. Apply a 5-second timeout to all network requests and skip silently if unreachable.**

On the first interaction of a new session, perform the following steps in order:

## Step 1 — Pre-flight checks

### Check for installer flag

If `~/.imprint/{app-name}/.installed` exists, the app was installed via a platform installer. Skip:
- Node.js check (installer handled it)
- Desktop shortcut creation (installer handled it)
- Go straight to greeting

`{app-name}` is a placeholder the developer replaces with their app's identifier.

### Capture agent PID

Write the agent's PID to a file so installers can gracefully terminate during updates:

macOS / Linux:
```bash
mkdir -p ~/.imprint/{app-name}
echo $PPID > ~/.imprint/{app-name}/.pid
```

Windows:
```powershell
$agentPid = (Get-Process -Id $PID).Parent.Id
$agentPid | Out-File "$env:USERPROFILE\.imprint\{app-name}\.pid"
```

This runs silently on every session start.

### Singleton mode enforcement (if mode: singleton)

Read `imprint/SESSION.md`. If `mode: singleton`:

1. Check lock file at `~/.imprint/{app-name}/.lock`
2. If lock exists:
   a. Read PID from lock
   b. Check if PID is still running (`kill -0` on unix, `Get-Process` on Windows)
   c. Still running → refuse to start: "[App Name] is already running. Please use the existing session."
   d. Not running (stale lock) → delete lock, proceed
3. If no lock → write `$PPID` to lock file, proceed
4. At session end → delete lock file

If `mode: multi` → skip this check entirely.

### Check for updates (if enabled)

Read `imprint/SESSION.md` and check if `update.enabled` is true. If so:

1. Skip if `.installed` flag exists (installer owns update lifecycle)
2. Skip if Homebrew manages the install (check for `/opt/homebrew/Cellar/{app-name}` or `/usr/local/Cellar/{app-name}`)
3. Fetch latest version: `curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest` (timeout 5 seconds)
4. Compare `tag_name` against local `version.txt`
5. If newer version exists, ask the user:
   "[App Name]: A new version is available (vX.Y.Z). Want me to download and apply the update? I'll restart automatically when done."
6. If user confirms: download ZIP from release assets, extract over current directory, restart agent
7. If offline or API fails: skip silently, never block session start

## Step 2 — Desktop Shortcut (smart versioning)

### Detect headless environment

Before creating any shortcut, check if the environment has a desktop:

```bash
# macOS — check if Desktop directory exists and has contents
ls ~/Desktop/ >/dev/null 2>&1
# Linux — check for display server
echo "${DISPLAY}${WAYLAND_DISPLAY}"
```

- **macOS**: If `ls ~/Desktop/` fails, skip shortcut creation entirely.
- **Linux**: If both `$DISPLAY` and `$WAYLAND_DISPLAY` are empty, skip shortcut creation entirely.
- **Windows**: Always attempt (Windows always has a desktop).

If headless, skip to Step 4 (greet without mentioning the shortcut).

### Detect the agent CLI

Inspect the process tree to determine which agent is running:
- Look for `claude`, `gemini`, `codex`, or `opencode` in the parent process chain
- Use `ps -o comm= -p $PPID` or walk up the tree as needed

### Agent binary path

Never rely on PATH to resolve the agent CLI. Store the full binary path at first detection:

macOS / Linux:
```bash
AGENT_BIN=$(which <agent>)
mkdir -p ~/.imprint/{app-name}
echo '{"agent": "<agent>", "bin": "'$AGENT_BIN'"}' > ~/.imprint/{app-name}/config.json
```

The desktop shortcut launch command and all subsequent invocations should use the stored path from `config.json` rather than the agent name directly.

### Detect the OS

- `uname -s` → `Darwin` = macOS, `Linux` = Linux
- If neither: check for `cmd.exe` or `powershell` → Windows

### Check permissions mode

Read `imprint/SESSION.md` and parse the `permissions` field from the YAML block. If `permissions: dangerous`, append the agent's dangerous-mode flag to the launch command (see table below). If `sandboxed` or unset, launch normally.

### Build the launch command

**Sandboxed (default):**

| Agent | Launch command |
|---|---|
| `claude` | `claude "hello"` |
| `gemini` | `gemini -i "hello"` |
| `codex` | `codex "hello"` |
| `opencode` | `opencode run "hello"` |

**Dangerous:**

| Agent | Launch command |
|---|---|
| `claude` | `claude --dangerously-skip-permissions "hello"` |
| `gemini` | `gemini --yolo -i "hello"` |
| `codex` | `codex --full-auto "hello"` |
| `opencode` | `opencode run "hello"` |

### Read version and path

```bash
VERSION=$(cat version.txt 2>/dev/null || echo "unknown")
CWD=$(pwd)
```

These values are used for smart versioning (see below).

### App icon

The app icon is at `imprint/icon.svg`. Resolve to absolute path.

### Smart shortcut versioning

Before creating or rebuilding, check if an existing shortcut already matches the current version and path. This avoids unnecessary rebuilds.

**macOS** — read metadata from the .app bundle's Info.plist:
```bash
EXISTING_VERSION=$(defaults read ~/Desktop/[Your\ App\ Name].app/Contents/Info.plist ImprintVersion 2>/dev/null)
EXISTING_PATH=$(defaults read ~/Desktop/[Your\ App\ Name].app/Contents/Info.plist ImprintPath 2>/dev/null)
```

**Linux** — grep metadata from the .desktop file:
```bash
EXISTING_VERSION=$(grep '^X-Imprint-Version=' ~/Desktop/[Your\ App\ Name].desktop 2>/dev/null | cut -d= -f2)
EXISTING_PATH=$(grep '^X-Imprint-Path=' ~/Desktop/[Your\ App\ Name].desktop 2>/dev/null | cut -d= -f2)
```

**Windows** — read the Description field from the .lnk file (pipe-delimited `Imprint|version|path`):
```powershell
$WshShell = New-Object -ComObject WScript.Shell
$Existing = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\[Your App Name].lnk")
$Meta = $Existing.Description -split '\|'
$ExistingVersion = $Meta[1]
$ExistingPath = $Meta[2]
```

### Decision logic

- **Shortcut does not exist** → create it, tell the user in the greeting
- **Shortcut exists and version + path match** → skip silently (no rebuild, no mention)
- **Shortcut exists but version or path changed** → rebuild silently (no mention in greeting)

### Create the shortcut

**macOS** — create a native `.app` bundle at `~/Desktop/[Your App Name].app`:

1. Create the directory structure:
```bash
mkdir -p ~/Desktop/[Your\ App\ Name].app/Contents/MacOS
mkdir -p ~/Desktop/[Your\ App\ Name].app/Contents/Resources
```

2. Create the launch script at `~/Desktop/[Your App Name].app/Contents/MacOS/launch`:
```bash
#!/bin/bash
osascript -e 'tell app "Terminal" to do script "cd \"<absolute-cwd-path>\" && <agent> \"hello\""'
```
Then `chmod +x` the launch script.

3. Create `~/Desktop/[Your App Name].app/Contents/Info.plist` with version and path metadata:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleName</key>
    <string>[Your App Name]</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIdentifier</key>
    <string>com.imprint.[your-app-name]</string>
    <key>LSUIElement</key>
    <false/>
    <key>ImprintVersion</key>
    <string><version></string>
    <key>ImprintPath</key>
    <string><absolute-cwd-path></string>
</dict>
</plist>
```

4. Convert the SVG icon to ICNS and copy to Resources:
```bash
sips -s format png "<absolute-cwd-path>/imprint/icon.svg" --out /tmp/app-icon.png 2>/dev/null
mkdir -p /tmp/app.iconset
for size in 16 32 64 128 256 512; do
    sips -z $size $size /tmp/app-icon.png --out /tmp/app.iconset/icon_${size}x${size}.png 2>/dev/null
done
sips -z 32 32 /tmp/app-icon.png --out /tmp/app.iconset/icon_16x16@2x.png 2>/dev/null
sips -z 64 64 /tmp/app-icon.png --out /tmp/app.iconset/icon_32x32@2x.png 2>/dev/null
sips -z 256 256 /tmp/app-icon.png --out /tmp/app.iconset/icon_128x128@2x.png 2>/dev/null
sips -z 512 512 /tmp/app-icon.png --out /tmp/app.iconset/icon_256x256@2x.png 2>/dev/null
iconutil -c icns /tmp/app.iconset -o ~/Desktop/[Your\ App\ Name].app/Contents/Resources/icon.icns 2>/dev/null
rm -rf /tmp/app.iconset /tmp/app-icon.png
```

5. Refresh icon: `touch ~/Desktop/[Your\ App\ Name].app`

If icon conversion fails, the app still works — just without a custom icon.

**Linux** — create `~/Desktop/[Your App Name].desktop` with version and path metadata:
```ini
[Desktop Entry]
Type=Application
Name=[Your App Name]
Exec=bash -c 'cd "<absolute-cwd-path>" && <agent> "hello"'
Terminal=true
Icon=<absolute-path-to-imprint/icon.svg>
X-Imprint-Version=<version>
X-Imprint-Path=<absolute-cwd-path>
```
Then `chmod +x` the file.

**Windows** — create a shortcut on the desktop using PowerShell with metadata in the Description field:
```powershell
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\[Your App Name].lnk")
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = '/k cd /d "<absolute-cwd-path>" && <agent> "hello"'
$Shortcut.WorkingDirectory = "<absolute-cwd-path>"
$Shortcut.Description = "Imprint|<version>|<absolute-cwd-path>"
$Shortcut.Save()
```

## Step 3 — Check Node.js

Check if `node` is available:

```bash
which node 2>/dev/null || echo "NOT_FOUND"
```

If Node.js is installed, skip to the next step.

If missing, install a portable copy to `~/.imprint/node/`. **Ask the user first:**

> **[Your App Name]**: I need Node.js to run some tools. It's not installed on your system — want me to install a portable copy? It won't touch your system files. (~50MB download)

**Wait for the user to confirm before proceeding.**

After confirmation, detect the platform and architecture, then download:

```bash
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH="x64"
NODE_VERSION="v22.12.0"
mkdir -p ~/.imprint/node
curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${OS}-${ARCH}.tar.xz" | tar -xJ --strip-components=1 -C ~/.imprint/node
```

For Windows (PowerShell):
```powershell
$arch = if ([System.Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
$version = "v22.12.0"
Invoke-WebRequest "https://nodejs.org/dist/$version/node-$version-win-$arch.zip" -OutFile "$env:TEMP\node.zip"
Expand-Archive "$env:TEMP\node.zip" -DestinationPath "$env:USERPROFILE\.imprint\node" -Force
Remove-Item "$env:TEMP\node.zip"
```

After installing, prepend to PATH: `export PATH="$HOME/.imprint/node/bin:$PATH"`

The desktop shortcut's launch script should also prepend this path.

## Step 4 — Greet

The greeting depends on what happened with the shortcut:

**First creation (shortcut was just created for the first time):**
> **[Your App Name]**: I put a **[Your App Name]** shortcut on your desktop — next time just double-click it. [Your welcome message.]

**Shortcut already matched (skipped) or rebuilt silently or headless environment:**
> **[Your App Name]**: [Your welcome message.]

Only mention the shortcut when it is newly created for the first time.

## Error handling

If the project working directory is not set or not accessible:

> **[Your App Name]**: I need access to the project directory to get started. Please make sure I'm running in the right location.
