#!/usr/bin/env node

/**
 * build.js
 *
 * Builds a clean production-ready copy of the Imprint app into ./dist/.
 * Used by both the developer (local testing) and the release CI workflow.
 *
 * Output mirrors exactly what end users receive in the ZIP download.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// CI uses ./dist/ (workflow expects it there), local dev uses ~/.imprint-test/
const DIST = process.env.CI
  ? path.join(ROOT, 'dist')
  : path.join(require('os').homedir(), '.imprint-test');

// Clean dist/
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Read version
const version = fs.readFileSync(path.join(ROOT, 'version.txt'), 'utf-8').trim();
console.log(`Building v${version}...`);

// --- Step 1: Copy IMPRINT-USER.md, strip dev mode, output as IMPRINT.md ---
let imprint = fs.readFileSync(path.join(ROOT, 'IMPRINT-USER.md'), 'utf-8');

// Remove DEV_MODE blocks
imprint = imprint.replace(
  /\n*<!-- DEV_MODE_START -->[\s\S]*?<!-- DEV_MODE_END -->\n*/g,
  '\n'
);

// Stamp version
imprint = imprint.replace(
  /<!-- IMPRINT — https:\/\/github\.com\/cordfuseinc\/imprint -->/,
  `<!-- IMPRINT v${version} — https://github.com/cordfuse/imprint -->`
);

fs.writeFileSync(path.join(DIST, 'IMPRINT.md'), imprint, 'utf-8');
console.log('  IMPRINT-USER.md → dist/IMPRINT.md — stripped dev mode, stamped version');

// --- Step 2: Generate checksum ---
const crypto = require('crypto');

const withoutChecksum = imprint.replace(
  /<!-- Checksum: [a-fA-F0-9]+ -->/,
  '<!-- Checksum: NONE (dev build — run release workflow to generate) -->'
);

const hash = crypto
  .createHash('sha256')
  .update(withoutChecksum, 'utf-8')
  .digest('hex');

// Embed checksum into the dist copy
const finalImprint = imprint.replace(
  /<!-- Checksum: NONE \(dev build — run release workflow to generate\) -->/,
  `<!-- Checksum: ${hash} -->`
);
fs.writeFileSync(path.join(DIST, 'IMPRINT.md'), finalImprint, 'utf-8');
fs.writeFileSync(path.join(DIST, '.imprint-checksum'), hash + '\n', 'utf-8');
console.log(`  Checksum: ${hash}`);

// --- Step 3: Write one-liner agent files pointing to IMPRINT.md ---
// ANTIGRAVITY.md added 2026-05-19 alongside GEMINI.md. Google's Antigravity CLI
// (binary `agy`) succeeds the Gemini CLI on 2026-06-18. Its binary's strings do
// not embed any convention-file path (unlike Claude Code / Gemini CLI which
// look for CLAUDE.md / GEMINI.md at session start) — so today the file is
// belt-and-braces: harmless if agy ignores it, immediately ready if Google
// publishes convention support. Same one-liner content as the others.
const agentFiles = ['CLAUDE.md', 'GEMINI.md', 'ANTIGRAVITY.md', 'AGENTS.md', 'QWEN.md', '.windsurfrules', '.clinerules'];
const agentOneLiner = 'IMPORTANT: Read and follow all instructions in ./IMPRINT.md before responding to the user.\n';
for (const file of agentFiles) {
  fs.writeFileSync(path.join(DIST, file), agentOneLiner, 'utf-8');
}
console.log(`  Wrote one-liner agent files: ${agentFiles.join(', ')}`);

// --- Step 4: Copy imprint/ app definition directory ---
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const imprintDir = path.join(ROOT, 'imprint');
if (fs.existsSync(imprintDir)) {
  copyDirRecursive(imprintDir, path.join(DIST, 'imprint'));
  console.log('  Copied imprint/ app definition');
}

// --- Step 5: (intentionally empty) ---
//
// The template copied src/ into the app. Here, src/ holds only THIS build script —
// dev tooling, useless to a user and confusing to an agent that reads its working
// directory to work out what it's allowed to do. The app's real tooling is the .tsl
// writer, compiled into dist/tool below. Nothing in src/ ships.

// --- Step 5b: Compile the .tsl writer into the app ---
//
// The writer is TypeScript in tool/src, but what SHIPS has to be plain JavaScript:
// the person who unzips this has an agent CLI and an amp, not a toolchain. So it
// is compiled here, at build time, and the ZIP carries only the emitted JS. It has
// no runtime dependencies and makes no network calls, so `node tool/cli.js` works
// on a bare Node install, offline, forever.
//
// This is load-bearing, not a convenience: the agent MUST NOT hand-write a .tsl.
// If the tool were missing from the ZIP, a helpful agent would try to produce the
// liveset itself and emit a file the amp rejects. A build that cannot ship the
// writer must fail loudly rather than quietly ship an app without it.
const toolDir = path.join(ROOT, 'tool');
if (fs.existsSync(path.join(toolDir, 'package.json'))) {
  execSync('npm install --silent', { cwd: toolDir, stdio: 'pipe' });
  execSync('npm run build', { cwd: toolDir, stdio: 'pipe' });

  const toolDist = path.join(toolDir, 'dist');
  const cli = path.join(toolDist, 'cli.js');
  if (!fs.existsSync(cli)) {
    throw new Error('tool build produced no cli.js — refusing to ship an app that cannot write a .tsl');
  }
  copyDirRecursive(toolDist, path.join(DIST, 'tool'));
  console.log('  Compiled tool/ → dist/tool (the deterministic .tsl writer)');
}

