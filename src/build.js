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

// --- Step 5: Copy src/ if it exists ---
const srcDir = path.join(ROOT, 'src');
if (fs.existsSync(srcDir)) {
  copyDirRecursive(srcDir, path.join(DIST, 'src'));
  console.log('  Copied src/ tooling');
}

// --- Step 6: Copy other shipping files ---
const copyFiles = ['README.md', 'LICENSE', 'version.txt', '.gitignore', 'package.json'];
for (const file of copyFiles) {
  const srcPath = path.join(ROOT, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(DIST, file));
  }
}

// --- Step 6b: Install npm dependencies in dist ---
const distPkgJson = path.join(DIST, 'package.json');
if (fs.existsSync(distPkgJson)) {

  execSync('npm install --production', { cwd: DIST, stdio: 'pipe' });
  console.log('  Installed npm dependencies in dist');
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

console.log(`\nBuild complete → ${DIST}`);
console.log(`Open this directory in an agent CLI to test user mode.`);
