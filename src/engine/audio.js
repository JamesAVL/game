// audio.js — a small chiptune synth + step sequencer and SFX bank.
// Everything is generated with oscillators/noise at runtime: no samples.
//
// Signal path:
//   music voices -> musicFilter -> musicGain -\
//   SFX voices ------------------------------- busIn -> comp -> limiter -> master -> destination
//                                              busIn -> delay (feedback) -> comp
//                                              busIn -> reverb (convolver) -> comp
//                                              master -> analyser (beat-reactive tap)
// The music sub-bus (filter + gain) lets the crimp duck the backing track on a
// miss and brighten it on a hot combo WITHOUT touching SFX. The analyser drives
// beat-reactive visuals (the renderer pulses bloom to the mix).
// Voices are warmed with a lowpass sweep, light unison detune and a subtle
// vibrato; drums are a proper kick/snare/hat kit.

let actx = null;
let master = null;      // final output gain
let busIn = null;       // shared bus (music sub-bus + SFX both land here)
let comp = null;        // glue compressor
let limiter = null;     // brickwall-ish limiter before output
let musicFilter = null; // music-only tone control (crimp brightens with combo)
let musicGain = null;   // music-only level (crimp ducks on a miss)
let analyser = null;    // taps the master mix for beat-reactive visuals
const MASTER_VOL = 0.42;
let muted = false;

function makeImpulse(seconds, decay) {
  const rate = actx.sampleRate, len = Math.max(1, Math.floor(rate * seconds));
  const buf = actx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ensure() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = MASTER_VOL;
    master.connect(actx.destination);

    // brickwall-ish limiter catches the loudest transients before output
    limiter = actx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.002; limiter.release.value = 0.1;
    limiter.connect(master);

    // glue compressor tames peaks from the added wet sends / unison voices
    comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    comp.connect(limiter);

    busIn = actx.createGain();
    busIn.gain.value = 1;
    busIn.connect(comp);

    // music sub-bus: a tone control + level that the crimp automates (brighten
    // on combo, duck on miss) without affecting SFX, which go straight to busIn.
    musicGain = actx.createGain(); musicGain.gain.value = 1;
    musicFilter = actx.createBiquadFilter();
    musicFilter.type = "lowpass"; musicFilter.frequency.value = 18000; musicFilter.Q.value = 0.7;
    musicFilter.connect(musicGain); musicGain.connect(busIn);

    // beat-reactive analyser taps the final mix (drives bloom pulse in renderer)
    analyser = actx.createAnalyser();
    analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.6;
    master.connect(analyser);

    // feedback delay send (adds space + rhythmic tail)
    const delay = actx.createDelay(1.0);
    delay.delayTime.value = 0.26;
    const fb = actx.createGain(); fb.gain.value = 0.32;
    delay.connect(fb); fb.connect(delay);
    const delaySend = actx.createGain(); delaySend.gain.value = 0.16;
    busIn.connect(delaySend); delaySend.connect(delay); delay.connect(comp);

    // reverb send (short algorithmic impulse)
    const conv = actx.createConvolver();
    conv.buffer = makeImpulse(1.6, 2.6);
    const revSend = actx.createGain(); revSend.gain.value = 0.14;
    busIn.connect(revSend); revSend.connect(conv); conv.connect(comp);
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}

export function unlockAudio() { ensure(); }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : MASTER_VOL; }
export function toggleMute() { setMuted(!muted); return muted; }
export function isMuted() { return muted; }

// ---- beat-reactive readout ------------------------------------------------
// Cheap envelope-followed energy from the master analyser, sampled at most once
// per audio-clock tick. `bass` (low bins) drives the bloom pulse; `level` is
// the overall mix energy. Both are 0..1 and smooth (fast attack, slow release).
const _reactive = { level: 0, bass: 0 };
let _aData = null, _aT = -1;
export function getReactive() {
  if (!actx || !analyser || actx.state !== "running") return _reactive;
  const now = actx.currentTime;
  if (now === _aT) return _reactive; // already sampled this instant
  _aT = now;
  if (!_aData) _aData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(_aData);
  const nb = _aData.length, bassBins = Math.max(1, nb >> 3);
  let bass = 0, all = 0;
  for (let i = 0; i < nb; i++) { all += _aData[i]; if (i < bassBins) bass += _aData[i]; }
  bass = bass / bassBins / 255; all = all / nb / 255;
  const follow = (cur, tgt) => (tgt > cur ? cur + (tgt - cur) * 0.5 : cur + (tgt - cur) * 0.12);
  _reactive.bass = follow(_reactive.bass, bass);
  _reactive.level = follow(_reactive.level, all);
  return _reactive;
}

