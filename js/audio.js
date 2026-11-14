// Synthesized sound effects and chiptune music (WebAudio, no asset files).
const Sound = (() => {
  let ctx = null, master, sfxBus, musBus, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('pip_muted') === '1'; } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = 0.22; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('pip_muted', muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02);
    return muted;
  }

  function tone(freq, dur, type = 'square', vol = 0.3, slideTo = 0, delay = 0, bus = sfxBus) {
    if (!ctx) return;
    const t = ctx.currentTime + tOff + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol = 0.3, freq = 1200, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + tOff + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function seq(notes, step, type = 'square', vol = 0.22) {
    notes.forEach((n, i) => { if (n) tone(noteFreq(n), step * 1.1, type, vol, 0, i * step); });
  }

  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteFreq(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n);
    if (!m) return 0;
    let semi = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const midi = (parseInt(m[3], 10) + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  const SFX = {
    jump:      () => tone(260, 0.16, 'square', 0.18, 620),
    bigjump:   () => tone(190, 0.2, 'square', 0.18, 520),
    gem:       () => { tone(1046, 0.07, 'square', 0.16); tone(1568, 0.22, 'square', 0.16, 0, 0.07); },
    stomp:     () => { tone(520, 0.1, 'square', 0.22, 140); noise(0.06, 0.15, 900); },
    bump:      () => tone(140, 0.09, 'triangle', 0.45, 70),
    brick:     () => { noise(0.28, 0.45, 1800); tone(120, 0.12, 'triangle', 0.3, 60); },
    appear:    () => seq(['G4', 'C5', 'E5', 'G5', 'C6'], 0.045, 'square', 0.14),
    power:     () => seq(['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.05, 'square', 0.16),
    fire:      () => tone(900, 0.09, 'square', 0.12, 260),
    kick:      () => tone(700, 0.07, 'square', 0.2, 300),
    oneup:     () => seq(['E5', 'G5', 'E6', 'C6', 'D6', 'G6'], 0.09, 'square', 0.16),
    hurt:      () => seq(['A5', 'E5', 'A4', 'E4'], 0.06, 'square', 0.18),
    die:       () => seq(['B4', 'F5', null, 'F5', 'F5', 'E5', 'D5', 'C5', null, 'G4', null, 'C4'], 0.11, 'square', 0.2),
    clear:     () => { seq(['C5', 'E5', 'G5', 'C6', null, 'G5', 'C6', null, null, 'D6', 'E6', 'G6'], 0.1, 'square', 0.18); seq(['C3', null, 'G3', null, 'C4', null, 'G3', null, 'B3', null, 'C4'], 0.1, 'triangle', 0.3); },
    gameover:  () => seq(['C5', null, 'G4', null, 'E4', null, 'A4', 'B4', 'A4', 'G#4', 'A#4', 'G#4', 'G4', 'F4', 'G4'], 0.13, 'triangle', 0.35),
    pause:     () => seq(['E5', 'C5', 'E5', 'C5'], 0.05, 'square', 0.14),
    spring:    () => tone(180, 0.35, 'sine', 0.35, 1100),
    checkpoint:() => seq(['C5', 'G5', 'C6', 'E6'], 0.07, 'square', 0.15),
    tick:      () => tone(1400, 0.03, 'square', 0.08),
    bosshit:   () => { tone(300, 0.25, 'sawtooth', 0.25, 60); noise(0.2, 0.3, 700); },
    bossdie:   () => { for (let i = 0; i < 6; i++) { noise(0.3, 0.35, 600 + i * 200, i * 0.15); tone(200 - i * 20, 0.3, 'sawtooth', 0.2, 40, i * 0.15); } },
    bossfire:  () => { tone(400, 0.25, 'sawtooth', 0.12, 120); noise(0.2, 0.12, 500); },
    portal:    () => seq(['C6', 'G5', 'E6', 'C6', 'G6', 'E6', 'C7'], 0.06, 'triangle', 0.3),
    lava:      () => noise(0.4, 0.3, 400),
    select:    () => tone(880, 0.06, 'square', 0.14),
  };

  function play(name) { if (ctx && SFX[name]) SFX[name](); }

  // ---------- Music sequencer ----------
  // Each token = one 8th-note step. "_" holds the previous note, "." is a rest.
  const SONGS = {
    meadow: { bpm: 144,
      lead: 'C5 E5 G5 E5 A5 G5 E5 . D5 F5 A5 F5 G5 _ . . E5 G5 C6 G5 A5 G5 E5 C5 D5 E5 F5 D5 C5 _ . . ' +
            'A4 C5 E5 C5 F5 E5 C5 . B4 D5 G5 D5 E5 _ . . C5 E5 A5 G5 F5 E5 D5 C5 B4 C5 D5 B4 C5 _ _ .',
      bass: 'C3 . G3 . C3 . G3 . F2 . C3 . G2 . D3 . C3 . G3 . A2 . E3 . F2 . G2 . C3 . G2 . ' +
            'A2 . E3 . F2 . C3 . G2 . D3 . C3 . G2 . A2 . E3 . F2 . C3 . G2 . G2 . C3 . C3 .' },
    cave: { bpm: 112,
      lead: 'A4 . C5 . E5 . D5 C5 B4 . G4 . A4 _ _ . E5 . G5 . F5 . E5 D5 C5 . D5 . E5 _ _ . ' +
            'F5 . E5 . D5 . C5 . B4 . C5 . D5 _ . . A4 . B4 . C5 . B4 . G#4 _ _ . A4 _ _ .',
      bass: 'A2 . . A2 . . E2 . F2 . . F2 . . G2 . A2 . . A2 . . E2 . F2 . . G2 . . E2 . ' +
            'D2 . . D2 . . A2 . G2 . . G2 . . C3 . F2 . . F2 . . E2 . E2 . . E2 . . A2 .' },
    sky: { bpm: 152,
      lead: 'G5 . E5 G5 C6 . B5 A5 G5 _ E5 . D5 E5 G5 . A5 . F5 A5 D6 . C6 B5 A5 _ G5 . E5 F5 G5 . ' +
            'E5 . C5 E5 G5 . F5 E5 D5 _ C5 . D5 E5 F5 . G5 A5 B5 C6 D6 B5 G5 _ C6 _ _ . . . . .',
      bass: 'C3 G3 C4 G3 E3 G3 C4 G3 F2 C3 F3 C3 G2 D3 G3 D3 D3 A3 D4 A3 F3 A3 D4 A3 G2 D3 G3 D3 G2 B2 D3 G3 ' +
            'A2 E3 A3 E3 C3 G3 C4 G3 F2 C3 F3 C3 G2 D3 G3 D3 F2 C3 F3 C3 G2 D3 G3 B3 C3 G3 C4 G3 C3 . C3 .' },
    castle: { bpm: 126,
      lead: 'D5 . . F5 E5 . D5 . C#5 . . E5 D5 . A4 . D5 . F5 . A5 . G5 F5 E5 _ _ . C#5 _ _ . ' +
            'Bb4 . D5 . F5 . E5 D5 A4 . C#5 . E5 . D5 C#5 D5 . F5 . G5 . A5 Bb5 A5 _ G5 . F5 E5 D5 _ _ .',
      bass: 'D2 D3 D2 D3 D2 D3 D2 D3 A1 A2 A1 A2 A1 A2 A1 A2 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 A1 A2 C#2 C#3 ' +
            'Bb1 Bb2 Bb1 Bb2 G1 G2 G1 G2 A1 A2 A1 A2 F2 F3 F2 F3 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 D2 . D2 .' },
    boss: { bpm: 168,
      lead: 'E5 E5 . E5 G5 . E5 . D#5 D#5 . D#5 F#5 . D#5 . E5 E5 . E5 B5 . A5 G5 F#5 . G5 . F#5 . D#5 . ',
      bass: 'E2 E3 E2 E3 E2 E3 E2 E3 B1 B2 B1 B2 B1 B2 B1 B2 C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 D#2 D#3' },
    star: { bpm: 190,
      lead: 'C6 . C6 . C6 . A5 C6 . C6 A5 C6 . D6 C6 . B5 . B5 . B5 . G5 B5 . B5 G5 B5 . C6 B5 .',
      bass: 'F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 F2 F3 E2 E3 E2 E3 E2 E3 E2 E3 G2 G3 G2 G3 G2 G3 G2 G3' },
    title: { bpm: 120,
      lead: 'E5 . G5 . C6 _ . . B5 . A5 . G5 _ . . A5 . F5 . D5 . G5 _ E5 _ _ . . . . .',
      bass: 'C3 . . . E3 . . . F2 . . . G2 . . . F2 . . . D3 . . . C3 . . . G2 . . .' },
  };

  const parsed = {};
  function parse(str) {
    return str.trim().split(/\s+/).map(t => t === '.' ? null : t === '_' ? '_' : noteFreq(t));
  }
  for (const k in SONGS) parsed[k] = { bpm: SONGS[k].bpm, lead: parse(SONGS[k].lead), bass: parse(SONGS[k].bass) };

  let current = null, step = 0, nextTime = 0, timer = null;

  function voiceLen(arr, i) { let n = 1; while (arr[(i + n) % arr.length] === '_' && n < arr.length) n++; return n; }

  function scheduleNote(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function tick() {
    if (!ctx || !current) return;
    const song = parsed[current];
    const stepDur = 60 / song.bpm / 2;
    while (nextTime < ctx.currentTime + 0.12) {
      const li = step % song.lead.length, bi = step % song.bass.length;
      const ln = song.lead[li], bn = song.bass[bi];
      if (ln && ln !== '_') scheduleNote(ln, nextTime, stepDur * voiceLen(song.lead, li) * 0.95, 'square', 0.35);
      if (bn && bn !== '_') scheduleNote(bn, nextTime, stepDur * voiceLen(song.bass, bi) * 0.9, 'triangle', 0.6);
      nextTime += stepDur; step++;
    }
  }

  function music(name) {
    if (!ctx) return;
    if (current === name) return;
    stopMusic();
    if (!parsed[name]) return;
    current = name; step = 0; nextTime = ctx.currentTime + 0.05;
    musBus.gain.cancelScheduledValues(ctx.currentTime);
    musBus.gain.setValueAtTime(0.22, ctx.currentTime);
    timer = setInterval(tick, 25);
    tick();
  }

  function stopMusic() {
    current = null;
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx) {
      musBus.gain.cancelScheduledValues(ctx.currentTime);
      musBus.gain.setValueAtTime(0, ctx.currentTime);
    }
  }

  // ---------- Offline rendering (used to make trailer soundtracks) ----------
  // parts: [{ name, start, end }] songs in seconds; events: [[seconds, sfxName], ...]
  let tOff = 0;
  function renderOffline(parts, seconds, events = [], rate = 48000) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const saved = [ctx, master, sfxBus, musBus, noiseBuf];
    const off = new OAC(2, Math.ceil(seconds * rate), rate);
    ctx = off;
    master = off.createGain(); master.connect(off.destination);
    master.gain.setValueAtTime(0.55, 0);
    master.gain.setValueAtTime(0.55, Math.max(0, seconds - 1.2));
    master.gain.linearRampToValueAtTime(0.0001, seconds);
    sfxBus = off.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musBus = off.createGain(); musBus.gain.value = 0.22; musBus.connect(master);
    noiseBuf = off.createBuffer(1, Math.floor(rate * 0.6), rate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    try {
      for (const part of parts) {
        const song = parsed[part.name];
        if (!song) continue;
        const stepDur = 60 / song.bpm / 2;
        for (let step = 0, t = part.start; t < part.end - 0.02; step++, t += stepDur) {
          const li = step % song.lead.length, bi = step % song.bass.length;
          const ln = song.lead[li], bn = song.bass[bi];
          const clip = d => Math.max(0.03, Math.min(d, part.end - t));
          if (ln && ln !== '_') scheduleNote(ln, t, clip(stepDur * voiceLen(song.lead, li) * 0.95), 'square', 0.35);
          if (bn && bn !== '_') scheduleNote(bn, t, clip(stepDur * voiceLen(song.bass, bi) * 0.9), 'triangle', 0.6);
        }
      }
      for (const [time, name] of events) if (SFX[name] && time < seconds) { tOff = time; SFX[name](); }
    } finally {
      tOff = 0;
      [ctx, master, sfxBus, musBus, noiseBuf] = saved;
    }
    return off.startRendering();
  }

  return { init, play, music, stopMusic, toggleMute, renderOffline, get muted() { return muted; }, get song() { return current; } };
})();
