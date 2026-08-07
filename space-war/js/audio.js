// ===================== AUDIO ENGINE (procedural, no external files) =====================
// Everything here is synthesized with the Web Audio API so the game needs zero sound assets.

let actx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let muted = false;

try { muted = localStorage.getItem('spacewar_muted') === '1'; } catch (e) { /* ignore */ }

function ensureAudio() {
  if (actx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  actx = new Ctx();
  masterGain = actx.createGain();
  masterGain.gain.value = muted ? 0 : 0.8;
  masterGain.connect(actx.destination);
  musicGain = actx.createGain();
  musicGain.gain.value = 0.4;
  musicGain.connect(masterGain);
  sfxGain = actx.createGain();
  sfxGain.gain.value = 0.9;
  sfxGain.connect(masterGain);
}

function unlockAudio() {
  ensureAudio();
  if (actx && actx.state === 'suspended') actx.resume();
}

function isMuted() { return muted; }
function toggleMute() {
  muted = !muted;
  ensureAudio();
  if (masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, actx.currentTime, 0.05);
  try { localStorage.setItem('spacewar_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
  return muted;
}

// ---- low-level synth helpers ----
function tone(freq, opts = {}) {
  ensureAudio();
  if (!actx || actx.state === 'suspended') return;
  const t0 = actx.currentTime + (opts.delay || 0);
  const dur = opts.dur || 0.2;
  const osc = actx.createOscillator();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
  const g = actx.createGain();
  const vol = opts.vol ?? 0.25;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(opts = {}) {
  ensureAudio();
  if (!actx || actx.state === 'suspended') return;
  const dur = opts.dur || 0.3;
  const bufferSize = Math.max(1, Math.floor(actx.sampleRate * dur));
  const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
  const data = buffer.getChannelData(0);
  const decay = opts.decay || 2;
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, decay);
  const src = actx.createBufferSource();
  src.buffer = buffer;
  const filter = actx.createBiquadFilter();
  filter.type = opts.filterType || 'lowpass';
  filter.frequency.value = opts.filterFreq || 1200;
  const g = actx.createGain();
  g.gain.value = opts.vol ?? 0.4;
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start(actx.currentTime + (opts.delay || 0));
}

// ---- sound effects ----
const sfx = {
  shoot() { tone(720, { type: 'square', dur: 0.09, vol: 0.16, slideTo: 180 }); },
  enemyShoot() { tone(300, { type: 'sawtooth', dur: 0.12, vol: 0.13, slideTo: 90 }); },
  explosion() {
    noiseBurst({ dur: 0.5, decay: 2.2, filterFreq: 900, vol: 0.45 });
    tone(90, { type: 'triangle', dur: 0.4, vol: 0.28, slideTo: 28 });
  },
  hit() { noiseBurst({ dur: 0.15, decay: 3, filterFreq: 2500, vol: 0.22 }); },
  playerHurt() { noiseBurst({ dur: 0.2, decay: 2, filterFreq: 1400, vol: 0.28 }); },
  jump() { tone(300, { type: 'triangle', dur: 0.22, vol: 0.18, slideTo: 600 }); },
  coin() { tone(880, { type: 'square', dur: 0.08, vol: 0.15 }); tone(1320, { type: 'square', dur: 0.12, vol: 0.14, delay: 0.06 }); },
  scrap() { tone(220, { type: 'square', dur: 0.07, vol: 0.12, slideTo: 140 }); },
  partFound() { [523, 659, 784, 1046].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.22, vol: 0.2, delay: i * 0.09 })); },
  missionComplete() { [660, 880, 1108].forEach((f, i) => tone(f, { type: 'sine', dur: 0.3, vol: 0.2, delay: i * 0.11 })); },
  dig() { noiseBurst({ dur: 0.16, decay: 2.6, filterFreq: 600, vol: 0.16 }); },
  repairTick() { tone(500, { type: 'square', dur: 0.05, vol: 0.09, slideTo: 700 }); },
  repairDone() { [392, 523, 659].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.25, vol: 0.18, delay: i * 0.1 })); },
  uiClick() { tone(500, { type: 'square', dur: 0.04, vol: 0.1 }); },
  buy() { tone(660, { type: 'square', dur: 0.06, vol: 0.14, slideTo: 990 }); },
  denied() { tone(160, { type: 'sawtooth', dur: 0.18, vol: 0.14, slideTo: 90 }); },
  enterVehicle() { tone(200, { type: 'sawtooth', dur: 0.25, vol: 0.14, slideTo: 340 }); },
  exitVehicle() { tone(340, { type: 'sawtooth', dur: 0.2, vol: 0.14, slideTo: 180 }); },
  launch() {
    noiseBurst({ dur: 1.6, decay: 1.1, filterFreq: 700, vol: 0.42 });
    tone(50, { type: 'sawtooth', dur: 1.5, vol: 0.32, slideTo: 18 });
    tone(140, { type: 'square', dur: 0.9, vol: 0.16, slideTo: 40, delay: 0.05 });
  },
  arrive() { [440, 554, 659, 880].forEach((f, i) => tone(f, { type: 'sine', dur: 0.3, vol: 0.18, delay: i * 0.09 })); },
  knockedOut() { tone(220, { type: 'sawtooth', dur: 0.7, vol: 0.22, slideTo: 60 }); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.4, vol: 0.24, delay: i * 0.14 })); },
};