// ---- interactive music bus (driven by the crimp) --------------------------
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
// brightness 0..1 -> lowpass cutoff (log) 1500..16000 Hz
export function setMusicBrightness(x) {
  if (!musicFilter) return;
  const f = 1500 * Math.pow(16000 / 1500, clamp01(x));
  musicFilter.frequency.setTargetAtTime(f, actx.currentTime, 0.08);
}
// momentary sidechain-style dip of the backing track (e.g. on a fluffed note)
export function duckMusic(depth = 0.5, dur = 0.22) {
  if (!musicGain) return;
  const now = actx.currentTime, g = musicGain.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(Math.max(0.0001, g.value), now);
  g.linearRampToValueAtTime(1 - clamp01(depth), now + 0.02);
  g.linearRampToValueAtTime(1.0, now + dur);
}
// reset the music sub-bus to neutral (called when a new track starts)
function resetMusicBus() {
  if (!musicGain) return;
  const now = actx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(1, now);
  musicFilter.frequency.cancelScheduledValues(now);
  musicFilter.frequency.setValueAtTime(18000, now);
}

export function audioDebug() {
  return {
    state: actx ? actx.state : "none",
    musicGain: musicGain ? musicGain.gain.value : null,
    cutoff: musicFilter ? musicFilter.frequency.value : null,
    reactive: { ...getReactive() },
  };
}

function midiFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }

// ---- one synth voice: unison oscillators -> lowpass sweep -> ADSR amp -------
function voice(type, freq, t, dur, peak, env = {}, dest = null) {
  if (!actx) return;
  const out = dest || busIn;
  const { a = 0.005, d = 0.04, s = 0.6, r = 0.06,
          uni = 2, det = 7, vib = 0.004, cutMul = 5 } = env;
  // amp envelope
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.linearRampToValueAtTime(peak * s, t + a + d);
  const rel = t + Math.max(dur, a + d);
  g.gain.setValueAtTime(peak * s, rel);
  g.gain.exponentialRampToValueAtTime(0.0001, rel + r);

  // warm lowpass with a gentle downward sweep (kills the harsh "beep")
  const lp = actx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.7;
  const c0 = Math.min(13000, Math.max(900, freq * cutMul * 2));
  const c1 = Math.min(12000, Math.max(700, freq * cutMul));
  lp.frequency.setValueAtTime(c0, t);
  lp.frequency.exponentialRampToValueAtTime(c1, t + a + d + 0.08);
  g.connect(lp); lp.connect(out);

  const end = rel + r + 0.02;

  // shared vibrato LFO
  let lfoGain = null;
  if (vib > 0) {
    const lfo = actx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 5.2;
    lfoGain = actx.createGain(); lfoGain.gain.value = freq * vib;
    lfo.connect(lfoGain); lfo.start(t); lfo.stop(end);
  }

  const n = Math.max(1, uni);
  for (let k = 0; k < n; k++) {
    const o = actx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (n > 1) o.detune.setValueAtTime((k - (n - 1) / 2) * det, t);
    if (lfoGain) lfoGain.connect(o.frequency);
    const og = actx.createGain(); og.gain.value = 1 / n;  // keep summed level constant
    o.connect(og); og.connect(g);
    o.start(t); o.stop(end);
  }
}

// ---- noise helpers + drum kit -------------------------------------------
let noiseBuf = null;
function noiseSrc() {
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = actx.createBufferSource(); s.buffer = noiseBuf; return s;
}

function noiseHit(t, dur, peak, ftype, ffreq, Q, dest = null) {
  if (!actx) return;
  const s = noiseSrc();
  const f = actx.createBiquadFilter(); f.type = ftype; f.frequency.value = ffreq; if (Q) f.Q.value = Q;
  const g = actx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || busIn);
  s.start(t); s.stop(t + dur);
}

