#!/usr/bin/env node
//
// katana-tsl — turn a tone INTENT file into a BOSS Tone Studio liveset (.tsl).
//
// THE ONE RULE THIS TOOL EXISTS TO ENFORCE:
//
//   The agent never writes a .tsl. It writes tone INTENT — an amp model, knob
//   positions, an effect chain — against a schema constrained to the vocabulary
//   the target device actually has. This tool is the only thing that turns intent
//   into bytes, deterministically, from a golden template cloned off a real
//   export.
//
// A patch the amp rejects is worse than no patch at all. A language model asked to
// emit a liveset directly WILL produce plausible, well-formed, subtly wrong bytes:
// a missing section, a key with the wrong prefix, an amp index that decodes to a
// different amp. The file looks fine and BOSS Tone Studio refuses it — or worse,
// loads something that isn't the tone. Constraining the model to intent and doing
// the byte layout here in code is what makes the output trustworthy.
//
// Commands
//   devices                       list the device ids you may target
//   schema  <device>              print the JSON Schema the intent must satisfy
//   write   <intent.json> [-o d]  write the .tsl; prints the path it wrote
//
// Intent file shape:  { "device": "katana-mk2", "patch": { ...TonePatch } }
//
// Zero runtime dependencies, no network, no environment variables. Plain node.

import fs from 'node:fs'
import path from 'node:path'
import {
  writePatchTsl, tslString, tslFilename, profileForDevice, describePatch,
  calibrateGateForPickup, defaultNoiseSuppressor,
  type TonePatch,
} from './index'
import { buildToneSchema } from './schema'
import { vocabForDevice } from './vocab'
import {
  KATANA_DEVICES, isKatanaDevice, isHardwareConfirmed, deviceLabel, isPickupNoise,
  type KatanaDevice, type PickupNoise,
} from './devices'

const PROG = 'katana-tsl'

class UsageError extends Error {}

function readIntent(file: string): { device: KatanaDevice; patch: TonePatch; noise: PickupNoise } {
  let raw: string
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    throw new UsageError(`can't read intent file: ${file}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new UsageError(`intent file is not valid JSON: ${(e as Error).message}`)
  }

  const obj = parsed as Record<string, unknown>
  if (!obj || typeof obj !== 'object') throw new UsageError('intent must be a JSON object')

  const device = obj.device
  if (!isKatanaDevice(device)) {
    throw new UsageError(
      `unknown device ${JSON.stringify(device)}. Run \`${PROG} devices\` for the list.`,
    )
  }

  const patch = obj.patch as TonePatch | undefined
  if (!patch || typeof patch !== 'object') {
    throw new UsageError('intent is missing a `patch` object')
  }

  // How much the player's pickup hums. Optional, and an unknown value falls back to
  // 'humbucking' — NO correction. Inventing a single coil the player doesn't have
  // would over-gate them and chop their quiet notes, which is the worse failure.
  const noise: PickupNoise = isPickupNoise(obj.pickupNoise) ? obj.pickupNoise : 'humbucking'

  validate(patch, device)
  return { device, patch, noise }
}

/**
 * Reject an intent the target device cannot express, BEFORE writing bytes.
 *
 * The writer resolves a name like "Clean Twin" to an index in the device's enum.
 * Hand it a name that device does not have and it cannot do anything good: it
 * either throws, or silently stamps a fallback index — which is the failure mode
 * that matters, because it produces a file that loads as the WRONG AMP. So the
 * names are checked against the device's own vocabulary here, where the error can
 * still be reported instead of encoded.
 */
function validate(patch: TonePatch, device: KatanaDevice): void {
  const vocab = vocabForDevice(device)
  const bad: string[] = []

  const inVocab = (label: string, value: unknown, allowed: readonly string[]) => {
    if (typeof value !== 'string') { bad.push(`${label} is missing`); return }
    if (!allowed.includes(value)) {
      bad.push(`${label} "${value}" is not on ${deviceLabel(device)} — pick one of: ${allowed.join(', ')}`)
    }
  }

  if (typeof patch.name !== 'string' || !patch.name.trim()) bad.push('patch.name is missing')
  if (!patch.ampA) bad.push('patch.ampA is missing')
  else inVocab('ampA.type', patch.ampA.type, vocab.amps)
  if (patch.ampB) inVocab('ampB.type', patch.ampB.type, vocab.amps)
  if (patch.booster?.on) inVocab('booster.type', patch.booster.type, vocab.boosters)
  if (patch.fx1?.on) inVocab('fx1.type', patch.fx1.type, vocab.fx)
  if (patch.fx2?.on) inVocab('fx2.type', patch.fx2.type, vocab.fx)
  if (patch.delay?.on) inVocab('delay.type', patch.delay.type, vocab.delays)
  if (patch.reverb?.on) inVocab('reverb.type', patch.reverb.type, vocab.reverbs)

  if (bad.length) {
    throw new UsageError(`this intent does not fit ${deviceLabel(device)}:\n  - ${bad.join('\n  - ')}`)
  }
}