// ---- sustained rocket engine rumble (loops for the whole flight, not just a blip) ----
let engineNoiseSrc = null, engineFilter = null, engineGain = null, engineOsc = null, engineOscGain = null;

function ensureEngineLoop() {
  if (engineNoiseSrc || !actx) return;
  const bufferSize = actx.sampleRate * 2;
  const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  engineNoiseSrc = actx.createBufferSource();
  engineNoiseSrc.buffer = buffer;
  engineNoiseSrc.loop = true;
  engineFilter = actx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 260;
  engineGain = actx.createGain();
  engineGain.gain.value = 0.0001;
  engineNoiseSrc.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(sfxGain);
  engineNoiseSrc.start();

  engineOsc = actx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 42;
  engineOscGain = actx.createGain();
  engineOscGain.gain.value = 0.0001;
  engineOsc.connect(engineOscGain);
  engineOscGain.connect(sfxGain);
  engineOsc.start();
}

function startEngineRumble() {
  ensureAudio();
  if (!actx) return;
  ensureEngineLoop();
  const t = actx.currentTime;
  engineGain.gain.cancelScheduledValues(t);
  engineGain.gain.setTargetAtTime(0.15, t, 0.4);
  engineOscGain.gain.cancelScheduledValues(t);
  engineOscGain.gain.setTargetAtTime(0.09, t, 0.4);
}

function stopEngineRumble() {
  if (!engineGain || !actx) return;
  const t = actx.currentTime;
  engineGain.gain.cancelScheduledValues(t);
  engineGain.gain.setTargetAtTime(0.0001, t, 0.5);
  engineOscGain.gain.cancelScheduledValues(t);
  engineOscGain.gain.setTargetAtTime(0.0001, t, 0.5);
}

// ---- ambient music (looping generative chord pads, distinct per scene) ----
const MUSIC_SCENES = {
  base: { chords: [[220, 277, 330], [196, 246, 294], [220, 277, 330], [164, 220, 262]], tempo: 3.2, wave: 'sine', bass: 110 },
  planet: { chords: [[196, 247, 294], [175, 220, 262], [196, 247, 330], [233, 294, 349]], tempo: 2.6, wave: 'triangle', bass: 98 },
  space: { chords: [[110, 164, 220], [98, 146, 196], [110, 164, 246], [123, 196, 261]], tempo: 2.0, wave: 'sawtooth', bass: 55 },
};

let currentMusicScene = null;
let musicTimer = null;
let musicChordIndex = 0;

function stopMusic() {
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  currentMusicScene = null;
}

function scheduleChord() {
  const cfg = MUSIC_SCENES[currentMusicScene];
  if (!cfg || !actx) return;
  const chord = cfg.chords[musicChordIndex % cfg.chords.length];
  const t0 = actx.currentTime;
  const dur = cfg.tempo;
  chord.forEach((freq) => {
    const osc = actx.createOscillator();
    osc.type = cfg.wave;
    osc.frequency.value = freq;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.1);
  });
  const bassOsc = actx.createOscillator();
  bassOsc.type = 'sine';
  bassOsc.frequency.value = cfg.bass * (musicChordIndex % 2 === 0 ? 1 : 0.75);
  const bg = actx.createGain();
  bg.gain.setValueAtTime(0.0001, t0);
  bg.gain.linearRampToValueAtTime(0.08, t0 + 0.06);
  bg.gain.linearRampToValueAtTime(0.0001, t0 + dur * 0.9);
  bassOsc.connect(bg);
  bg.connect(musicGain);
  bassOsc.start(t0);
  bassOsc.stop(t0 + dur);

  musicChordIndex++;
  musicTimer = setTimeout(scheduleChord, dur * 1000);
}

function playMusicScene(sceneName) {
  ensureAudio();
  if (!actx || currentMusicScene === sceneName) return;
  if (musicTimer) clearTimeout(musicTimer);
  currentMusicScene = sceneName;
  musicChordIndex = 0;
  scheduleChord();
}
