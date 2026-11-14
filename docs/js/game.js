// Main loop, game states, input, camera, world rendering and HUD.
(() => {
  const VIEW_W = 400, VIEW_H = 224;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W; canvas.height = VIEW_H;

  function resize() {
    // Fit inside the body's side gutters and the root's safe-area padding.
    const bs = getComputedStyle(document.body), rs = getComputedStyle(document.documentElement);
    const aw = window.innerWidth - (parseFloat(bs.paddingLeft) || 0) - (parseFloat(bs.paddingRight) || 0);
    const ah = window.innerHeight - (parseFloat(rs.paddingTop) || 0) - (parseFloat(rs.paddingBottom) || 0);
    let s = Math.min(aw / VIEW_W, ah / VIEW_H);
    if (Math.floor(s) >= 2 && Math.floor(s) / s > 0.85) s = Math.floor(s);
    canvas.style.width = Math.floor(VIEW_W * s) + 'px';
    canvas.style.height = Math.floor(VIEW_H * s) + 'px';
  }
  window.addEventListener('resize', resize); resize();

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---------------- Input ----------------
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowUp: 'up',
    KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyJ: 'run',
    Enter: 'start', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
  };
  const held = { key: {}, touch: {}, pad: {} };
  let latch = {};
  function press(name) { latch[name] = true; }

  window.addEventListener('keydown', e => {
    Sound.init();
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (!e.repeat) press(k === 'up' ? 'jump' : k);
    held.key[k === 'up' ? 'jump' : k] = true;
    if (k === 'up') held.key.up = true;
  });
  window.addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (!k) return;
    held.key[k === 'up' ? 'jump' : k] = false;
    if (k === 'up') held.key.up = false;
  });
  window.addEventListener('blur', () => { held.key = {}; });

  // ---- Touch controls ----
  // Each finger is tracked on its own; sliding a thumb from one pad to another switches buttons
  // without lifting, and two fingers can hold a direction and A/B at the same time.
  // Touch support is checked at load and again on the first real touch, because some browsers
  // (and DevTools device mode before a reload) only report a touchscreen once it is used.
  let IS_TOUCH = false;
  function enableTouch() {
    if (IS_TOUCH) return;
    IS_TOUCH = true; document.body.classList.add('touch'); resize();
  }
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0 ||
      (window.matchMedia && matchMedia('(pointer: coarse)').matches)) enableTouch();
  window.addEventListener('touchstart', enableTouch, { passive: true, capture: true });
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.pointerType === 'pen') enableTouch(); }, true);
  if (window.matchMedia) {
    const coarse = matchMedia('(pointer: coarse)');
    if (coarse.addEventListener) coarse.addEventListener('change', e => { if (e.matches) enableTouch(); });
  }
  const touchEl = document.getElementById('touch');
  const pads = Array.from(touchEl.querySelectorAll('.pad'));
  const fingers = new Map();
  function padAt(x, y) {
    let best = null, bestD = Infinity;
    for (const b of pads) {
      const r = b.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < r.width * 0.8 && d < bestD) { bestD = d; best = b.dataset.k; }
    }
    return best;
  }
  function syncPads() {
    const on = new Set(fingers.values());
    for (const b of pads) {
      const k = b.dataset.k, down = on.has(k);
      if (down && !held.touch[k]) press(k);
      held.touch[k] = down;
      b.classList.toggle('on', down);
    }
  }
  touchEl.addEventListener('pointerdown', e => {
    if (!e.target.classList.contains('pad')) return;
    e.preventDefault(); Sound.init(); keepAwake();
    fingers.set(e.pointerId, padAt(e.clientX, e.clientY)); syncPads();
  });
  touchEl.addEventListener('pointermove', e => {
    if (!fingers.has(e.pointerId)) return;
    e.preventDefault(); fingers.set(e.pointerId, padAt(e.clientX, e.clientY)); syncPads();
  });
  const lift = e => { if (fingers.delete(e.pointerId)) syncPads(); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => touchEl.addEventListener(t, lift));
  touchEl.addEventListener('contextmenu', e => e.preventDefault());

  document.getElementById('t-mute').addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); press('mute'); });
  document.getElementById('t-pause').addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); press('pause'); });
  const fsBtn = document.getElementById('t-fs');
  if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) { fsBtn.hidden = true; return; }
    Promise.resolve(req.call(el))
      .then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); })
      .catch(() => { fsBtn.hidden = true; });
  });

  canvas.addEventListener('pointerdown', () => { Sound.init(); keepAwake(); canvas.focus(); press('tap'); });

  // Keep the phone screen from dimming while playing (optional; ignored where unsupported).
  let wakeLock = null;
  function keepAwake() {
    if (wakeLock || !navigator.wakeLock || document.hidden) return;
    navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
  }

  let padPrev = {};
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && Array.from(pads).find(p => p);
    const cur = {};
    if (gp) {
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      cur.left = b(14) || ax < -0.4; cur.right = b(15) || ax > 0.4; cur.down = b(13) || ay > 0.6;
      cur.jump = b(0) || b(12); cur.run = b(1) || b(2) || b(3) || b(7); cur.start = b(9); cur.pause = false;
      for (const k in cur) if (cur[k] && !padPrev[k]) { press(k); Sound.init(); }
    }
    held.pad = cur; padPrev = cur;
  }

  function readInput() {
    pollPad();
    const h = k => !!(held.key[k] || held.touch[k] || held.pad[k]);
    const inp = {
      // On touch screens, holding a direction pad runs automatically.
      left: h('left'), right: h('right'), down: h('down'), up: h('up'), jump: h('jump'),
      run: h('run') || !!(held.touch.left || held.touch.right),
      jumpPressed: !!latch.jump, runPressed: !!latch.run, startPressed: !!latch.start, pausePressed: !!latch.pause,
      mutePressed: !!latch.mute, tapPressed: !!latch.tap, leftPressed: !!latch.left, rightPressed: !!latch.right,
    };
    latch = {};
    return inp;
  }
  const NO_INPUT = { left: false, right: false, down: false, jump: false, run: false };

  // ---------------- World ----------------
  const W = {
    state: 'title', paused: false, levelIndex: 0, startLevel: 0, score: 0, gems: 0, lives: 3, time: 0, timeTick: 0,
    level: null, tiles: null, ents: [], fx: [], player: null, camX: 0, viewW: VIEW_W, bumps: [], multi: {},
    checkpoint: null, stateT: 0, tick: 0, carryPower: 0, bossActive: false, clearPortal: null, tallyDone: 0,
    hiscore: store.get('pip_hiscore', 0), maxLevel: store.get('pip_maxlevel', 0),

    spawn(e) { this.ents.push(e); },
    addScore(n, x, y) { if (!n) return; this.score += n; if (x !== undefined) FX.text(this, x, y - 4, n); },
    addGem() {
      this.gems++; this.score += 200; Sound.play('gem');
      if (this.gems >= 100) { this.gems -= 100; this.oneUp(this.player.x + 6, this.player.y - 8); }
    },
    oneUp(x, y) { this.lives = Math.min(99, this.lives + 1); Sound.play('oneup'); FX.text(this, x, y - 4, '1UP', '#5dff8a'); },
    chainScore(p, e, base) {
      const idx = p.chain++;
      const x = e.x + e.w / 2, y = e.y;
      if (idx >= SCORE_CHAIN.length) this.oneUp(x, y);
      else this.addScore(Math.max(SCORE_CHAIN[idx], idx === 0 && base ? base : 0), x, y);
    },
    bumpTile(tx, ty) {
      const c = tileAt(this, tx, ty), p = this.player;
      const bump = () => this.bumps.push({ tx, ty, t: 0 });
      let active = true;
      switch (c) {
        case '?': this.tiles[ty][tx] = 'E'; bump(); FX.gemPop(this, tx * TS + 8, ty * TS - 4); this.addGem(); break;
        case 'C': {
          const key = tx + ',' + ty, n = (this.multi[key] || 0) + 1; this.multi[key] = n;
          bump(); FX.gemPop(this, tx * TS + 8, ty * TS - 4); this.addGem();
          if (n >= 8) this.tiles[ty][tx] = 'E';
          break;
        }
        case 'M': this.tiles[ty][tx] = 'E'; bump(); this.spawn(new Item(p.power === 0 ? 'berry' : 'bloom', tx, ty)); Sound.play('appear'); break;
        case 'S': this.tiles[ty][tx] = 'E'; bump(); this.spawn(new Item('comet', tx, ty)); Sound.play('appear'); break;
        case 'H': this.tiles[ty][tx] = 'E'; bump(); this.spawn(new Item('heart', tx, ty)); Sound.play('appear'); break;
        case 'B':
          if (p.big) { this.tiles[ty][tx] = ' '; FX.debris(this, tx, ty, Gfx.THEMES[this.level.theme].brick); this.addScore(50); Sound.play('brick'); }
          else { bump(); Sound.play('bump'); }
          break;
        default: Sound.play('bump'); active = false;
      }
      if (!active) return;
      const top = ty * TS, l = tx * TS, r = l + TS;
      for (const e of this.ents) {
        if (e.x + e.w <= l || e.x >= r || Math.abs(e.y + e.h - top) > 4) continue;
        if (e.isEnemy && e.harmful && e.active) {
          const sc = e.hitBy(this, 'bump', e.x + e.w / 2 < l + 8 ? -1 : 1);
          this.addScore(sc, e.x + e.w / 2, e.y);
        } else if (e.isItem && e.emerge <= 0 && e.kind !== 'bloom') {
          e.vy = -4; e.vx = (e.x + e.w / 2 < l + 8 ? -1 : 1) * Math.max(0.9, Math.abs(e.vx));
        }
      }
      if (tileAt(this, tx, ty - 1) === 'o') { this.tiles[ty - 1][tx] = ' '; FX.gemPop(this, tx * TS + 8, (ty - 1) * TS); this.addGem(); }
    },
    onPlayerDie() {
      this.state = 'dying'; this.stateT = 0; this.carryPower = 0;
      Sound.stopMusic(); Sound.play('die');
    },
    restoreMusic() { if (this.state === 'play') Sound.music(this.bossActive ? 'boss' : this.level.music); },
    levelComplete(portal) {
      this.state = 'clear'; this.stateT = 0; this.clearPortal = portal; this.tallyDone = 0;
      this.carryPower = this.player.power;
      Sound.stopMusic(); Sound.play('portal');
    },
    onBossStart() { this.bossActive = true; if (this.player.star <= 0) Sound.music('boss'); },
    onBossDefeated() {
      this.bossActive = false;
      for (const e of this.ents) if (e instanceof Portal && e.locked) {
        e.locked = false; FX.sparkle(this, e.x + 16, e.y + 24, 16, '#e8d0ff');
        FX.text(this, e.x + 16, e.y - 12, 'PORTAL OPEN!', '#e8d0ff');
      }
      for (const e of this.ents) if (e.isEnemy && e !== this.player && !(e instanceof Boss) && e.harmful && e.active) e.hitBy(this, 'boss', 1);
      for (const e of this.ents) if (e instanceof BossFire) e.dead = true;
      Sound.stopMusic(); setTimeout(() => { if (this.state === 'play') Sound.music('sky'); }, 2200);
    },
  };

  // ---------------- Flow ----------------
  function loadLevel(index, useCheckpoint) {
    const L = Levels.list[index];
    W.level = L; W.tiles = L.rows.map(r => r.split(''));
    W.ents = L.ents.map(makeEntity).filter(Boolean);
    W.fx = []; W.bumps = []; W.multi = {}; W.bossActive = false;
    const cp = useCheckpoint && W.checkpoint;
    const start = cp ? [cp.x, cp.y] : L.start;
    if (cp) for (const e of W.ents) if (e instanceof Checkpoint && e.tx === cp.x) e.on = true;
    W.player = new Player(start[0] * TS + 2, start[1] * TS, W.carryPower);
    W.time = L.time; W.timeTick = 0;
    W.camX = clampCam(W.player.x - VIEW_W * 0.4);
  }
  function clampCam(x) { return Math.max(0, Math.min(x, W.level.w * TS - VIEW_W)); }

  function startGame() {
    W.score = 0; W.gems = 0; W.lives = 3; W.levelIndex = W.startLevel; W.checkpoint = null; W.carryPower = 0;
    Sound.play('select');
    toIntro();
  }
  function toIntro() { W.state = 'intro'; W.stateT = 0; W.paused = false; Sound.stopMusic(); }
  function beginPlay() { loadLevel(W.levelIndex, true); W.state = 'play'; W.stateT = 0; Sound.music(W.level.music); }
  function saveHi() { if (W.score > W.hiscore) { W.hiscore = W.score; store.set('pip_hiscore', W.hiscore); } }
  function nextLevel() {
    W.checkpoint = null;
    if (W.levelIndex + 1 < Levels.list.length) {
      W.levelIndex++;
      if (W.levelIndex > W.maxLevel) { W.maxLevel = W.levelIndex; store.set('pip_maxlevel', W.maxLevel); }
      toIntro();
    } else {
      saveHi(); W.state = 'victory'; W.stateT = 0; W.fx = []; W.camX = 0;
      Sound.music('title');
    }
  }
  function toTitle() { W.state = 'title'; W.stateT = 0; W.startLevel = 0; W.fx = []; Sound.music('title'); }

  // ---------------- Update ----------------
  function update() {
    W.tick++;
    const inp = readInput();
    if (inp.mutePressed) Sound.toggleMute();
    const go = inp.startPressed || inp.jumpPressed || inp.tapPressed;
    switch (W.state) {
      case 'title':
        if (!Sound.song) Sound.music('title');
        if (inp.leftPressed && W.startLevel > 0) { W.startLevel--; Sound.play('select'); }
        if (inp.rightPressed && W.startLevel < W.maxLevel) { W.startLevel++; Sound.play('select'); }
        if (go) startGame();
        break;
      case 'intro':
        W.stateT++;
        if (W.stateT > 140 || (W.stateT > 30 && go)) beginPlay();
        break;
      case 'play':
        if (inp.pausePressed || inp.startPressed) {
          W.paused = !W.paused; Sound.play('pause');
          if (W.paused) Sound.stopMusic();
          else if (W.player.star > 0) Sound.music('star');
          else W.restoreMusic();
        }
        if (!W.paused) updatePlay(inp);
        break;
      case 'dying':
        W.stateT++;
        W.player.update(W, NO_INPUT);
        FX.update(W);
        if (W.stateT > 170) {
          W.lives--;
          if (W.lives <= 0) { saveHi(); W.state = 'gameover'; W.stateT = 0; Sound.play('gameover'); }
          else toIntro();
        }
        break;
      case 'clear': updateClear(); break;
      case 'gameover':
        W.stateT++;
        if (W.stateT > 60 && go) toTitle();
        break;
      case 'victory':
        W.stateT++;
        if (W.stateT % 25 === 0) {
          const x = 40 + Math.random() * 320, y = 30 + Math.random() * 90;
          const col = ['#ffd23f', '#ff5ab4', '#5ad8ff', '#9cff6a', '#ffffff'][Math.floor(Math.random() * 5)];
          FX.sparkle(W, x, y, 14, col); FX.sparkle(W, x, y, 8, '#fff');
          Sound.play('fire');
        }
        FX.update(W);
        if (W.stateT > 120 && go) toTitle();
        break;
    }
  }

  function inRange(e, m) { const ew = e.w || 16; return e.x + ew > W.camX - m && e.x < W.camX + VIEW_W + m; }

  function updatePlay(inp) {
    const p = W.player;
    if (p.growT > 0) { p.growT--; return; }
    for (const e of W.ents) if (e.isPlatform) e.update(W);
    p.update(W, inp);
    if (W.state !== 'play') return;

    for (const e of W.ents) {
      if (e.isPlatform) continue;
      if (!e.always) {
        if (!e.active && inRange(e, 40)) e.active = true;
        if (e.active && !inRange(e, 300)) { if (e.x < W.camX) e.dead = true; else e.active = false; }
      }
      if (e.active && !e.dead) e.update(W);
      if (W.state !== 'play') return;
    }

    for (const e of W.ents) {
      if (e.dead || !e.active || p.dead) continue;
      if (e.isEnemy && e.harmful && overlap(p, e)) e.onPlayer(W, p);
      else if (e.isItem && e.emerge <= 8 && overlap(p, e)) e.collect(W, p);
    }
    if (W.state !== 'play') return;

    // walkers turn around when they meet
    const walkers = W.ents.filter(e => e.isEnemy && e.active && e.harmful && e.onGround && e.vx !== 0 &&
      !(e instanceof Boss) && !(e instanceof Beetle && e.state === 'slide'));
    for (let i = 0; i < walkers.length; i++) for (let j = i + 1; j < walkers.length; j++) {
      const a = walkers[i], b = walkers[j];
      if (!overlap(a, b)) continue;
      const [l, r] = a.x < b.x ? [a, b] : [b, a];
      l.vx = -Math.abs(l.vx); r.vx = Math.abs(r.vx);
    }

    W.ents = W.ents.filter(e => !e.dead);
    for (const b of W.bumps) b.t++;
    W.bumps = W.bumps.filter(b => b.t < 10);
    FX.update(W);

    if (++W.timeTick >= 24) {
      W.timeTick = 0; W.time--;
      if (W.time === 100) { Sound.play('checkpoint'); FX.text(W, p.x + 6, p.y - 16, 'HURRY!', '#ff8a6a'); }
      if (W.time <= 0) { W.time = 0; p.die(W); return; }
    }

    // camera
    const target = p.x + p.w / 2 - VIEW_W / 2 + p.facing * 28 + p.vx * 10;
    W.camX = clampCam(W.camX + (target - W.camX) * 0.1);
  }

  function updateClear() {
    W.stateT++;
    const p = W.player, pt = W.clearPortal;
    for (const e of W.ents) if (e instanceof Portal || e.isPlatform) e.update(W);
    if (W.stateT < 40) {
      p.x += (pt.x + 16 - p.w / 2 - p.x) * 0.12; p.y += (pt.y + 24 - p.h / 2 - p.y) * 0.12;
      if (W.stateT % 4 === 0) FX.sparkle(W, p.x + 6, p.y + p.h / 2, 4, '#e8d0ff');
    } else if (W.stateT === 40) {
      p.hidden = true; FX.sparkle(W, pt.x + 16, pt.y + 24, 16, '#ffffff'); Sound.play('clear');
    } else if (W.stateT > 110) {
      if (W.time > 0) { const d = Math.min(W.time, 2); W.time -= d; W.score += 50 * d; if (W.stateT % 3 === 0) Sound.play('tick'); }
      else if (!W.tallyDone) W.tallyDone = W.stateT;
      else if (W.stateT - W.tallyDone > 100) nextLevel();
    }
    FX.update(W);
  }

  // ---------------- Rendering ----------------
  const gradCache = {};
  function drawBackground(theme, cx, tick) {
    const bg = Gfx.backgroundLayers(theme);
    let gr = gradCache[theme];
    if (!gr) { gr = ctx.createLinearGradient(0, 0, 0, VIEW_H); gr.addColorStop(0, bg.sky[0]); gr.addColorStop(1, bg.sky[1]); gradCache[theme] = gr; }
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (bg.sun) {
      const sx = 300 - (cx * 0.02) % 40, sy = 70;
      ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.beginPath(); ctx.arc(sx, sy, 38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
    }
    for (const l of bg.layers) {
      const off = Math.floor((cx * l.f + (l.drift ? tick * l.drift : 0)) % Gfx.BG_W);
      ctx.drawImage(l.c, -off, 0); ctx.drawImage(l.c, -off + Gfx.BG_W, 0);
    }
    if (theme === 'castle') { // drifting embers
      for (let i = 0; i < 14; i++) {
        const x = ((i * 97 + tick * (0.3 + (i % 3) * 0.2)) % (VIEW_W + 20)) - 10;
        const y = VIEW_H - ((i * 53 + tick * (0.4 + (i % 4) * 0.15)) % VIEW_H);
        ctx.fillStyle = i % 2 ? '#ff7a3a' : '#ffb060'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
  }

  function tileSprite(theme, c, tx, ty, tick) {
    const above = ty > 0 ? W.tiles[ty - 1][tx] : '#';
    switch (c) {
      case '#': return Gfx.tile(theme, ty > 0 && above !== '#' ? 'groundTop' : 'ground');
      case 'B': case 'C': return Gfx.tile(theme, 'brick');
      case '?': case 'M': case 'S': return Gfx.tile(theme, 'mystery', Math.floor(tick / 8) % 4);
      case 'E': return Gfx.tile(theme, 'used');
      case 'X': return Gfx.tile(theme, 'solid');
      case 'P': return Gfx.tile(theme, 'pillarTop');
      case 'p': return Gfx.tile(theme, 'pillar');
      case '-': return Gfx.tile(theme, 'plank');
      case '^': return Gfx.tile(theme, 'spikes');
      case 'l': return above === 'l' ? Gfx.lava(Math.floor(tick / 6) % 8) : Gfx.lavaTop(Math.floor(tick / 6) % 8);
      case 'o': return Gfx.coin(tick / 7);
    }
    return null;
  }

  function drawWorld() {
    const L = W.level, th = L.theme, cx = Math.round(W.camX), tick = W.tick;
    drawBackground(th, cx, tick);
    for (const e of W.ents) if (e.isItem && e.emerge > 0) e.draw(ctx, cx, W);

    const tx0 = Math.max(0, Math.floor(cx / TS)), tx1 = Math.min(L.w - 1, tx0 + Math.ceil(VIEW_W / TS) + 1);
    for (let ty = 0; ty < L.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const c = W.tiles[ty][tx];
      if (c === ' ' || c === 'H') continue;
      const s = tileSprite(th, c, tx, ty, tick);
      if (!s) continue;
      let off = 0;
      for (const b of W.bumps) if (b.tx === tx && b.ty === ty) off = -Math.round(Math.sin(b.t / 10 * Math.PI) * 5);
      ctx.drawImage(s.r, tx * TS - cx, ty * TS + off);
    }

    const layers = [[], [], [], []];
    for (const e of W.ents) {
      if (e.isItem) { if (e.emerge <= 0) layers[1].push(e); }
      else if (e.isEnemy) layers[2].push(e);
      else if (e instanceof Fireball || e instanceof BossFire) layers[3].push(e);
      else layers[0].push(e);
    }
    for (const e of layers[0]) if (e.always || inRange(e, 64)) e.draw(ctx, cx, W);
    for (const e of layers[1]) e.draw(ctx, cx, W);
    for (const e of layers[2]) if (e.active || inRange(e, 16)) e.draw(ctx, cx, W);
    W.player.draw(ctx, cx, tick);
    for (const e of layers[3]) e.draw(ctx, cx, W);
    FX.draw(ctx, W, cx);
  }

  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, VIEW_W, 24);
    Gfx.text(ctx, 'PIP', 10, 4, '#ffd9a8'); Gfx.text(ctx, pad(W.score, 7), 10, 13);
    Gfx.draw(ctx, Gfx.hudCoin(), 112, 12); Gfx.text(ctx, 'X' + pad(W.gems, 2), 122, 13);
    Gfx.text(ctx, 'WORLD', 180, 4, '#ffd9a8'); Gfx.text(ctx, '1-' + (W.levelIndex + 1), 186, 13);
    Gfx.text(ctx, 'TIME', 262, 4, '#ffd9a8');
    Gfx.text(ctx, pad(W.time, 3), 265, 13, W.time <= 100 && Math.floor(W.tick / 15) % 2 ? '#ff6a5a' : '#fff');
    Gfx.draw(ctx, Gfx.hudHead(), 336, 11); Gfx.text(ctx, 'X' + W.lives, 352, 13);
    if (Sound.muted) Gfx.text(ctx, 'MUTE', VIEW_W - 6, 4, '#ff9a8a', 1, 'right');
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10,8,24,0.82)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffd9a8'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  }

  function drawLogo(y) {
    const bob = Math.round(Math.sin(W.tick * 0.05) * 2);
    Gfx.text(ctx, "PIP'S", VIEW_W / 2, y + bob, '#ffd23f', 4, 'center', '#8a3a10');
    Gfx.text(ctx, 'QUEST', VIEW_W / 2, y + 34 + bob, '#ff8a3a', 4, 'center', '#5a1a08');
  }

  function drawTitle() {
    const cx = W.tick * 0.6;
    drawBackground('meadow', cx, W.tick);
    for (let x = -1; x <= VIEW_W / TS + 1; x++) {
      const px = x * TS - (cx % TS);
      ctx.drawImage(Gfx.tile('meadow', 'groundTop').r, px, 12 * TS);
      ctx.drawImage(Gfx.tile('meadow', 'ground').r, px, 13 * TS);
    }
    drawLogo(26);
    const f = 1 + Math.floor(W.tick / 6) % 3;
    Gfx.draw(ctx, Gfx.hero(true, f, 'normal'), 190, 12 * TS - 28);
    Gfx.draw(ctx, Gfx.grumble(Math.floor(W.tick / 10) % 2), 140 + Math.sin(W.tick * 0.03) * 6, 12 * TS - 16);
    Gfx.draw(ctx, Gfx.coin(W.tick / 7), 240, 12 * TS - 40 + Math.round(Math.sin(W.tick * 0.08) * 3));

    if (Math.floor(W.tick / 30) % 2 === 0) Gfx.text(ctx, IS_TOUCH ? 'TAP THE SCREEN TO START' : 'PRESS ENTER OR TAP TO START', VIEW_W / 2, 98, '#ffffff', 1, 'center');
    if (W.maxLevel > 0) Gfx.text(ctx, '< START AT WORLD 1-' + (W.startLevel + 1) + ' >', VIEW_W / 2, 109, '#9cff6a', 1, 'center');
    drawPanel(56, 120, 288, 40);
    const help = IS_TOUCH
      ? ['LEFT/RIGHT PADS  MOVE AND RUN', 'A  JUMP              B  FIRE', 'DOWN PAD  CROUCH     II  PAUSE']
      : ['ARROWS/WASD  MOVE      Z/SPACE  JUMP', 'X/SHIFT  RUN + FIRE    DOWN  CROUCH', 'P/ESC  PAUSE           M  MUTE'];
    help.forEach((line, i) => Gfx.text(ctx, line, 64, 125 + i * 11, '#e8e0ff'));
    Gfx.text(ctx, 'HI ' + pad(W.hiscore, 7), VIEW_W / 2, 6, '#ffd9a8', 1, 'center');
  }

  const TIPS = [
    'STOMP FOES. BASH BLOCKS. FIND THE PORTAL!',
    'DARK CAVES HIDE SECRET BLOCKS. FALLING LEDGES WAIT FOR NO ONE.',
    'RIDE THE CLOUDS. SPRINGS SEND YOU SKY HIGH.',
    'KING GRUMBLOR AWAITS. STOMP HIS CROWN OR BURN HIM DOWN!',
  ];
  function drawIntro() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const L = Levels.list[W.levelIndex];
    Gfx.text(ctx, 'WORLD 1-' + (W.levelIndex + 1), VIEW_W / 2, 62, '#ffffff', 2, 'center');
    Gfx.text(ctx, L.name, VIEW_W / 2, 86, '#ffd23f', 1, 'center');
    Gfx.draw(ctx, Gfx.hero(W.carryPower > 0, 0, W.carryPower === 2 ? 'fire' : 'normal'), VIEW_W / 2 - 26, 122 - (W.carryPower > 0 ? 28 : 16));
    Gfx.text(ctx, 'X  ' + W.lives, VIEW_W / 2 - 4, 112, '#ffffff', 1, 'left');
    Gfx.text(ctx, TIPS[W.levelIndex] || '', VIEW_W / 2, 160, '#9aa0c0', 1, 'center');
    Gfx.text(ctx, 'SCORE ' + pad(W.score, 7), VIEW_W / 2, 196, '#888', 1, 'center');
  }

  function drawGameOver() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    Gfx.text(ctx, 'GAME OVER', VIEW_W / 2, 70, '#ff5a4a', 3, 'center', '#5a0a08');
    Gfx.text(ctx, 'SCORE  ' + pad(W.score, 7), VIEW_W / 2, 118, '#fff', 1, 'center');
    Gfx.text(ctx, 'BEST   ' + pad(W.hiscore, 7), VIEW_W / 2, 132, '#ffd9a8', 1, 'center');
    if (W.stateT > 60 && Math.floor(W.tick / 30) % 2 === 0) Gfx.text(ctx, IS_TOUCH ? 'TAP TO CONTINUE' : 'PRESS ENTER', VIEW_W / 2, 170, '#fff', 1, 'center');
  }

  function drawVictory() {
    const gr = ctx.createLinearGradient(0, 0, 0, VIEW_H); gr.addColorStop(0, '#1a1040'); gr.addColorStop(1, '#ff8a6a');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    FX.draw(ctx, W, 0);
    Gfx.text(ctx, 'VICTORY!', VIEW_W / 2, 34, '#ffd23f', 3, 'center', '#5a1a08');
    Gfx.text(ctx, 'KING GRUMBLOR IS DEFEATED AND THE', VIEW_W / 2, 74, '#fff', 1, 'center');
    Gfx.text(ctx, 'VALLEY IS SAFE AGAIN. WELL DONE, PIP!', VIEW_W / 2, 86, '#fff', 1, 'center');
    const f = 1 + Math.floor(W.tick / 6) % 3;
    Gfx.draw(ctx, Gfx.hero(true, W.stateT % 120 < 60 ? f : 4, W.carryPower === 2 ? 'fire' : 'normal'), VIEW_W / 2 - 8, 130 - Math.abs(Math.sin(W.tick * 0.08)) * 10);
    Gfx.text(ctx, 'FINAL SCORE  ' + pad(W.score, 7), VIEW_W / 2, 162, '#fff', 1, 'center');
    Gfx.text(ctx, 'BEST         ' + pad(W.hiscore, 7), VIEW_W / 2, 174, '#ffd9a8', 1, 'center');
    if (W.stateT > 120 && Math.floor(W.tick / 30) % 2 === 0) Gfx.text(ctx, IS_TOUCH ? 'THANKS FOR PLAYING - TAP TO CONTINUE' : 'THANKS FOR PLAYING - PRESS ENTER', VIEW_W / 2, 200, '#fff', 1, 'center');
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    switch (W.state) {
      case 'title': drawTitle(); break;
      case 'intro': drawIntro(); break;
      case 'gameover': drawGameOver(); break;
      case 'victory': drawVictory(); break;
      default:
        drawWorld(); drawHUD();
        if (W.state === 'play' && W.paused) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
          Gfx.text(ctx, 'PAUSED', VIEW_W / 2, 90, '#fff', 3, 'center');
          Gfx.text(ctx, IS_TOUCH ? 'TAP II TO RESUME' : 'ENTER / P TO RESUME', VIEW_W / 2, 128, '#ffd9a8', 1, 'center');
        }
        if (W.state === 'clear' && W.stateT > 50) {
          drawPanel(110, 70, 180, 56);
          Gfx.text(ctx, 'STAGE CLEAR!', VIEW_W / 2, 80, '#ffd23f', 2, 'center');
          Gfx.text(ctx, 'TIME BONUS  ' + pad(W.time, 3) + ' X 50', VIEW_W / 2, 106, '#fff', 1, 'center');
        }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && W.state === 'play' && !W.paused) { W.paused = true; Sound.stopMusic(); }
  });

  // ---------------- Loop ----------------
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }

  // When the published page is updated while someone is playing, keep their run going.
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({
    inGame: !['title', 'gameover', 'victory'].includes(W.state), levelIndex: W.levelIndex, score: W.score,
    gems: W.gems, lives: W.lives, checkpoint: W.checkpoint, carryPower: W.carryPower,
  }));
  function start(data) {
    if (data && data.inGame) {
      Object.assign(W, { levelIndex: data.levelIndex, score: data.score, gems: data.gems, lives: data.lives,
        checkpoint: data.checkpoint, carryPower: data.carryPower });
      toIntro();
    }
    requestAnimationFrame(frame);
  }
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});

  // Console helpers for debugging / testing.
  W._step = n => { for (let i = 0; i < n; i++) update(); render(); };
  W._warp = (lvl, tileX) => {
    W.levelIndex = lvl; W.checkpoint = tileX ? { x: tileX, y: 11 } : null; beginPlay();
  };
  window.PipQuest = W;
})();
