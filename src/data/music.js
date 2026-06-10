// music.js — original chiptune tracks for the engine sequencer.
// Patterns are authored as note strings (one token per 16th-note step).
// "-" / "." = rest/hold. Any nonzero value in a `noise` voice = a drum hit.

const NOTES = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function n(tok) {
  if (tok === "-" || tok === ".") return 0;
  const m = tok.match(/^([A-G]#?)(-?\d)$/);
  return m ? (parseInt(m[2]) + 1) * 12 + NOTES[m[1]] : 0;
}
function S(str) { return str.trim().split(/\s+/).map(n); }
// drum string: k = kick, s = snare, h = hat, x = generic hit (snare), . = rest.
// values feed the engine drum kit (1=kick, 3=hat, else=snare).
const DRUM = { k: 1, s: 2, h: 3, x: 2, X: 2 };
function D(str) { return str.trim().split(/\s+/).map((c) => DRUM[c] || 0); }

const E_LEAD = { a: 0.004, d: 0.05, s: 0.5, r: 0.05 };
const E_PLUCK = { a: 0.002, d: 0.08, s: 0.2, r: 0.04 };
const E_PAD = { a: 0.04, d: 0.2, s: 0.7, r: 0.2 };
const E_BASS = { a: 0.004, d: 0.05, s: 0.6, r: 0.05 };

function track(bpm, voices, loop = true) { return { bpm, loop, voices }; }

export const TRACKS = {
  // ---- title: dreamy, floating ----
  title: track(96, [
    { wave: "triangle", gain: 0.12, env: E_PAD, seq: S("C3 - - - G3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - D3 - - -") },
    { wave: "square", gain: 0.10, env: E_LEAD, seq: S("- - E5 - G5 - - C5 - - D5 - - - - - - - E5 - C5 - - A4 - - G4 - - - - -") },
    { wave: "triangle", gain: 0.07, env: E_PLUCK, seq: S("C4 G4 E4 G4 C4 G4 E4 G4 A3 E4 C4 E4 A3 E4 C4 E4 F3 C4 A3 C4 F3 C4 A3 C4 G3 D4 B3 D4 G3 D4 B3 D4") },
  ]),

  // ---- hub: jaunty, mod, a spring in the step ----
  hub: track(124, [
    { wave: "square", gain: 0.11, env: E_LEAD, seq: S("E4 - G4 A4 - G4 E4 - C5 - B4 G4 - A4 - - E4 - G4 A4 - C5 B4 - A4 - G4 - E4 - - -") },
    { wave: "triangle", gain: 0.13, env: E_BASS, seq: S("A2 - A2 - E3 - - - F2 - F2 - C3 - - - G2 - G2 - D3 - - - A2 - E3 - A2 - - -") },
    { wave: "noise", gain: 0.12, seq: D("k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h") },
  ]),

  // ---- ambient zone themes ----
  amb_cold: track(80, [
    { wave: "triangle", gain: 0.10, env: E_PAD, seq: S("A2 - - - - - - - E3 - - - - - - - F2 - - - - - - - C3 - - - - - - -") },
    { wave: "square", gain: 0.06, env: E_LEAD, seq: S("- - - - E5 - - - - - - - B4 - - - - - - - C5 - - - - - - - G4 - - -") },
  ]),
  amb_water: track(86, [
    { wave: "sine", gain: 0.12, env: E_PAD, seq: S("D3 - - - A3 - - - F3 - - - C3 - - - D3 - - - A3 - - - G2 - - - A2 - - -") },
    { wave: "triangle", gain: 0.07, env: E_PLUCK, seq: S("D4 - F4 - A4 - F4 - - - - - C5 - A4 - D4 - F4 - A4 - - - G4 - E4 - A3 - - -") },
  ]),
  amb_forest: track(104, [
    { wave: "triangle", gain: 0.11, env: E_BASS, seq: S("E2 - E2 - B2 - - - C3 - C3 - G2 - - - D3 - - - A2 - - - E2 - - - B2 - - -") },
    { wave: "square", gain: 0.07, env: E_PLUCK, seq: S("E4 G4 - E4 B4 - G4 - C5 - B4 - G4 - E4 - D5 - B4 - G4 - - - E4 - - - B4 - - -") },
  ]),
  amb_dark: track(72, [
    { wave: "sawtooth", gain: 0.08, env: E_PAD, seq: S("A2 - - - - - - - G2 - - - - - - - F2 - - - - - - - E2 - - - - - - -") },
    { wave: "square", gain: 0.05, env: E_LEAD, seq: S("- - - - - - A4 - - - - - - - C5 - - - - - - - B4 - - - - - - - G#4 -") },
  ]),
  amb_moon: track(70, [
    { wave: "sine", gain: 0.13, env: E_PAD, seq: S("C3 - - - - - - - G3 - - - - - - - A2 - - - - - - - F3 - - - - - - -") },
    { wave: "triangle", gain: 0.06, env: E_PLUCK, seq: S("- - C5 - - - E5 - - - G5 - - - E5 - - - A4 - - - C5 - - - G4 - - - - -") },
  ]),
  // yeti woods: mossy, hushed, faintly bouncy — distant stomps on the kick
  amb_yeti: track(84, [
    { wave: "triangle", gain: 0.11, env: E_PAD, seq: S("E2 - - - - - - - B2 - - - - - - - G2 - - - - - - - D3 - - - - - - -") },
    { wave: "square", gain: 0.06, env: E_PLUCK, seq: S("E4 - B4 - - - E4 - G4 - D5 - - - G4 - A4 - E5 - - - A4 - B4 - F#5 - - - B4 -") },
    { wave: "noise", gain: 0.07, seq: D("k . . . . . . . . . . . . . . . k . . . . . . . k . . . . . . .") },
  ]),
  amb_temple: track(100, [
    { wave: "triangle", gain: 0.12, env: E_BASS, seq: S("D3 - - - A2 - - - B2 - - - F#3 - - - G2 - - - D3 - - - A2 - E3 - F#2 - - -") },
    { wave: "square", gain: 0.07, env: E_LEAD, seq: S("D4 - A4 - F#4 - A4 - B4 - D5 - F#4 - - - G4 - B4 - D5 - - - A4 - F#4 - D4 - - -") },
  ]),

  // ---- crimp battle tracks (energetic, drums) ----
  // tutorial: a relaxed, jazzy practice groove (its own tune, not the hub theme)
  crimp_tutorial: track(116, [
    { wave: "square", gain: 0.10, env: E_LEAD, seq: S("C5 - E5 - G5 - E5 - A4 - C5 - E5 - - - D5 - F5 - A5 - F5 - G4 - B4 - D5 - - -") },
    { wave: "triangle", gain: 0.13, env: E_BASS, seq: S("C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - D3 - A3 - D3 - A3 - G2 - D3 - G2 - D3 -") },
    { wave: "triangle", gain: 0.06, env: E_PLUCK, seq: S("E4 G4 C5 G4 E4 G4 C5 G4 C4 E4 A4 E4 C4 E4 A4 E4 D4 F4 A4 F4 D4 F4 A4 F4 D4 G4 B4 G4 D4 G4 B4 G4") },
    { wave: "noise", gain: 0.09, seq: D("k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h") },
  ]),
  crimp_jazz: track(140, [
    { wave: "square", gain: 0.11, env: E_LEAD, seq: S("C5 - D#5 F5 - F#5 G5 - A#5 - G5 F5 - D#5 - C5 G4 - A#4 C5 - D#5 - C5 - A#4 - G4 - F4 - -") },
    { wave: "triangle", gain: 0.13, env: E_BASS, seq: S("C3 - G3 - C3 - A#2 - F3 - C4 - F3 - D#3 - G3 - D4 - G3 - F3 - C3 - G3 - C3 - G3 -") },
    { wave: "noise", gain: 0.12, seq: D("k . h k s . h . k h . k s . h k k . h k s . h . k h . k s . h h") },
  ]),
  crimp_gregg: track(118, [
    { wave: "square", gain: 0.11, env: E_LEAD, seq: S("D4 - - F4 - G4 - A4 - - C5 - A4 - G4 - F4 - - A4 - C5 - D5 - C5 - A4 - G4 - F4") },
    { wave: "sawtooth", gain: 0.12, env: E_BASS, seq: S("D2 - D2 - A2 - - - F2 - F2 - C3 - - - G2 - G2 - D3 - - - D2 - A2 - D2 - - -") },
    { wave: "noise", gain: 0.12, seq: D("k . . h s . h . k . k h s . h . k . . h s . h . k . k h s . h h") },
  ]),
  crimp_crackfox: track(156, [
    { wave: "square", gain: 0.10, env: E_PLUCK, seq: S("E5 F5 E5 D5 E5 G5 A5 G5 E5 D5 C5 D5 E5 - B4 - E5 F5 E5 D5 E5 A5 G5 A5 B5 - A5 - E5 - - -") },
    { wave: "triangle", gain: 0.13, env: E_BASS, seq: S("E2 E2 B2 E2 C3 C3 G2 C3 D3 D3 A2 D3 E2 B2 E2 - E2 E2 B2 E2 A2 A2 E2 A2 B2 B2 F#2 B2 E2 - - -") },
    { wave: "noise", gain: 0.12, seq: D("k h k h s h k h k h k h s h k h k h s h k h s h k h s h k h s h") },
  ]),
  crimp_nana: track(128, [
    { wave: "sawtooth", gain: 0.10, env: E_LEAD, seq: S("A4 - C5 - E5 - C5 - A4 - G#4 - B4 - G#4 - A4 - C5 - E5 - F5 - E5 - C5 - B4 - A4 -") },
    { wave: "triangle", gain: 0.13, env: E_BASS, seq: S("A2 - A2 - E3 - - - F2 - F2 - C3 - - - E2 - E2 - B2 - - - A2 - E3 - A2 - - -") },
    { wave: "noise", gain: 0.12, seq: D("k . h . s . h . k . h k s . h . k . h . s . h . k k h . s . h h") },
  ]),
  crimp_moon: track(92, [
    { wave: "triangle", gain: 0.12, env: E_LEAD, seq: S("C5 - - E5 - - G5 - - E5 - - C5 - - - A4 - - C5 - - E5 - - C5 - - A4 - - -") },
    { wave: "sine", gain: 0.12, env: E_PAD, seq: S("C3 - - - G2 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - C3 - - -") },
    { wave: "noise", gain: 0.08, seq: D("k . . . . . s . . . . . . . s . k . . . . . s . . . . . k . s .") },
  ]),
  crimp_tony: track(150, [
    { wave: "square", gain: 0.11, env: E_LEAD, seq: S("D5 - A4 D5 F5 - D5 A5 - F5 D5 - A4 - D5 - E5 - B4 E5 G5 - E5 B5 - G5 E5 - B4 - E5 -") },
    { wave: "sawtooth", gain: 0.12, env: E_BASS, seq: S("D2 - D2 - A2 - D2 - F2 - C3 - A2 - D2 - E2 - E2 - B2 - E2 - G2 - D3 - B2 - E2 -") },
    { wave: "triangle", gain: 0.08, env: E_PLUCK, seq: S("D4 A4 F4 A4 D4 A4 F4 A4 F4 C5 A4 C5 F4 C5 A4 C5 E4 B4 G4 B4 E4 B4 G4 B4 G4 D5 B4 D5 G4 D5 B4 D5") },
    { wave: "noise", gain: 0.12, seq: D("k . k h s . h k k . k h s . h . k h k h s . h k k . k h s h h h") },
  ]),

  // the Eel Pit: gaslit dread — vibrato square over a low saw, barrel-organ plucks
  amb_eel: track(78, [
    { wave: "sawtooth", gain: 0.08, env: E_PAD, seq: S("E2 - - - - - - - C2 - - - - - - - D2 - - - - - - - B1 - - - - - - -") },
    { wave: "square", gain: 0.06, env: E_LEAD, seq: S("- - E4 - - F4 - - - E4 - - - - - - - - D4 - - D#4 - - - D4 - - - - - -") },
    { wave: "triangle", gain: 0.05, env: E_PLUCK, seq: S("- - - - - - - - E3 G3 B3 - - - - - - - - - - - - - D3 F3 A3 - - - - -") },
  ]),
  // mirror world: every phrase answered by its own inversion
  amb_mirror: track(70, [
    { wave: "sine", gain: 0.12, env: E_PAD, seq: S("A2 - - - - - - - E3 - - - - - - - F3 - - - - - - - C3 - - - - - - -") },
    { wave: "square", gain: 0.06, env: E_PLUCK, seq: S("A4 - C5 - E5 - - - E4 - C4 - A3 - - - F4 - A4 - C5 - - - C4 - A3 - F3 - - -") },
  ]),

  // hitcher crimp: music-hall oom-pah gone wrong — chromatic vibrato lead
  crimp_hitcher: track(134, [
    { wave: "square", gain: 0.11, env: E_LEAD, seq: S("E4 - F4 - E4 - D#4 - E4 - G4 - F#4 - F4 - E4 - B4 - A#4 - A4 - G#4 - A4 - B4 - E4 -") },
    { wave: "sawtooth", gain: 0.13, env: E_BASS, seq: S("E2 - E3 - E2 - E3 - A1 - A2 - A1 - A2 - C2 - C3 - C2 - C3 - B1 - B2 - B1 - B2 -") },
    { wave: "noise", gain: 0.12, seq: D("k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . h h") },
  ]),
  // flighty zeus: two leads trading two-bar phrases — square Lance, saw Harold
  crimp_zeus: track(126, [
    { wave: "square", gain: 0.10, env: E_LEAD, seq: S("A4 - C5 - E5 - C5 - A4 - E5 - C5 - A4 - - - - - - - - - - - - - - - - - - -") },
    { wave: "sawtooth", gain: 0.09, env: E_LEAD, seq: S("- - - - - - - - - - - - - - - - E5 - C5 - A4 - C5 - E5 - A4 - E4 - A4 - -") },
    { wave: "triangle", gain: 0.13, env: E_BASS, seq: S("A2 - A2 - E3 - - - F2 - F2 - C3 - - - D3 - D3 - A2 - - - E3 - E2 - A2 - - -") },
    { wave: "noise", gain: 0.12, seq: D("k . h h k . h . k . h h k . h . k . h h k . h . k . h h k s h h") },
  ]),

  // yeti crimp: a stomp-chant — saw bass on the ones, horn-ish unison lead
  crimp_yeti: track(100, [
    { wave: "triangle", gain: 0.12, env: E_LEAD, seq: S("E4 - - - G4 - E4 - B4 - - - A4 - G4 - E4 - - - G4 - A4 - B4 - A4 - G4 - E4 -") },
    { wave: "sawtooth", gain: 0.13, env: E_BASS, seq: S("E2 - - - - - - - E2 - - - B2 - - - C3 - - - - - - - B2 - - - A2 - - -") },
    { wave: "triangle", gain: 0.07, env: E_PLUCK, seq: S("E3 - B3 - E3 - B3 - E3 - B3 - E3 - B3 - C3 - G3 - C3 - G3 - B2 - F#3 - B2 - F#3 -") },
    { wave: "noise", gain: 0.12, seq: D("k . . . s . . . k . . . s . h . k . . . s . . . k . k . s . h h") },
  ]),
};