// legacy generic noise (used by some SFX): a highpass burst
function noise(t, dur, peak, hp = 1, dest = null) { noiseHit(t, dur, peak, "highpass", 800 * hp, 0.7, dest); }

function kick(t, peak, dest = null) {
  if (!actx) return;
  const o = actx.createOscillator(); o.type = "sine";
  const g = actx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(dest || busIn);
  o.start(t); o.stop(t + 0.2);
  noiseHit(t, 0.02, peak * 0.4, "lowpass", 2400, 0.5, dest); // beater click
}

function snare(t, peak, dest = null) {
  noiseHit(t, 0.13, peak * 0.9, "bandpass", 1800, 1.1, dest);
  const o = actx.createOscillator(); o.type = "triangle";
  const g = actx.createGain(); o.frequency.value = 190;
  g.gain.setValueAtTime(peak * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g); g.connect(dest || busIn);
  o.start(t); o.stop(t + 0.12);
}

function hat(t, peak, dest = null) { noiseHit(t, 0.04, peak * 0.6, "highpass", 7000, 0.9, dest); }

// ---------------------------------------------------------------------------
// SFX
// ---------------------------------------------------------------------------
export const Sfx = {
  blip() { ensure(); voice("square", 660, actx.currentTime, 0.03, 0.10, { a: 0.001, d: 0.02, s: 0.2, r: 0.02, uni: 1, vib: 0 }); },
  confirm() { ensure(); const t = actx.currentTime; voice("square", 523, t, 0.05, 0.18); voice("square", 784, t + 0.05, 0.09, 0.18); },
  cancel() { ensure(); const t = actx.currentTime; voice("square", 392, t, 0.06, 0.16); voice("square", 262, t + 0.05, 0.1, 0.16); },
  move() { ensure(); voice("triangle", 330, actx.currentTime, 0.04, 0.08, { uni: 1 }); },
  pickup() { ensure(); const t = actx.currentTime;[523, 659, 784, 1046].forEach((f, i) => voice("square", f, t + i * 0.05, 0.08, 0.2)); },
  hit() { ensure(); const t = actx.currentTime; voice("square", 880, t, 0.04, 0.22, { a: 0.001, d: 0.03, s: 0.1, r: 0.03 }); snare(t, 0.06); },
  perfect() { ensure(); const t = actx.currentTime; voice("square", 1318, t, 0.05, 0.22); voice("triangle", 1760, t, 0.05, 0.12); },
  miss() { ensure(); const t = actx.currentTime; voice("sawtooth", 180, t, 0.12, 0.18, { a: 0.001, d: 0.08, s: 0.2, r: 0.05 }); noise(t, 0.08, 0.08, 1); },
  win() { ensure(); const t = actx.currentTime;[523, 659, 784, 1046, 1318].forEach((f, i) => voice("square", f, t + i * 0.09, 0.18, 0.22)); },
  lose() { ensure(); const t = actx.currentTime;[440, 392, 330, 262].forEach((f, i) => voice("sawtooth", f, t + i * 0.12, 0.2, 0.2)); },
  warp() { ensure(); const t = actx.currentTime; for (let i = 0; i < 10; i++) voice("triangle", 300 + i * 120, t + i * 0.03, 0.06, 0.12, { uni: 1 }); },
};

// ---------------------------------------------------------------------------
// Music sequencer
//   track = { bpm, loop, voices: [{ wave, gain, env, seq: [midi|0, ...] }] }
//   one seq entry == one 16th-note step.
//   A "noise" voice is the drum kit: seq values 1=kick, 3=hat, else=snare.
// ---------------------------------------------------------------------------
let current = null;
let timer = null;
let stepIdx = 0;
let nextTime = 0;

export function playMusic(track) {
  ensure();
  stopMusic();
  resetMusicBus();
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
          if (v.wave === "noise") {
            const peak = v.gain || 0.2;
            if (n === 1) kick(nextTime, peak, musicFilter);
            else if (n === 3) hat(nextTime, peak, musicFilter);
            else snare(nextTime, peak, musicFilter);
          } else {
            // sustain across following 0s up to a cap
            let hold = 1;
            while (v.seq[(stepIdx + hold) % v.seq.length] === 0 && hold < 8) hold++;
            voice(v.wave || "square", midiFreq(n), nextTime, stepDur * hold * 0.9, (v.gain || 0.16), v.env, musicFilter);
          }
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
