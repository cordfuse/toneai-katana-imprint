# katana-tsl

The deterministic BOSS KATANA `.tsl` writer. Ported from
[toneai-katana-web](https://github.com/cordfuse/toneai-katana-web), where the format
work was done.

## Why this exists

**The agent never writes a `.tsl`.** It writes tone *intent* — an amp model, knob
positions, an effect chain — and this tool turns that into a liveset.

A language model asked to emit a liveset directly will produce plausible,
well-formed, subtly wrong bytes: a section missing, a key with the wrong prefix, an
amp index that decodes to a different amp. The file looks fine and BOSS Tone Studio
refuses it — or worse, loads something that isn't the tone you asked for. A patch
the amp rejects is worse than no patch at all.

So the model is constrained to intent, against a schema built from the *target
device's own vocabulary*, and the byte layout happens here, in code, from golden
templates cloned off real exports.

## Usage

```bash
node dist/cli.js devices                    # the device ids you may target
node dist/cli.js schema katana-mk2          # the JSON Schema an intent must satisfy
node dist/cli.js write intent.json -o .     # write the .tsl
```

An intent file:

```json
{
  "device": "katana-mk2",
  "pickupNoise": "single-coil",
  "patch": {
    "name": "Rebel Rebel",
    "ampA": { "type": "Crunch", "gain": 55, "bass": 45, "middle": 60, "treble": 65, "presence": 55, "level": 65 },
    "booster": { "on": true, "type": "Treble Boost", "drive": 40, "tone": 60, "level": 55 },
    "fx1": { "on": true, "type": "Comp", "level": 50 },
    "delay": { "on": false, "type": "Digital", "timeMs": 400, "feedback": 30, "level": 40 },
    "reverb": { "on": true, "type": "Room", "timeS": 1.2, "level": 35 },
    "noiseSuppressor": { "on": true, "threshold": 25, "release": 50 }
  }
}
```

## The noise gate

`noiseSuppressor` is not optional in spirit. Every patch this project produced before
v0.11.0 shipped with the gate **off** — the writer never wrote the byte, and the golden
template it clones is a clean patch, which has no use for one. Stack gain 85 on that and
the amp howls the moment you touch the strings. A MkII owner reported exactly that.

Omit it and the tool derives one from the gain rather than leaving it to chance. On for
dirt, off for cleans.

`pickupNoise` (`single-coil` | `humbucking` | `mixed`) raises the gate for a noisy
pickup. A single coil — Strat/Tele, P-90, lipstick, foil — is an antenna: it hums, and
worse the more gain sits in front of it. A humbucker cancels that by construction. The
correction is applied **in code**, because a model told the rule in a prompt gave a P-90
two more threshold points where the rule asks for 8-12. Omit the field and no correction
is applied — over-gating a humbucker player chops their quiet notes, so the safe default
is to do nothing.

An intent naming an amp or effect the target device doesn't have is **rejected before
any bytes are written**, with the device's real vocabulary in the error. That failure
is deliberate and loud: silently substituting a fallback index is how you ship a file
that loads as the wrong amp.

## Two kinds of "verified"

`devices` reports two facts that are easy to confuse:

- **format** — the writer round-trips against a real `.tsl` export of that device's
  format. True for all nine.
- **real amp** — a patch from this writer has been loaded into the physical amp and
  heard. **True for the KATANA MkII only**, because that is the amp the author owns.

The format work is careful and probably right for the rest. "Probably right" is not
"verified", and a player is entitled to know which one they're getting. If you own
anything other than a MkII, load a patch and report back — working or broken.

## Build

```bash
npm install
npm run build      # tsc → dist/ (CommonJS, zero runtime dependencies)
npm test           # 86 tests — 77 pass, 9 self-skip (see below)
```

Compiled to CommonJS on purpose: the shipped app must run on a bare `node`, with no
install step and no network. `src/build.js` compiles this into the release ZIP.

Nine round-trip tests self-skip here — they need the third-party ground-truth `.tsl`
fixtures, which live only in `toneai-katana-web` and are not redistributed.

## Provenance

`src/` is a direct port of `nodejs/lib/patch/` from `toneai-katana-web`. Nothing
web-specific came across: no environment variables, no database, no quota, no API
keys, no HTTP. The only edit was replacing the web app's browser-storage import with
a local `devices.ts`.

Every device's output was diffed against the web app's writers and is
**byte-identical** across all nine. If you change a writer here, keep it in sync
there — or better, fix it there and re-port.
