// Composes social posters and trailer frames from the real game renderer.
(() => {
  const W = window.PipQuest;
  const gameCanvas = document.getElementById('game');
  const URL_TEXT = 'PIPS-QUEST.VERCEL.APP';
  const C = { gold: '#ffd23f', orange: '#ff8a3a', teal: '#2fc4b2', tealDark: '#0c3d38', ink: '#2a1206', white: '#ffffff', sky: '#163a5c' };

  // ---------- helpers ----------
  function mk(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g];
  }
  function outlined(g, str, x, y, col, scale = 1, align = 'center', outline = C.ink, shadow = 'rgba(0,0,0,0.35)') {
    const o = Math.max(1, Math.ceil(scale / 2));
    if (shadow) Gfx.text(g, str, x, y + o * 2, shadow, scale, align, null);
    for (let dx = -o; dx <= o; dx += o) for (let dy = -o; dy <= o; dy += o)
      if (dx || dy) Gfx.text(g, str, x + dx, y + dy, outline, scale, align, null);
    Gfx.text(g, str, x, y, col, scale, align, null);
  }
  // Rounded "pixel" pill: corners cut by u.
  function pill(g, x, y, w, h, fill, edge, u = 1) {
    g.fillStyle = edge; g.fillRect(x + u, y, w - 2 * u, h); g.fillRect(x, y + u, w, h - 2 * u);
    g.fillStyle = fill; g.fillRect(x + 2 * u, y + u, w - 4 * u, h - 2 * u); g.fillRect(x + u, y + 2 * u, w - 2 * u, h - 4 * u);
  }
  function labelPill(g, str, cx, y, scale, fill, edge, textCol, u = 1, padX = 4, padY = 2) {
    const tw = Gfx.textWidth(str, scale), w = tw + padX * 2 * scale, h = 7 * scale + padY * 2 * scale;
    pill(g, Math.round(cx - w / 2), y, w, h, fill, edge, u);
    Gfx.text(g, str, cx, y + padY * scale, textCol, scale, 'center', null);
    return h;
  }
  function chips(g, labels, cx, y) {
    const ws = labels.map(s => Gfx.textWidth(s) + 8), gap = 4, total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = Math.round(cx - total / 2);
    labels.forEach((s, i) => { pill(g, x, y, ws[i], 11, 'rgba(20,16,40,0.78)', '#ffffff'); Gfx.text(g, s, x + ws[i] / 2, y + 2, '#ffffff', 1, 'center', null); x += ws[i] + gap; });
  }
  function spr(g, s, x, y, k = 1, left = false) { g.drawImage(left ? s.l : s.r, Math.round(x), Math.round(y), s.w * k, s.h * k); }
  function upscale(base, s) { const [c, g] = mk(base.width * s, base.height * s); g.drawImage(base, 0, 0, c.width, c.height); return c; }

  function scene(g, w, h, theme, groundY, camX = 0) {
    const bg = Gfx.backgroundLayers(theme);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, bg.sky[0]); gr.addColorStop(1, bg.sky[1]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const oy = groundY - 192;
    for (const l of bg.layers) {
      const off = Math.floor(camX * l.f) % Gfx.BG_W;
      for (let x = -off; x < w; x += Gfx.BG_W) g.drawImage(l.c, x, oy);
    }
    for (let x = 0; x < w; x += 16) {
      g.drawImage(Gfx.tile(theme, 'groundTop').r, x, groundY);
      for (let y = groundY + 16; y < h; y += 16) g.drawImage(Gfx.tile(theme, 'ground').r, x, y);
    }
  }
  function coinArc(g, x, y, n, rise) {
    for (let i = 0; i < n; i++) spr(g, Gfx.coin(1), x + i * 16, y - Math.round(Math.sin(Math.PI * i / (n - 1)) * rise));
  }
  function blockRow(g, x, y, pattern, theme = 'meadow') {
    [...pattern].forEach((ch, i) => g.drawImage(Gfx.tile(theme, ch === '?' ? 'mystery' : 'brick', 0).r, x + i * 16, y));
  }
  const FEATURES = ['4 LEVELS', 'BOSS FIGHT', 'PHONE + PC'];
  const CTA = 'PLAY FREE: ' + URL_TEXT;

  // ---------- posters ----------
  function posterPortrait() { // 1080x1350 (4:5)
    const [c, g] = mk(216, 270), gy = 234;
    scene(g, 216, 270, 'meadow', gy, 40);
    outlined(g, "PIP'S", 108, 12, C.gold, 5);
    outlined(g, 'QUEST', 108, 50, C.orange, 5);
    outlined(g, 'A PIXEL PLATFORMER', 108, 92, C.white, 1, 'center', C.sky, null);
    chips(g, FEATURES, 108, 104);
    spr(g, Gfx.buzzer(0), 20, 128);
    coinArc(g, 62, 134, 6, 10);
    blockRow(g, 70, 150, 'B?B?B');
    spr(g, Gfx.hero(true, 4, 'normal'), 110, 166, 2);
    spr(g, Gfx.grumble(0), 34, gy - 16);
    spr(g, Gfx.beetle(0), 182, gy - 16, 1, true);
    labelPill(g, CTA, 108, 244, 1, C.teal, C.tealDark, C.white, 1, 4, 3);
    return upscale(c, 5);
  }

  function posterBoss() { // 1080x1080 (1:1)
    const [c, g] = mk(216, 216), gy = 184;
    scene(g, 216, 216, 'castle', gy, 0);
    outlined(g, "PIP'S QUEST", 108, 8, C.gold, 3);
    outlined(g, 'CAN YOU BEAT', 108, 38, C.white, 2);
    outlined(g, 'KING GRUMBLOR?', 108, 57, '#ff6a4a', 2);
    [[24, 96], [70, 120], [150, 100], [190, 130], [110, 150], [40, 160]].forEach(([x, y], i) => { g.fillStyle = i % 2 ? '#ff7a3a' : '#ffb060'; g.fillRect(x, y, 1, 1); });
    spr(g, Gfx.boss(0, false), 136, gy - 64, 2, true);
    spr(g, Gfx.bossFire(0), 118, gy - 46, 1, true);
    spr(g, Gfx.hero(true, 4, 'fire'), 30, gy - 78, 2);
    spr(g, Gfx.fireball(1), 72, gy - 50); spr(g, Gfx.fireball(3), 90, gy - 34);
    labelPill(g, CTA, 108, 194, 1, C.teal, C.tealDark, C.white, 1, 4, 3);
    return upscale(c, 5);
  }

  function posterStory() { // 1080x1920 (9:16), key content kept clear of the app's top/bottom bars
    const [c, g] = mk(216, 384), gy = 300;
    scene(g, 216, 384, 'meadow', gy, 120);
    outlined(g, "PIP'S", 108, 62, C.gold, 5);
    outlined(g, 'QUEST', 108, 100, C.orange, 5);
    outlined(g, 'A PIXEL PLATFORMER', 108, 142, C.white, 1, 'center', C.sky, null);
    outlined(g, 'IN YOUR BROWSER', 108, 152, C.white, 1, 'center', C.sky, null);
    chips(g, FEATURES, 108, 166);
    spr(g, Gfx.buzzer(1), 26, 176);
    spr(g, Gfx.comet(0), 180, 190);
    coinArc(g, 62, 190, 6, 12);
    blockRow(g, 70, 206, 'B?B?B');
    spr(g, Gfx.hero(true, 4, 'normal'), 110, 222, 2);
    spr(g, Gfx.grumble(0), 30, gy - 16);
    spr(g, Gfx.beetle(1), 172, gy - 16, 1, true);
    labelPill(g, 'PLAY FREE', 108, 309, 2, C.teal, C.tealDark, C.white, 2, 6, 3);
    outlined(g, URL_TEXT, 108, 346, C.white, 1, 'center', C.ink, null);
    return upscale(c, 5);
  }

  function posterLinkedIn() { // 1200x627 (link / landscape post)
    const [c, g] = mk(400, 209), gy = 177;
    scene(g, 400, 209, 'meadow', gy, 260);
    outlined(g, "PIP'S", 110, 16, C.gold, 5);
    outlined(g, 'QUEST', 110, 56, C.orange, 5);
    outlined(g, 'A PIXEL PLATFORMER FOR YOUR BROWSER', 110, 100, C.white, 1, 'center', C.sky, null);
    chips(g, FEATURES, 110, 114);
    labelPill(g, CTA, 110, 186, 1, C.teal, C.tealDark, C.white, 1, 4, 3);
    spr(g, Gfx.buzzer(0), 360, 44);
    coinArc(g, 248, 74, 6, 10);
    blockRow(g, 256, 92, 'B?B?B');
    spr(g, Gfx.hero(true, 4, 'normal'), 296, 108, 2);
    spr(g, Gfx.grumble(0), 240, gy - 16);
    spr(g, Gfx.beetle(0), 360, gy - 16, 1, true);
    return upscale(c, 3);
  }

  // ---------- trailer ----------
  const FPS = 30;
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const HELD = ['ArrowRight', 'ArrowLeft', 'ShiftLeft', 'Space', 'KeyX'];
  const releaseAll = () => HELD.forEach(k => key(k, false));
  let bot = {}, events = [], curTime = 0;

  // The studio drives the game; sounds are logged with their time for the soundtrack.
  Sound.init = () => {}; Sound.music = () => {}; Sound.stopMusic = () => {};
  Sound.play = name => {
    const last = events[events.length - 1];
    if (last && last[1] === name && curTime - last[0] < 0.04) return;
    events.push([curTime, name]);
  };
  // Pip can't be hurt while filming.
  Player.prototype.hurt = function () {};
  Player.prototype.die = function () {};

  const solid = ch => '#BC?MSEXPp'.includes(ch) && ch !== ' ';
  function botDecide() {
    const p = W.player;
    if (bot.hold > 0 && --bot.hold === 0) key('Space', false);
    if (!p.onGround || bot.hold > 0) return;
    const tx = Math.floor((p.x + p.w + 8) / TS), feet = Math.floor((p.y + p.h + 2) / TS), body = Math.floor((p.y + p.h - 4) / TS);
    const wall = [0, 1].some(d => solid((W.tiles[body - d] || [])[tx] || ' '));
    let gap = true;
    for (let y = feet; y < 14; y++) { const ch = W.tiles[y][tx]; if (solid(ch) || ch === '-') { gap = false; break; } }
    const foe = W.ents.some(e => e.isEnemy && e.harmful && e.active && e.x > p.x && e.x - (p.x + p.w) < 30 && Math.abs(e.y + e.h - (p.y + p.h)) < 20);
    const cx = Math.floor((p.x + p.w / 2) / TS);
    let block = false;
    for (let r = Math.floor(p.y / TS) - 4; r < Math.floor(p.y / TS); r++) for (const x of [cx, cx + 1]) if ('?MS'.includes((W.tiles[r] || [])[x] || ' ')) block = true;
    if (wall || gap || foe || block) { key('Space', true); bot.hold = (wall || gap) ? 24 : 13; }
  }
  function bossDecide() {
    const p = W.player; bot.t = (bot.t || 0) + 1;
    if (bot.t % 14 === 0) key('KeyX', true); else if (bot.t % 14 === 3) key('KeyX', false);
    if (bot.hold > 0 && --bot.hold === 0) key('Space', false);
    const fireNear = W.ents.some(e => e instanceof BossFire && e.x > p.x && e.x - p.x < 64);
    if (p.onGround && !bot.hold && fireNear) { key('Space', true); bot.hold = 16; }
  }
  function startLevel(lvl, tileX, power, run, topRow) {
    releaseAll();
    W.lives = 3; W.carryPower = power; W._warp(lvl, tileX);
    if (topRow !== undefined) { W.player.y = topRow * TS - W.player.h; W.player.onGround = true; }
    bot = { hold: 0 };
    if (run) key('ShiftLeft', true);
    key('ArrowRight', true);
  }
  function play(n, decide, f) {
    for (let i = 0; i < n; i++) { curTime = (f + i / n) / FPS; if (decide) decide(); W._step(1); }
  }

  const SEGS = [
    { len: 75, cap: 'PIXEL PLATFORMER', sub: 'PLAY IN YOUR BROWSER',
      setup() { releaseAll(); W.state = 'title'; W.stateT = 0; W.hiscore = 61850; W.maxLevel = 0; },
      tick(f) { play(2, null, f); } },
    { len: 150, cap: 'RUN. JUMP. STOMP.', sub: 'COLLECT PAW COINS',
      setup() { W.score = 0; W.gems = 0; startLevel(0, null, 1, true); },
      tick(f) { play(2, botDecide, f); } },
    { len: 90, cap: 'CRYSTAL CAVES', sub: 'FIND SECRET BLOCKS',
      setup() { startLevel(1, null, 1, true); },
      tick(f) { play(2, botDecide, f); } },
    { len: 90, cap: 'SKY ISLANDS', sub: 'RIDE MOVING CLOUDS',
      setup() { startLevel(2, 127, 1, false, 11); },
      tick(f) { play(2, botDecide, f); } },
    { len: 135, cap: 'BEAT THE BOSS!', sub: 'KING GRUMBLOR AWAITS',
      setup() {
        releaseAll(); W.carryPower = 2; W._warp(3, 172); bot = { hold: 0, t: 0 };
        const boss = W.ents.find(e => e instanceof Boss); if (boss) boss.hp = 4;
      },
      tick(f) { play(2, bossDecide, f); } },
    { len: 120, cap: 'PLAY FREE NOW', sub: 'PHONE + TABLET + PC',
      setup() { releaseAll(); W.state = 'victory'; W.stateT = 70; W.fx = []; W.carryPower = 2; W.score = 61850; W.hiscore = 61850; events.push([curTime, 'clear']); },
      tick(f) { play(2, null, f); if (W.stateT > 100) W.stateT = 76; } },
  ];
  let start = 0; SEGS.forEach(s => { s.start = start; start += s.len; });
  const TOTAL = start;
  const SONGS = [
    { name: 'title', start: 0, end: SEGS[1].start / FPS },
    { name: 'meadow', start: SEGS[1].start / FPS, end: SEGS[4].start / FPS },
    { name: 'boss', start: SEGS[4].start / FPS, end: SEGS[5].start / FPS },
    { name: 'title', start: SEGS[5].start / FPS + 0.9, end: TOTAL / FPS },
  ];

  // ---------- layouts ----------
  function background(w, h, ground) {
    const [c, g] = mk(w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120a2c'); gr.addColorStop(1, '#3a1450');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.5})`; const z = rnd() < 0.2 ? 10 : 5; g.fillRect(Math.floor(rnd() * w / 5) * 5, Math.floor(rnd() * h / 5) * 5, z, z); }
    if (ground) for (let x = 0; x < w; x += 80) { g.drawImage(Gfx.tile('meadow', 'groundTop').r, x, h - 160, 80, 80); g.drawImage(Gfx.tile('meadow', 'ground').r, x, h - 80, 80, 80); }
    return c;
  }
  const LAYOUTS = {
    'reel-vertical-1080x1920': {
      w: 1080, h: 1920, win: { x: 0, y: 610, w: 1080, h: 605 },
      logo(g, f) {
        const bob = Math.round(Math.sin(f * 0.12) * 8);
        outlined(g, "PIP'S", 540, 220 + bob, C.gold, 20);
        outlined(g, 'QUEST', 540, 380 + bob, C.orange, 20);
        spr(g, Gfx.coin(f / 4), 70, 300 + bob, 6); spr(g, Gfx.coin(f / 4 + 3), 914, 300 + bob, 6);
      },
      capY: 1290, capScale: 9, subY: 1390, subScale: 5, urlY: 1480, urlScale: 6, ground: true,
    },
    'feed-square-1080x1080': {
      w: 1080, h: 1080, win: { x: 0, y: 190, w: 1080, h: 605 },
      logo(g, f) {
        const bob = Math.round(Math.sin(f * 0.12) * 5);
        outlined(g, "PIP'S QUEST", 540, 52 + bob, C.gold, 12);
      },
      capY: 835, capScale: 8, subY: 915, subScale: 5, urlY: 970, urlScale: 5, ground: false,
    },
  };
  let L = null, out = null, og = null, frame = 0, segIndex = -1, bg = null;
  const easeOutBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);

  function compose(f) {
    const seg = SEGS[segIndex], local = f - seg.start;
    og.drawImage(bg, 0, 0);
    L.logo(og, f);
    const { x, y, w, h } = L.win;
    og.fillStyle = C.teal; og.fillRect(x, y - 12, w, 12); og.fillRect(x, y + h, w, 12);
    og.fillStyle = C.tealDark; og.fillRect(x, y - 16, w, 4); og.fillRect(x, y + h + 12, w, 4);
    og.drawImage(gameCanvas, x, y, w, h);
    const fadeIn = Math.max(0, 1 - local / 6);
    const fadeOut = segIndex < SEGS.length - 1 ? Math.max(0, 1 - (seg.len - 1 - local) / 5) : 0;
    const a = Math.max(fadeIn, fadeOut);
    if (a > 0) { og.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; og.fillRect(x, y, w, h); }
    const k = Math.min(1, local / 10), e = easeOutBack(k);
    og.globalAlpha = Math.min(1, local / 5);
    outlined(og, seg.cap, 540, L.capY + Math.round((1 - e) * 50), C.white, L.capScale);
    outlined(og, seg.sub, 540, L.subY + Math.round((1 - e) * 30), C.gold, L.subScale);
    og.globalAlpha = 1;
    const pulse = segIndex === SEGS.length - 1 ? Math.round(Math.sin(local * 0.25) * 4) : 0;
    const tw = Gfx.textWidth(URL_TEXT, L.urlScale), pw = tw + 12 * L.urlScale + pulse * 4, ph = 7 * L.urlScale + 6 * L.urlScale;
    pill(og, Math.round(540 - pw / 2), L.urlY - pulse, pw, ph + pulse * 2, C.teal, C.tealDark, L.urlScale);
    Gfx.text(og, URL_TEXT, 540, L.urlY + 3 * L.urlScale, C.white, L.urlScale, 'center', null);
  }

  window.Studio = {
    ready: true,
    posters: {
      'instagram-post-1080x1350': posterPortrait,
      'instagram-linkedin-square-1080x1080': posterBoss,
      'instagram-story-1080x1920': posterStory,
      'linkedin-landscape-1200x627': posterLinkedIn,
    },
    poster(name) { return this.posters[name]().toDataURL('image/png').split(',')[1]; },
    layouts: Object.keys(LAYOUTS),
    startVideo(name) {
      L = LAYOUTS[name];
      [out, og] = mk(L.w, L.h);
      bg = background(L.w, L.h, L.ground);
      window.__reseed(20261115);
      frame = 0; segIndex = -1; events = []; curTime = 0;
      return { width: L.w, height: L.h, fps: FPS, frames: TOTAL };
    },
    nextFrame() {
      if (frame >= TOTAL) { releaseAll(); return null; }
      const idx = SEGS.findIndex(s => frame >= s.start && frame < s.start + s.len);
      if (idx !== segIndex) { segIndex = idx; curTime = frame / FPS; SEGS[idx].setup(); }
      SEGS[idx].tick(frame);
      compose(frame);
      frame++;
      return out.toDataURL('image/png').split(',')[1];
    },
    async audio() {
      const buf = await Sound.renderOffline(SONGS, TOTAL / FPS, events);
      const ch = buf.numberOfChannels, len = buf.length;
      const view = new DataView(new ArrayBuffer(44 + len * ch * 2));
      const str = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
      str(0, 'RIFF'); view.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true);
      view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * ch * 2, true);
      view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, len * ch * 2, true);
      const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
      let o = 44;
      for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
        const v = Math.max(-1, Math.min(1, chans[c][i])); view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
      }
      const u8 = new Uint8Array(view.buffer);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return { wav: btoa(s), sfx: events.length };
    },
  };
})();