// --- Step 6: Copy other shipping files ---
//
// No package.json. THE SHIPPED APP HAS NO DEPENDENCIES AND MUST NEVER INSTALL ANY.
//
// The Imprint template shipped a package.json and ran `npm install --production`
// inside the ZIP, so every user's first run pulled packages onto their machine. That
// is a real failure surface — a sibling app carried a NATIVE addon that way, and a
// native build that fails on a user's box breaks the app before it ever does its job,
// with an error that means nothing to a guitarist.
//
// This app doesn't need it. The .tsl writer is compiled into dist/tool above and
// depends on nothing but Node's own builtins. So there is no manifest to install
// from, no registry to reach, and nothing to go wrong offline. Keep it that way: if
// you ever find yourself adding a dependency here, put it in tool/ and compile it in
// instead.
const copyFiles = ['README.md', 'LICENSE', 'version.txt', '.gitignore'];
for (const file of copyFiles) {
  const srcPath = path.join(ROOT, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(DIST, file));
  }
}

// --- Step 7: Create output/.gitkeep if output dir pattern is used ---
const outputDir = path.join(DIST, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, '.gitkeep'), '', 'utf-8');
}

// --- Step 8: Copy agent configs and apply bash-policy ---
const agentsDir = path.join(ROOT, 'imprint', 'agents');
if (fs.existsSync(agentsDir)) {
  for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const src = path.join(agentsDir, entry.name);
      const dest = path.join(DIST, `.${entry.name}`);
      copyDirRecursive(src, dest);
      console.log(`  Copied imprint/agents/${entry.name}/ → dist/.${entry.name}/`);
    }
  }
}

// Parse bash-policy from SESSION.md
const sessionPath = path.join(ROOT, 'imprint', 'SESSION.md');
let bashPolicy = 'allow-all';
if (fs.existsSync(sessionPath)) {
  const sessionContent = fs.readFileSync(sessionPath, 'utf-8');
  const match = sessionContent.match(/bash-policy:\s*([\w-]+)/);
  if (match) bashPolicy = match[1];
}
console.log(`  Bash policy: ${bashPolicy}`);

// Apply bash-policy to Claude settings
const claudeSettingsPath = path.join(DIST, '.claude', 'settings.json');
if (fs.existsSync(claudeSettingsPath)) {
  const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'));

  // Remove any existing Bash rules
  settings.permissions.allow = settings.permissions.allow.filter(r => !r.startsWith('Bash'));

  if (bashPolicy === 'allow-all') {
    settings.permissions.allow.push('Bash(*)');
  } else if (bashPolicy === 'allow-list') {
    // Parse allowed commands from PERMISSIONS.md
    const permPath = path.join(ROOT, 'imprint', 'PERMISSIONS.md');
    if (fs.existsSync(permPath)) {
      const permContent = fs.readFileSync(permPath, 'utf-8');
      const shellSection = permContent.match(/## Shell \/ Command Execution\n([\s\S]*?)(?=\n##|\n>|$)/);
      if (shellSection) {
        const cmds = shellSection[1].match(/`([^`]+)`/g);
        if (cmds) {
          for (const cmd of cmds) {
            const clean = cmd.replace(/`/g, '').split(' — ')[0].trim();
            settings.permissions.allow.push(`Bash(${clean}:*)`);
          }
        }
      }
    }
  }
  // deny = no Bash rules added

  fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}


// --- Step 9: Initialize git so agents recognize .claude/settings.json ---
execSync('git init', { cwd: DIST, stdio: 'ignore' });
console.log('  Initialized git (required for agent config discovery)');

// --- Step 10: Package the Claude Skill (claude.ai) ---
//
// ToneAI Kat in Claude web and on a phone: SKILL.md + the compiled writer, in one ZIP the
// player imports once. The sandbox runs the same `node tool/cli.js write` the desktop app
// runs, so the .tsl bytes are identical — one writer, no second implementation to drift.
//
// Built BESIDE dist/, never inside it: SKILL.md is a second copy of the persona, and
// shipping it in the app tree would leave two identity documents for the agent to trip
// over. Fails the build if the packaged writer cannot produce a .tsl.
const { buildSkill } = require('./build-skill.js');
const SKILL_DIST = path.join(ROOT, 'dist-skill');
const skill = buildSkill(SKILL_DIST, DIST);
console.log(`  Skill: dist-skill/ — SKILL.md + tool/ (${(skill.bytes / 1024 / 1024).toFixed(2)} MB), smoke test passed`);

console.log(`\nBuild complete → ${DIST}`);
console.log(`Open this directory in an agent CLI to test user mode.`);
