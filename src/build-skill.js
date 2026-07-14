/**
 * build-skill.js — packages ToneAI Kat as a Claude Skill.
 *
 * How ToneAI Kat reaches Claude web and the Claude mobile app. A skill can carry
 * supporting files, so the compiled .tsl writer ships inside the skill and runs from
 * beside SKILL.md: `node tool/cli.js write ./intent.json -o .` — the same command, the
 * same writer, the same bytes as the desktop app. It has no dependencies and makes no
 * network calls, so it runs in the sandbox as-is.
 *
 * SKILL.md is COMPOSED from imprint/IDENTITY.md, never copy-pasted. The persona, THE ONE
 * RULE, the device list and the gate guidance keep exactly one source, so the skill
 * cannot drift from the app.
 *
 * The build SMOKE-RUNS the packaged writer on a real intent. If it does not produce a
 * .tsl, the build fails. We do not ship a writer we have not just watched work — and an
 * app that cannot write a .tsl is an app whose agent will be tempted to hand-write one,
 * which is the single thing it must never do.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const SMOKE_INTENT = {
  device: 'katana-mk2',
  pickupNoise: 'humbucking',
  patch: {
    name: 'Smoke Test',
    ampA: { type: 'Brown', gain: 78, bass: 55, middle: 45, treble: 62, presence: 58, level: 65 },
    booster: { on: true, type: 'Blues Drive', drive: 45, tone: 55, level: 60 },
    delay: { on: true, type: 'Digital', timeMs: 420, feedback: 35, level: 40 },
    reverb: { on: true, type: 'Hall', timeS: 1.8, level: 35 },
    noiseSuppressor: { on: true, threshold: 40, release: 50 },
  },
};

/**
 * Replaces the app's "### 5. Tell the player" section.
 *
 * The don't-read rule is not pedantry. tool/ is compiled JavaScript plus the golden
 * templates — better than a megabyte of machine-written JSON and minified code. An agent
 * that decides to read the tool before running it pulls all of that into context and
 * stalls the request. That has already happened, in a real session, in the sibling NUX
 * app. Say it out loud rather than hope.
 */
const SANDBOX_SECTION = `### 5. Tell the player

You are running as a Claude Skill, in a sandbox — so there is no folder the player can go
and look in. **Attach the \`.tsl\` file to your reply** so they can download it. A file
path they cannot reach is no use to anyone.

Then tell them to import it in BOSS Tone Studio, and explain the patch in **at most 3
short sentences of plain prose**: the amp and why, the drive, the key effects. Nothing
else. No headings, no bullet lists, no "Tips" section, no playing advice, no restating
their request back at them. Do not print the raw parameters — the writer's summary line
already covers it.

For an AIR or WAZA-AIR device, add the hand-dial amp settings, since those don't travel
in the file.

### The tool is a black box — run it, never read it

\`tool/\` is compiled JavaScript and the golden patch templates: well over a megabyte of
machine-generated data. **Never open, read, print, or search inside it.** There is nothing
in there for you to learn, and reading it will flood your context and wedge the request.

Run it. Never inspect it. If it fails, show the player the error and stop — as THE ONE
RULE says, a clear failure is a good outcome and a hand-written \`.tsl\` is not.
`;

/**
 * Stamp the build version into the SKILL.md frontmatter as `metadata.version`, so
 * a skill in someone's Claude account is self-identifying — no guessing which build
 * it is. Injected into the existing frontmatter block, right before its closing fence.
 */
function stampVersion(md, version) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('SKILL.md has no frontmatter block to stamp the version into');
  if (/^metadata:/m.test(m[1])) {
    throw new Error('IDENTITY.md frontmatter already declares metadata — adjust the version stamp instead of duplicating it');
  }
  return md.replace(m[0], `---\n${m[1]}\nmetadata:\n  version: ${version}\n---\n`);
}

function composeSkillMd(version) {
  const raw = fs.readFileSync(path.join(ROOT, 'imprint', 'IDENTITY.md'), 'utf-8');

  // MEMORY.md is the Imprint engine's memory config. It does not ship in the skill, so a
  // pointer to it is a pointer to nothing — and an agent told to "see MEMORY.md" will go
  // looking. The behaviour it asks for (ask once, then remember) is what matters, and
  // Claude's own memory provides it, so say that instead.
  const identity = raw
    .replace(/\(see\s+`MEMORY\.md`\s+—\s+/g, '(')            // "(see `MEMORY.md` — a Les Paul…"
    .replace(/\s*\(see\s+`MEMORY\.md`\)/g, '')               // "…remember it (see `MEMORY.md`)"  — may wrap a newline
    .replace(/\s*\(see\s+\n?`MEMORY\.md`\)/g, '');
  if (identity.includes('MEMORY.md')) {
    throw new Error('SKILL.md still references MEMORY.md, which does not ship in the skill');
  }

  const marker = '### 5. Tell the player';
  const idx = identity.indexOf(marker);
  if (idx < 0) {
    throw new Error(`IDENTITY.md no longer contains "${marker}" — SKILL.md would ship the wrong delivery instructions`);
  }

  // Everything from "### 5. Tell the player" up to the next top-level heading is desktop
  // delivery (file paths on a machine). Replace it; keep everything after.
  const rest = identity.slice(idx + marker.length);
  const nextHeading = rest.indexOf('\n## ');
  if (nextHeading < 0) {
    throw new Error('IDENTITY.md section 5 is no longer followed by a top-level heading — refusing to guess where it ends');
  }

  const composed = identity.slice(0, idx) + SANDBOX_SECTION + rest.slice(nextHeading);
  return stampVersion(composed, version);
}

/**
 * The compiled writer, straight out of the app build. Same artifact the desktop ZIP
 * carries — one writer, one set of bytes, no second implementation to drift.
 */
function buildSkill(outDir, appDist, version) {
  if (!version) throw new Error('buildSkill requires the version (for the SKILL.md metadata stamp)');
  const tool = path.join(appDist, 'tool');
  if (!fs.existsSync(path.join(tool, 'cli.js'))) {
    throw new Error(`no compiled writer at ${tool}/cli.js — refusing to ship a skill that cannot write a .tsl`);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  copyDirRecursive(tool, path.join(outDir, 'tool'));
  fs.writeFileSync(path.join(outDir, 'SKILL.md'), composeSkillMd(version), 'utf-8');

  smokeRun(outDir);

  return { bytes: dirSize(outDir) };
}

/** Run the packaged writer the way the sandbox will: bare node, no install, no network. */
function smokeRun(skillDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toneai-kat-smoke-'));
  try {
    copyDirRecursive(path.join(skillDir, 'tool'), path.join(tmp, 'tool'));
    fs.writeFileSync(path.join(tmp, 'intent.json'), JSON.stringify(SMOKE_INTENT), 'utf-8');
    execFileSync(process.execPath, ['tool/cli.js', 'write', './intent.json', '-o', '.'], { cwd: tmp, stdio: 'pipe' });
    const tsl = fs.readdirSync(tmp).filter((f) => f.endsWith('.tsl'));
    if (tsl.length === 0) throw new Error('writer produced no .tsl');
    const body = fs.readFileSync(path.join(tmp, tsl[0]), 'utf-8');
    if (!body.includes('Patch_0')) throw new Error(`.tsl has no Patch_0 section: ${tsl[0]}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

module.exports = { buildSkill };
