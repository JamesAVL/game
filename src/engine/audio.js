// audio.js — a small chiptune synth + step sequencer and SFX bank.
// Everything is generated with oscillators/noise at runtime: no samples.

let actx = null;
let master = null;
let muted = false;

function ensure() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = 0.5;
    master.connect(actx.destination);
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}

export function unlockAudio() { ensure(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export function toggleMute() { setMuted(!muted); return muted; }
export function isMuted() { return muted; }

function midiFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }

// ---- one synth voice with an ADSR amp envelope --------------------------
function voice(type, freq, t, dur, peak, env = {}) {
  if (!actx) return;
  const { a = 0.005, d = 0.04, s = 0.6, r = 0.06 } = env;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.linearRampToValueAtTime(peak * s, t + a + d);
  const rel = t + Math.max(dur, a + d);
  g.gain.setValueAtTime(peak * s, rel);
  g.gain.exponentialRampToValueAtTime(0.0001, rel + r);
  o.connect(g); g.connect(master);
  o.start(t);
  o.stop(rel + r + 0.02);
}

let noiseBuf = null;
function noise(t, dur, peak, hp = 1) {
  if (!actx) return;
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = actx.createBufferSource(); src.buffer = noiseBuf;
  const g = actx.createGain();
  const f = actx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 800 * hp;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur);
}

// ---------------------------------------------------------------------------
// SFX
// ---------------------------------------------------------------------------
export const Sfx = {
  blip() { ensure(); voice("square", 660, actx.currentTime, 0.03, 0.10, { a: 0.001, d: 0.02, s: 0.2, r: 0.02 }); },
  confirm() { ensure(); const t = actx.currentTime; voice("square", 523, t, 0.05, 0.18); voice("square", 784, t + 0.05, 0.09, 0.18); },
  cancel() { ensure(); const t = actx.currentTime; voice("square", 392, t, 0.06, 0.16); voice("square", 262, t + 0.05, 0.1, 0.16); },
  move() { ensure(); voice("triangle", 330, actx.currentTime, 0.04, 0.08); },
  pickup() { ensure(); const t = actx.currentTime;[523, 659, 784, 1046].forEach((f, i) => voice("square", f, t + i * 0.05, 0.08, 0.2)); },
  hit() { ensure(); const t = actx.currentTime; voice("square", 880, t, 0.04, 0.22, { a: 0.001, d: 0.03, s: 0.1, r: 0.03 }); noise(t, 0.03, 0.05, 4); },
  perfect() { ensure(); const t = actx.currentTime; voice("square", 1318, t, 0.05, 0.22); voice("triangle", 1760, t, 0.05, 0.12); },
  miss() { ensure(); const t = actx.currentTime; voice("sawtooth", 180, t, 0.12, 0.18, { a: 0.001, d: 0.08, s: 0.2, r: 0.05 }); noise(t, 0.08, 0.08, 1); },
  win() { ensure(); const t = actx.currentTime;[523, 659, 784, 1046, 1318].forEach((f, i) => voice("square", f, t + i * 0.09, 0.18, 0.22)); },
  lose() { ensure(); const t = actx.currentTime;[440, 392, 330, 262].forEach((f, i) => voice("sawtooth", f, t + i * 0.12, 0.2, 0.2)); },
  warp() { ensure(); const t = actx.currentTime; for (let i = 0; i < 10; i++) voice("triangle", 300 + i * 120, t + i * 0.03, 0.06, 0.12); },
};

// ---------------------------------------------------------------------------
// Music sequencer
//   track = { bpm, loop, voices: [{ wave, gain, env, seq: [midi|0, ...] }] }
//   one seq entry == one 16th-note step.
// ---------------------------------------------------------------------------
let current = null;
let timer = null;
let stepIdx = 0;
let nextTime = 0;

export function playMusic(track) {
  ensure();
  stopMusic();
  current = track;
  stepIdx = 0;
  nextTime = actx.currentTime + 0.06;
  const stepDur = 60 / track.bpm / 4;
  const tick = () => {
    if (!current) return;
    const ahead = actx.currentTime + 0.12;
    while (nextTime < ahead) {
      const len = Math.max(...current.voices.map((v) => v.seq.length));
      for (const v of current.voices) {
        const n = v.seq[stepIdx % v.seq.length];
        if (n && n > 0) {
          // sustain across following 0s up to a cap
          let hold = 1;
          while (v.seq[(stepIdx + hold) % v.seq.length] === 0 && hold < 8) hold++;
          if (v.wave === "noise") noise(nextTime, stepDur * 0.6, (v.gain || 0.2));
          else voice(v.wave || "square", midiFreq(n), nextTime, stepDur * hold * 0.9, (v.gain || 0.16), v.env);
        }
      }
      stepIdx++;
      nextTime += stepDur;
      if (!current.loop && stepIdx >= len) { stopMusic(); return; }
    }
  };
  tick();
  timer = setInterval(tick, 25);
}

export function stopMusic() {
  if (timer) { clearInterval(timer); timer = null; }
  current = null;
}

export function musicPlaying() { return !!current; }
export function audioTime() { return actx ? actx.currentTime : performance.now() / 1000; }
