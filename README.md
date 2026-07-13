# ToneAI Kat

Tell ToneAI Kat what you want to sound like — a song, an artist, or just a feeling. It researches the original rig, dials in a patch for your BOSS KATANA, and writes you a `.tsl` liveset you import with BOSS Tone Studio.

It runs on your existing AI account. No API key, no extra subscription.

---

## Getting started

### The easy way — Claude web and mobile (start here)

No terminal, no install, works on your phone.

1. Download **`toneai-kat-skill-v<version>.zip`** from the [latest release](https://github.com/cordfuse/toneai-katana-imprint/releases/latest).
2. In a **web browser**, go to claude.ai and open your **Skills** settings (**Customize → Skills**), click **Upload skill** and choose the ZIP. Don't unzip it.
3. That's it. ToneAI Kat is in every chat from then on, web and mobile.

> **The import has to happen in a browser.** The Claude mobile app doesn't surface the skill-import screen — there's no way to add a custom skill from the app. Do it once at claude.ai in a browser (a phone browser is fine); after that the skill lives on your account and the mobile app picks it up like any other chat.

Ask for a tone — *"dial in the Comfortably Numb solo, I'm on a KATANA MkII with a Les Paul"* — and it hands you the `.tsl` to import.

It asks once which KATANA you own and what you play, then remembers. The skill carries the patch writer and runs entirely inside Claude's sandbox: no network, no dependencies. The bytes are identical to the desktop app's — it is the same writer.

Skills work on **every** Claude plan, including Free. The one requirement is that **code execution is switched on** in your Claude settings — the skill runs the generator, so it needs it.

### Desktop (agent CLI)

For local files and offline use. **This one needs a command line** — if that's not for you, the skill above gives you the same patches.

1. Download `toneai-katana-imprint-v<version>.zip` from the [latest release](https://github.com/cordfuse/toneai-katana-imprint/releases/latest) and extract it.
2. Open the folder in an agent CLI and say hello.

No install step: the writer ships compiled, with no dependencies and no network calls. It runs on a bare Node.

**Supported agents:** Claude Code (`claude`), Gemini CLI (`gemini`), Antigravity CLI (`agy`), Codex (`codex`), OpenCode (`opencode`), Qwen Code (`qwen`).

---

## The one rule

**The agent never writes a `.tsl` file.** It decides the tone — the amp, the gain staging, the EQ, the effects — and a deterministic writer turns that decision into bytes.

This is not fussiness. A `.tsl` is a byte-level format. A language model asked to emit one directly produces something that *looks* right — well-formed JSON, plausible section names — and is subtly wrong: a missing section, a key with the wrong prefix, an amp index that decodes to a different amp. BOSS Tone Studio then rejects the file, or worse, loads a tone you didn't design.

**A patch the amp rejects is worse than no patch**, because the player can't tell the tool's mistake from their own. So the model is constrained to *intent*, checked against the target device's own vocabulary, and the byte layout happens in code, from templates cloned off real exports.

See [`tool/README.md`](tool/README.md) for the writer.

## Supported devices

Nine, across every KATANA generation:

| id | amp | instrument |
|---|---|---|
| `katana-mk2` | KATANA MkII | guitar |
| `katana-mk3` | KATANA Gen 3 | guitar |
| `katana-mk1` | KATANA MkI | guitar |
| `katana-air` | KATANA:AIR | guitar |
| `katana-go` | KATANA:GO | guitar |
| `katana-go-bass` | KATANA:GO (bass mode) | bass |
| `katana-bass` | KATANA Bass (110 / 210 / Head) | bass |
| `waza-air` | WAZA-AIR | guitar |
| `waza-air-bass` | WAZA-AIR Bass | bass |

### Which of these are actually proven

Two different claims, easy to confuse:

- **format** — the writer round-trips against a real `.tsl` export of that device's format. True for all nine.
- **real amp** — a patch from this writer has been loaded into the physical amp and heard. **True for the KATANA MkII only**, because that is the amp the author owns.

The rest is careful work and probably right. "Probably right" is not "verified". If you own anything other than a MkII, load a patch and tell us — working or broken. That report is the single most useful thing you can give this project.

## The noise gate

Every patch this project produced before v0.11.0 shipped with the noise gate **off**. The writer never wrote the byte, and the golden template it clones is a clean patch, which has no use for one. Stack gain 85 on that and the amp howls the moment you touch the strings. A MkII owner reported exactly that, and he was right.

The writer now owns that byte. The gate is on for dirt, off for cleans, and scaled to the gain in front of it. Tell it your pickups and it raises the gate for a single coil — a Strat/Tele pickup, a P-90, a lipstick, a foil — because those hum, and worse the more gain sits in front of them, where a humbucker cancels it by construction.

That correction is applied **in code**, not asked for in a prompt: told the rule, the model gave a P-90 two more threshold points where the rule asks for eight to twelve. If a rule has to be true, enforce it in code.

## Development

Built on [Imprint](https://github.com/cordfuse/imprint) — the agent's identity, permissions, constraints and memory are `.md` files in `imprint/`, and `IMPRINT.md` is the engine that loads them.

```bash
node src/build.js     # → ~/.imprint-test (dev), or ./dist + ./dist-skill (CI)
cd tool && npm test   # 85 tests
```

`src/build.js` compiles the writer into the app and packages the Claude Skill, and **fails the build** if the writer cannot produce a `.tsl`. An app that cannot write a liveset is one whose agent gets tempted to hand-write one.

Tag `v$(cat version.txt)` and CI publishes both ZIPs.

See [DEVELOPER.md](DEVELOPER.md) for the Imprint engine itself.

---

<sub>Built on [Imprint](https://github.com/cordfuse/imprint) by [Cordfuse](https://github.com/cordfuse).</sub>