function cmdDevices(): void {
  // Report the format state and the HARDWARE state separately — they are not the
  // same claim, and only the second one is what a player is really asking about.
  for (const d of KATANA_DEVICES) {
    const format = profileForDevice(d.id).confidence
    const amp = d.hardware ? 'confirmed on a real amp' : 'not yet tried on a real amp'
    console.log(`${d.id.padEnd(15)} ${d.label.padEnd(16)} ${d.instrument.padEnd(7)} format:${format.padEnd(9)} ${amp}`)
  }
}

function cmdSchema(device: string): void {
  if (!isKatanaDevice(device)) {
    throw new UsageError(`unknown device "${device}". Run \`${PROG} devices\` for the list.`)
  }
  console.log(JSON.stringify(buildToneSchema(vocabForDevice(device)), null, 2))
}

function cmdWrite(file: string, outDir: string): void {
  const { device, patch: raw, noise } = readIntent(file)

  // THE GATE IS NOT NEGOTIABLE, and it is not left to the agent.
  //
  // Two corrections, both applied here rather than trusted to the model:
  //
  //   1. A patch with no noiseSuppressor gets one derived from its gain. Every patch
  //      this project ever produced shipped with the gate OFF, because the writer never
  //      wrote the byte and the template's donor is a clean patch with no use for one.
  //      High-gain patches squealed on real hardware.
  //   2. A single coil gets a higher threshold than a humbucker. Told the rule in a
  //      prompt, a model gave a P-90 two more points where the rule asks for 8-12. A
  //      prompt is guidance; this is a guarantee.
  const ns = calibrateGateForPickup(raw.noiseSuppressor ?? defaultNoiseSuppressor(raw), noise)
  const patch: TonePatch = { ...raw, noiseSuppressor: ns }

  // allowUnvalidated: every writer is offered, but the confidence is reported
  // rather than hidden — see the note printed below.
  const tsl = writePatchTsl(patch, device, { allowUnvalidated: true })
  const outPath = path.resolve(outDir, tslFilename(patch.name || 'patch'))
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, tslString(tsl), 'utf8')

  console.log(outPath)
  console.log(`device: ${deviceLabel(device)}`)
  console.log(`patch:  ${describePatch(patch)}`)

  if (!isHardwareConfirmed(device)) {
    console.log(
      `note:   no ${deviceLabel(device)} has ever loaded a file from this writer. The ` +
      `format work is careful, but it is not proven on hardware. Say so to the player, ` +
      `and ask them to report back whether it loaded — working or broken.`,
    )
  }
}

function main(argv: string[]): number {
  const [cmd, ...rest] = argv

  try {
    switch (cmd) {
      case 'devices':
        cmdDevices()
        return 0

      case 'schema':
        if (!rest[0]) throw new UsageError(`usage: ${PROG} schema <device>`)
        cmdSchema(rest[0])
        return 0

      case 'write': {
        const args = rest.filter(a => a !== '-o' && a !== '--out')
        const oi = rest.findIndex(a => a === '-o' || a === '--out')
        const outDir = oi >= 0 ? rest[oi + 1] : '.'
        const intent = args.find(a => a !== outDir)
        if (!intent) throw new UsageError(`usage: ${PROG} write <intent.json> [-o <dir>]`)
        cmdWrite(intent, outDir)
        return 0
      }

      case undefined:
      case '-h':
      case '--help':
        console.log(
          `${PROG} — write a BOSS Tone Studio liveset from a tone intent file\n\n` +
          `  ${PROG} devices                     list target devices\n` +
          `  ${PROG} schema <device>             the JSON Schema an intent must satisfy\n` +
          `  ${PROG} write <intent.json> [-o d]  write the .tsl\n`,
        )
        return 0

      default:
        throw new UsageError(`unknown command "${cmd}". Try \`${PROG} --help\`.`)
    }
  } catch (err) {
    // Fail loudly and specifically. A silent or vague failure here would push the
    // agent toward hand-writing a .tsl to "help" — the exact thing this tool exists
    // to prevent.
    console.error(`${PROG}: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}

process.exit(main(process.argv.slice(2)))
