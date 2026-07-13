// The KATANA device roster.
//
// Ported verbatim (minus the web app's UI concerns) from toneai-katana-web's
// lib/storage.ts, which is where these ids were established. The ids are part of
// the tool's INPUT CONTRACT — an intent file names its device with one of them —
// so they must not drift from the web app's. Keep them identical.
//
// A device is a first-class concept rather than a flag because the .tsl format is
// genuinely different per generation: different section maps, different amp and
// effect vocabularies, different byte layouts. See generations.ts.

export type KatanaDevice =
  | 'katana-mk1' | 'katana-mk2' | 'katana-mk3' | 'katana-air'
  | 'katana-go' | 'katana-go-bass' | 'katana-bass'
  | 'waza-air' | 'waza-air-bass'

/** Instrument a device is played with. First-class because it gates cross-device
 *  conversion: a guitar tone must never be converted to a bass rig or vice versa
 *  (different amps, EQ, voicing entirely). Dual-mode hardware (GO) is split into
 *  one device per instrument, so every entry is unambiguously one or the other. */
export type KatanaInstrument = 'guitar' | 'bass'

/**
 * TWO DIFFERENT FACTS, kept apart on purpose.
 *
 * `generations.ts` carries a `confidence` field, and for every device it currently
 * reads 'verified'. That means ONE thing: the writer round-trips against a real
 * `.tsl` export of that device's format. It is a statement about BYTES.
 *
 * `hardware` below is a statement about AMPS: has a patch from this writer been
 * loaded into the physical amp and heard? For exactly one device, yes — the KATANA
 * MkII, because that is the amp the author owns. He cannot buy one of each.
 *
 * Conflating the two is how you end up telling a WAZA-AIR player their patch is
 * "verified" when nobody has ever put one into a WAZA-AIR. The format work is
 * careful and probably right; "probably right" is not "verified", and the player
 * deserves to know which one they're getting so they can report back when it
 * breaks. Flip a row to true only when a real amp has accepted a real file.
 */
export const KATANA_DEVICES: {
  id: KatanaDevice; label: string; instrument: KatanaInstrument; hardware: boolean
}[] = [
  { id: 'katana-mk2',     label: 'KATANA MkII',    instrument: 'guitar', hardware: true  },
  { id: 'katana-mk3',     label: 'KATANA Gen 3',   instrument: 'guitar', hardware: false },
  { id: 'katana-air',     label: 'KATANA:AIR',     instrument: 'guitar', hardware: false },
  { id: 'katana-go',      label: 'KATANA:GO',      instrument: 'guitar', hardware: false },
  { id: 'katana-go-bass', label: 'KATANA:GO Bass', instrument: 'bass',   hardware: false },
  { id: 'katana-bass',    label: 'KATANA Bass',    instrument: 'bass',   hardware: false },
  { id: 'katana-mk1',     label: 'KATANA MkI',     instrument: 'guitar', hardware: false },
  { id: 'waza-air',       label: 'WAZA-AIR',       instrument: 'guitar', hardware: false },
  { id: 'waza-air-bass',  label: 'WAZA-AIR Bass',  instrument: 'bass',   hardware: false },
]

/** Has a patch from this writer been loaded into the physical amp? Only the MkII. */
export const isHardwareConfirmed = (device: KatanaDevice): boolean =>
  KATANA_DEVICES.find(d => d.id === device)?.hardware ?? false

const DEVICE_INSTRUMENT = new Map<KatanaDevice, KatanaInstrument>(
  KATANA_DEVICES.map(d => [d.id, d.instrument]),
)

export const isKatanaDevice = (v: unknown): v is KatanaDevice =>
  typeof v === 'string' && DEVICE_INSTRUMENT.has(v as KatanaDevice)

export const deviceLabel = (device: KatanaDevice): string =>
  KATANA_DEVICES.find(d => d.id === device)?.label ?? device

/** The instrument a device is played with. Defaults to guitar for an unknown id
 *  (the overwhelming majority) and falls back to a `bass` substring so a future
 *  bass device is never mis-typed as guitar before its row is added. */
export function instrumentForDevice(device: KatanaDevice): KatanaInstrument {
  return DEVICE_INSTRUMENT.get(device) ?? (device.includes('bass') ? 'bass' : 'guitar')
}
