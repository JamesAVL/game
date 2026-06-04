// midi.js — optional WebMIDI input. A connected MIDI keyboard/pad can play the
// crimp lanes: note-on/off are mapped to the same directional actions the
// keyboard and on-screen controls feed, so nothing downstream needs to know
// the input came from MIDI. Entirely best-effort — absent API/permission/device
// it silently does nothing.
//
// Mapping: a note's pitch class is folded into four lanes low->high, matching
// the left->up->down->right lane order, so any octave works:
//   C C# D | D# E F | F# G G# | A A# B   ->   left | up | down | right

import { Input } from "./core.js";

const DIRS = ["left", "up", "down", "right"];
function noteAction(note) { return DIRS[Math.floor((note % 12) / 3)]; }

let access = null;
let enabled = false;
const held = new Map(); // midi note -> action, so note-off releases the right one

function onMessage(ev) {
  const [status, note, vel] = ev.data;
  const cmd = status & 0xf0;
  if (cmd === 0x90 && vel > 0) {
    const a = noteAction(note);
    held.set(note, a);
    Input._touchDown(a);
  } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
    const a = held.get(note);
    if (a) { Input._touchUp(a); held.delete(note); }
  }
}

function attach(input) { if (input) input.onmidimessage = onMessage; }

export function initMidi() {
  if (enabled || typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
    return Promise.resolve(false);
  }
  return navigator.requestMIDIAccess().then(
    (acc) => {
      access = acc;
      enabled = true;
      for (const input of acc.inputs.values()) attach(input);
      acc.onstatechange = (e) => {
        if (e.port && e.port.type === "input" && e.port.state === "connected") attach(e.port);
      };
      return true;
    },
    () => false, // permission denied / unavailable -> stay silent
  );
}

export function midiStatus() {
  if (!enabled || !access) return { enabled: false, inputs: 0, names: [] };
  const names = [...access.inputs.values()].map((i) => i.name);
  return { enabled: true, inputs: access.inputs.size, names };
}
