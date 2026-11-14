// Procedural pixel-art: font, characters, tiles and parallax backgrounds.
const TS = 16;

const Gfx = (() => {
  const cache = new Map();
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function flipped(src) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c;
  }
  // Build (once) a sprite with right- and left-facing canvases.
  function sprite(key, w, h, fn) {
    let s = cache.get(key);
    if (!s) {
      const c = mk(w, h), g = c.getContext('2d');
      const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
      fn(r, g);
      s = { r: c, l: flipped(c), w, h };
      cache.set(key, s);
    }
    return s;
  }
  function draw(ctx, s, x, y, left) { ctx.drawImage(left ? s.l : s.r, Math.round(x), Math.round(y)); }
  // Draw from ascii rows; map char -> color. scale = pixel size.
  function pix(r, rows, ox, oy, map, scale = 1) {
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < rows[y].length; x++) {
        const c = map[rows[y][x]];
        if (c) r(ox + x * scale, oy + y * scale, scale, scale, c);
      }
  }
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  // ---------------- Pixel font (5x7) ----------------
  const FONT_SRC = {
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
    '2': '01110 10001 00001 00010 00100 01000 11111', '3': '11111 00010 00100 00010 00001 10001 01110',
    '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
    '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110',
    'C': '01110 10001 10000 10000 10000 10001 01110', 'D': '11100 10010 10001 10001 10001 10010 11100',
    'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
    'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001',
    'I': '01110 00100 00100 00100 00100 00100 01110', 'J': '00111 00010 00010 00010 00010 10010 01100',
    'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 10001 11001 10101 10011 10001 10001',
    'O': '01110 10001 10001 10001 10001 10001 01110', 'P': '11110 10001 10001 11110 10000 10000 10000',
    'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001',
    'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100',
    'U': '10001 10001 10001 10001 10001 10001 01110', 'V': '10001 10001 10001 10001 10001 01010 00100',
    'W': '10001 10001 10001 10101 10101 10101 01010', 'X': '10001 10001 01010 00100 01010 10001 10001',
    'Y': '10001 10001 10001 01010 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
    '-': '00000 00000 00000 11111 00000 00000 00000', '.': '00000 00000 00000 00000 00000 01100 01100',
    '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
    ':': '00000 01100 01100 00000 01100 01100 00000', '*': '00000 10001 01010 00100 01010 10001 00000',
    "'": '00100 00100 01000 00000 00000 00000 00000', ',': '00000 00000 00000 00000 01100 00100 01000',
    '/': '00001 00001 00010 00100 01000 10000 10000', '+': '00000 00100 00100 11111 00100 00100 00000',
    '>': '01000 00100 00010 00001 00010 00100 01000', '<': '00010 00100 01000 10000 01000 00100 00010',
    '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
    '&': '01100 10010 10100 01000 10101 10010 01101', '=': '00000 00000 11111 00000 11111 00000 00000',
  };
  const FONT = {};
  for (const k in FONT_SRC) FONT[k] = FONT_SRC[k].split(' ').map(r => parseInt(r, 2));

  function glyph(ch, col) {
    const rows = FONT[ch];
    if (!rows) return null;
    return sprite('g' + ch + col, 5, 7, r => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) r(x, y, 1, 1, col);
    }).r;
  }
  function textWidth(str, scale = 1) { return str.length * 6 * scale - scale; }
  function text(ctx, str, x, y, col = '#fff', scale = 1, align = 'left', shadow = '#000') {
    str = String(str).toUpperCase();
    if (align === 'center') x -= textWidth(str, scale) / 2;
    else if (align === 'right') x -= textWidth(str, scale);
    x = Math.round(x); y = Math.round(y);
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch !== ' ') {
        if (shadow) { const gs = glyph(ch, shadow); if (gs) ctx.drawImage(gs, x + scale, y + scale, 5 * scale, 7 * scale); }
        const g = glyph(ch, col); if (g) ctx.drawImage(g, x, y, 5 * scale, 7 * scale);
      }
      x += 6 * scale;
    }
  }

  // ---------------- Hero: Pip the fox ----------------
  // Palette keys: k outline, o fur, O fur shade, h fur highlight, w cream, s/S scarf, e eye, i eye shine,
  // n nose, p inner ear, b/B boots (front/back), L back-leg fur.
  const HERO_BASE = { k: '#2a1206', o: '#f27a26', O: '#c4531a', h: '#ffb066', w: '#fff3dc', s: '#2fc4b2', S: '#178a7e',
    e: '#1a0c06', i: '#ffffff', n: '#1a0c06', p: '#ff9aa0', b: '#8a4a28', B: '#5a2c14', L: '#9a3e12' };
  const HERO_PALS = {
    normal: HERO_BASE,
    fire:  Object.assign({}, HERO_BASE, { k: '#3a0e04', o: '#fff4e6', O: '#e0c4a0', h: '#ffffff', w: '#ffffff', s: '#ff4f2b', S: '#b32a12', b: '#d0381c', B: '#8a1e0c', L: '#c4a27c', p: '#ffb0b0' }),
    star0: Object.assign({}, HERO_BASE, { o: '#ffd23f', O: '#c99a10', h: '#fff2a0', s: '#ff5ab4', S: '#b8307e', b: '#8a5a00', B: '#5a3a00', L: '#a07a08' }),
    star1: Object.assign({}, HERO_BASE, { o: '#ff6a8a', O: '#c03a5a', h: '#ffb8c8', s: '#ffe14d', S: '#c9a810', b: '#7a1830', B: '#4a0c1c', L: '#a02848' }),
    star2: Object.assign({}, HERO_BASE, { o: '#5ad8ff', O: '#2a90c0', h: '#c0f4ff', s: '#ffffff', S: '#c8d8e0', b: '#1a4a72', B: '#0c2a48', L: '#2a7aa8' }),
    star3: Object.assign({}, HERO_BASE, { o: '#9cff6a', O: '#58b830', h: '#dcffc4', s: '#ff8a2a', S: '#b85a10', b: '#2a5a14', B: '#14340a', L: '#48a020' }),
  };

  const HERO_HEAD = [
    '.....k.....k....',
    '....kok...kok...',
    '....kpok.kpok...',
    '....kohhooooook.',
    '....kooooooieok.',
    '....kooooooeeok.',
    '....kOoooowwwwwn',
    '....kOOoowwwwwk.',
    '.....kOOwwwwkk..',
  ];
  const HERO_BODY_S = [
    '.....kssssssk...',
    '.....koowwwok...',
    '.....koowwwok...',
    '.....kOowwOOk...',
  ];
  const HERO_BODY_B = [
    '.....kssssssk...',
    '....kSSSSSSSSk..',
    '....koooowwwok..',
    '....kooowwwwok..',
    '....kooowwwwok..',
    '....kOoowwwwok..',
    '....kOoowwwwok..',
    '....kOoowwwwok..',
    '....kOOowwwOOk..',
    '....kOOOwwOOOk..',
    '....kOOOOOOOOk..',
  ];
  const HERO_TAIL_S = [
    ['.kk...', 'kwwk..', 'kwwok.', 'koook.', 'kooOk.', '.kOOok', '..kOOk', '...kk.'],
    ['......', '.kk...', 'kwwk..', 'kwwok.', 'koooOk', '.kOOok', '..kkOk', '....k.'],
  ];
  const HERO_TAIL_B = [
    ['.kkk...', 'kwwwk..', 'kwwwok.', 'kwoook.', 'koooook', 'kooooOk', '.kooOOk', '..kOOOk', '...kOOk', '....kk.'],
    ['.......', '.kkk...', 'kwwwk..', 'kwwwok.', 'kwooook', 'kooooOk', '.kooOOk', '..kOOOk', '...kkOk', '.....k.'],
  ];
  const HERO_SCARF = [['.kss', 'kSS.'], ['kss.', '.kSS']];
  const HERO_ARM = {
    down: { ox: 11, oy: 12, g: ['kok', 'kok', 'kok', 'kwk', '.k.'] },
    fwd:  { ox: 11, oy: 12, g: ['kok..', '.kook', '..kwk', '...k.'] },
    up:   { ox: 12, oy: 8, g: ['.kk.', 'kwwk', 'kook', '.kok', '.kok'] },
  };
  // Leg layouts per frame: [[x, lift], ...] back leg first.
  const HERO_LEGS_S = { 0: [[5, 0], [9, 0]], 1: [[3, 0], [10, 1]], 2: [[6, 1], [8, 0]], 3: [[4, 1], [10, 0]], 4: [[3, 1], [10, 2]], 5: [[7, 0], [10, 0]], 6: [[3, 1], [10, 1]] };
  const HERO_LEGS_B = { 0: [[4, 0], [9, 0]], 1: [[2, 0], [10, 2]], 2: [[5, 2], [8, 0]], 3: [[3, 2], [10, 0]], 4: [[2, 2], [10, 4]], 5: [[6, 0], [10, 0]], 6: [[2, 2], [10, 2]] };

  function heroLegs(R, P, cfg, top, ground, lw) {
    cfg.forEach(([x, lift], i) => {
      const back = i === 0, bottom = ground - lift;
      for (let y = top; y < bottom - 2; y++) { R(x, y, lw, 1, P.k); R(x + 1, y, lw - 2, 1, back ? P.L : P.O); }
      R(x, bottom - 2, lw + 1, 2, P.k); R(x + 1, bottom - 2, lw - 1, 1, back ? P.B : P.b);
    });
  }

  // frames: 0 stand, 1-3 run, 4 jump, 5 skid, 6 die, 7 crouch (big only)
  function heroFrame(R, P, big, f) {
    if (big && f === 7) return heroFrame((x, y, w, h, c) => R(x, y + 12, w, h, c), P, false, 0);
    const bob = (f === 1 || f === 3) ? 1 : 0;
    pix(R, (big ? HERO_TAIL_B : HERO_TAIL_S)[(f === 1 || f === 3 || f === 4) ? 1 : 0], 0, (big ? 8 : 4) + bob, P);
    heroLegs(R, P, (big ? HERO_LEGS_B : HERO_LEGS_S)[f] || [[5, 0], [9, 0]], big ? 20 : 13, big ? 28 : 16, big ? 4 : 3);
    pix(R, big ? HERO_BODY_B : HERO_BODY_S, 0, 9 + bob, P);
    pix(R, HERO_HEAD, 0, bob, P);
    pix(R, HERO_SCARF[f === 0 ? 0 : (f % 2)], 1, 9 + bob, P);
    if (f === 6) { // dizzy X eyes
      R(10, 3, 3, 3, P.o);
      [[10, 3], [12, 3], [11, 4], [10, 5], [12, 5]].forEach(([x, y]) => R(x, y, 1, 1, P.e));
    }
    if (big) {
      const a = (f === 4 || f === 6) ? HERO_ARM.up : (f === 1 || f === 5) ? HERO_ARM.fwd : f === 3 ? null : HERO_ARM.down;
      if (a) pix(R, a.g, a.ox, a.oy + bob, P);
    }
  }

  function hero(big, frame, palName) {
    const P = HERO_PALS[palName] || HERO_PALS.normal;
    return big ? sprite(`hb${frame}${palName}`, 16, 28, r => heroFrame(r, P, true, frame))
               : sprite(`hs${frame}${palName}`, 16, 16, r => heroFrame(r, P, false, frame));
  }

  // ---------------- Enemies ----------------
  function blob(r, f, B, BD, BL, s = 1) {
    const R = (x, y, w, h, c) => r(x * s, y * s, w * s, h * s, c);
    if (f === 2) { // squished
      R(1, 11, 14, 5, B); R(2, 10, 12, 1, B); R(3, 12, 3, 1, '#fff'); R(10, 12, 3, 1, '#fff'); R(1, 15, 14, 1, BD); return;
    }
    R(4, 2, 8, 1, B); R(3, 3, 10, 1, B); R(2, 4, 12, 9, B); R(1, 6, 14, 6, B); R(3, 13, 10, 1, B);
    R(4, 3, 3, 1, BL); R(3, 4, 2, 2, BL);
    R(4, 6, 3, 3, '#fff'); R(9, 6, 3, 3, '#fff'); R(5, 7, 2, 2, '#111'); R(9, 7, 2, 2, '#111');
    R(3, 5, 2, 1, BD); R(5, 6, 2, 1, BD); R(11, 5, 2, 1, BD); R(9, 6, 2, 1, BD);
    R(5, 11, 6, 1, BD); R(6, 12, 1, 1, '#fff'); R(9, 12, 1, 1, '#fff');
    if (f === 0) { R(2, 13, 4, 3, BD); R(10, 13, 4, 3, BD); } else { R(3, 14, 4, 2, BD); R(9, 13, 4, 3, BD); }
  }
  const grumble = f => sprite('grumble' + f, 16, 16, r => blob(r, f, '#8e44ad', '#4f2266', '#c07ae0'));

  const beetle = f => sprite('beetle' + f, 16, 16, r => {
    const S = '#2e9d6a', SD = '#1d6646', SL = '#8ff0b8', H = '#f0c94a', HD = '#a8801e', RIM = '#f5e6b0';
    if (f >= 2) {
      r(4, 5, 8, 1, S); r(3, 6, 10, 1, S); r(2, 7, 12, 6, S); r(2, 13, 12, 2, RIM); r(2, 15, 12, 1, HD);
      r(5, 8, 6, 1, SD); r(7, 7, 2, 6, SD);
      r(f === 2 ? 4 : 10, 8, 2, 2, SL);
      return;
    }
    r(11, 6, 4, 5, H); r(13, 7, 1, 2, '#111'); r(15, 9, 1, 1, HD);
    r(4, 3, 7, 1, S); r(3, 4, 9, 1, S); r(2, 5, 10, 6, S); r(1, 8, 11, 3, S);
    r(1, 11, 11, 2, RIM); r(5, 5, 2, 2, SL); r(7, 4, 1, 7, SD); r(3, 7, 8, 1, SD);
    if (f === 0) { r(3, 13, 2, 3, HD); r(8, 13, 2, 3, HD); } else { r(4, 13, 2, 3, HD); r(9, 13, 2, 3, HD); }
  });

  const buzzer = f => sprite('buzzer' + f, 16, 16, r => {
    const Y = '#f5c518', K = '#2b2b2b', W = 'rgba(220,245,255,0.9)';
    if (f === 0) { r(5, 1, 4, 5, W); r(6, 0, 2, 1, W); r(9, 2, 3, 4, W); } else { r(3, 5, 7, 2, W); r(4, 4, 5, 1, W); }
    r(4, 6, 8, 1, Y); r(3, 7, 10, 6, Y); r(4, 13, 8, 1, Y);
    r(5, 6, 2, 8, K); r(8, 6, 1, 8, K);
    r(10, 7, 4, 5, Y); r(11, 8, 2, 2, '#fff'); r(12, 9, 1, 1, '#000');
    r(13, 4, 1, 3, K); r(14, 3, 1, 1, K); r(1, 10, 2, 1, K); r(0, 10, 1, 1, '#888');
  });

  const hopper = f => sprite('hopper' + f, 16, 16, r => {
    const G = '#4caf50', GD = '#2e7d32', GL = '#b9e6a0';
    const o = f === 1 ? -3 : 0;
    r(2, 8 + o, 12, 6, G); r(3, 7 + o, 10, 1, G); r(5, 11 + o, 6, 3, GL);
    r(3, 4 + o, 4, 4, G); r(9, 4 + o, 4, 4, G);
    r(4, 5 + o, 2, 2, '#fff'); r(10, 5 + o, 2, 2, '#fff'); r(5, 6 + o, 1, 1, '#000'); r(11, 6 + o, 1, 1, '#000');
    r(5, 10 + o, 6, 1, GD); r(7, 9 + o, 2, 1, '#ff8aa0');
    if (f === 1) { r(2, 11, 2, 5, GD); r(12, 11, 2, 5, GD); }
    else { r(0, 12, 4, 4, GD); r(12, 12, 4, 4, GD); }
  });

  const spiker = f => sprite('spiker' + f, 16, 16, r => {
    const R = '#d64933', RD = '#8f2a1c', SK = '#f2f2f2', SKD = '#a8a8a8';
    for (let i = 0; i < 4; i++) { r(1 + i * 3, 3, 2, 4, SKD); r(2 + i * 3, 1, 1, 3, SK); }
    r(3, 6, 9, 1, R); r(2, 7, 11, 7, R); r(1, 9, 1, 4, R);
    r(3, 8, 2, 1, RD); r(6, 7, 2, 1, RD);
    r(11, 8, 4, 5, '#f2c4a0'); r(12, 9, 1, 1, '#000'); r(15, 10, 1, 1, '#000');
    if (f === 0) { r(3, 14, 3, 2, RD); r(9, 14, 3, 2, RD); } else { r(4, 14, 3, 2, RD); r(10, 14, 3, 2, RD); }
  });

  const boss = (f, flash) => sprite('boss' + f + (flash ? 'w' : ''), 32, 32, r => {
    if (flash) blob(r, f, '#ffffff', '#ffd0d0', '#ffffff', 2);
    else blob(r, f, '#b0306e', '#5c1036', '#e070a8', 2);
    const Gd = '#ffd23f', GdD = '#b8880a';
    r(9, 1, 14, 5, Gd); r(9, 0, 2, 1, Gd); r(15, 0, 2, 1, Gd); r(21, 0, 2, 1, Gd); r(9, 5, 14, 1, GdD);
    r(15, 2, 2, 2, '#e8344a'); r(11, 3, 1, 1, '#3ee0ff'); r(20, 3, 1, 1, '#3ee0ff');
  });

  // ---------------- Items ----------------
  // Gold paw coin. coin(step) loops a spin: glint, face, face, tilt, edge, tilt (mirrored).
  const COIN_PAL = { k: '#7a4300', y: '#ffcf3a', Y: '#e39f12', h: '#fff2a6', r: '#c97f0a', w: '#ffffff' };
  const COIN_FACE = [
    '...kkkkkk...',
    '.kkhhhhhhkk.',
    '.khhwyyyyYk.',
    'khyyyrryyyYk',
    'khrryrryrrYk',
    'khrryyyyrrYk',
    'khyyyyyyyyYk',
    'khyyrrrryyYk',
    'khyrrrrrryYk',
    'khyrrrrrryYk',
    'khyyrrrryYYk',
    '.kYyyyyyYYk.',
    '.kkYYYYYYkk.',
    '...kkkkkk...',
  ];
  const COIN_TILT = [
    '..kkkk..',
    '.khhhkk.',
    'khhyyYrk',
    'khyryYrk',
    'khryrYrk',
    'khryrYrk',
    'khyyyYrk',
    'khyrrYrk',
    'khrrrYrk',
    'khrrrYrk',
    'khyyYYrk',
    '.kYYYrk.',
    '.kkYYkk.',
    '..kkkk..',
  ];
  const COIN_EDGE = ['.kk.', ...Array(12).fill('khrk'), '.kk.'];
  const COIN_SEQ = ['glint', 'face', 'face', 'tilt', 'edge', 'tiltR'];
  const coin = step => {
    const kind = COIN_SEQ[((Math.floor(step) % 6) + 6) % 6];
    return sprite('coin_' + kind, 16, 16, r => {
      if (kind === 'face' || kind === 'glint') pix(r, COIN_FACE, 2, 1, COIN_PAL);
      else if (kind === 'tilt') pix(r, COIN_TILT, 4, 1, COIN_PAL);
      else if (kind === 'tiltR') pix(r, COIN_TILT.map(row => [...row].reverse().join('')), 4, 1, COIN_PAL);
      else pix(r, COIN_EDGE, 6, 1, COIN_PAL);
      if (kind === 'glint') { r(4, 1, 1, 7, '#fff8d0'); r(1, 4, 7, 1, '#fff8d0'); r(3, 3, 3, 3, '#ffffff'); }
    });
  };

  const berry = () => sprite('berry', 16, 16, r => {
    r(5, 4, 6, 1, '#e8344a'); r(3, 5, 10, 8, '#e8344a'); r(4, 13, 8, 1, '#e8344a'); r(6, 14, 4, 1, '#b81f34');
    r(4, 6, 2, 2, '#ff9aa8'); r(6, 9, 1, 2, '#3a0a10'); r(10, 9, 1, 2, '#3a0a10');
    r(5, 12, 1, 1, '#ffd6dc'); r(11, 7, 1, 1, '#ffd6dc'); r(8, 12, 1, 1, '#ffd6dc');
    r(7, 1, 2, 4, '#3a8a2a'); r(9, 2, 4, 2, '#5cc85c'); r(4, 2, 3, 2, '#5cc85c');
  });

  const bloom = f => sprite('bloom' + f, 16, 16, r => {
    const P = ['#ff5a1f', '#ffb000', '#ff3060', '#ff8a00'][f];
    r(7, 10, 2, 6, '#2e8b3a'); r(3, 12, 4, 2, '#3cb44b'); r(9, 13, 4, 2, '#3cb44b');
    r(6, 0, 4, 3, P); r(6, 8, 4, 2, P); r(2, 3, 4, 5, P); r(10, 3, 4, 5, P);
    r(4, 1, 2, 2, P); r(10, 1, 2, 2, P); r(4, 8, 2, 1, P); r(10, 8, 2, 1, P);
    r(6, 3, 4, 5, '#fff3a0'); r(7, 4, 1, 2, '#5a2a00'); r(9, 4, 1, 2, '#5a2a00');
  });

  const STAR_ROWS = [
    '......##......', '......##......', '.....####.....', '.....####.....',
    '##############', '.############.', '..##########..', '...########...',
    '...########...', '..####..####..', '..###....###..', '.###......###.', '.##........##.',
  ];
  const comet = f => sprite('comet' + f, 16, 16, r => {
    const c = ['#ffe14d', '#fff8c0'][f];
    pix(r, STAR_ROWS, 1, 1, { '#': c });
    r(6, 6, 1, 2, '#3a2a00'); r(9, 6, 1, 2, '#3a2a00');
  });

  const HEART_ROWS = ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...'];
  const lifeHeart = () => sprite('heart', 16, 16, r => {
    pix(r, HEART_ROWS, 0, 1, { '#': '#36d46a' }, 2);
    r(2, 3, 2, 2, '#b8ffd0'); r(6, 6, 1, 3, '#fff'); r(9, 6, 1, 3, '#fff');
  });

  const fireball = f => sprite('fb' + f, 8, 8, r => {
    r(2, 0, 4, 8, '#ff6a00'); r(0, 2, 8, 4, '#ff6a00'); r(1, 1, 6, 6, '#ff6a00');
    r(2, 2, 4, 4, '#ffd040');
    const hx = [[2, 2], [4, 2], [4, 4], [2, 4]][f];
    r(hx[0], hx[1], 2, 2, '#fffbe0');
  });

  const bossFire = f => sprite('bfb' + f, 16, 10, r => {
    r(4, 1, 10, 8, '#ff3a10'); r(2, 3, 14, 4, '#ff3a10'); r(0, 4, 3, 2, f ? '#ff8a20' : '#ff3a10');
    r(6, 3, 8, 4, '#ffb030'); r(10, 4, 4, 2, '#fff0b0');
  });

  const spring = f => sprite('spring' + f, 16, 16, r => {
    const top = f ? 9 : 3;
    r(1, 13, 14, 3, '#4a4a58'); r(1, 13, 14, 1, '#777788');
    for (let y = top + 3; y < 13; y += 2) r(3, y, 10, 1, '#d0d0dc');
    r(0, top, 16, 3, '#e8443a'); r(0, top, 16, 1, '#ff8a80');
  });

  // ---------------- Tiles ----------------
  const THEMES = {
    meadow: { dirt: '#c27a3e', dirtD: '#8f5226', dirtL: '#dc9a5a', top: '#57c53c', topD: '#2e8f2a', topL: '#a5ec74',
              brick: '#c9592e', brickD: '#5e2410', brickL: '#ee8a5c', block: '#a87444', blockD: '#5e3a1c', blockL: '#d8a46e',
              pillar: '#5aa9b8', pillarD: '#2f6f7d', pillarL: '#a6e0ea', plank: '#b5793e', plankD: '#6b4220', plankL: '#e0aa6c' },
    cave:   { dirt: '#4d5d82', dirtD: '#2c3654', dirtL: '#6f80a8', top: '#8aa0d0', topD: '#5a6c98', topL: '#c8d6f6',
              brick: '#3f72b0', brickD: '#16305a', brickL: '#79aae6', block: '#5a6488', blockD: '#2a3050', blockL: '#8a96c0',
              pillar: '#8a74c8', pillarD: '#4f3f88', pillarL: '#c6b6f4', plank: '#7a8aa8', plankD: '#3c4660', plankL: '#b0c0dc' },
    sky:    { dirt: '#d08f5a', dirtD: '#9a5e32', dirtL: '#eab07e', top: '#7ee06a', topD: '#42a83c', topL: '#c8ffa0',
              brick: '#d86a4a', brickD: '#6e2a18', brickL: '#ffa07a', block: '#c08a5e', blockD: '#6a4428', blockL: '#ecba8a',
              pillar: '#f0a8c0', pillarD: '#b0607e', pillarL: '#ffd8e6', plank: '#fff4ec', plankD: '#d8b8c8', plankL: '#ffffff' },
    castle: { dirt: '#6f6f80', dirtD: '#3e3e4a', dirtL: '#9a9aab', top: '#8c8c9e', topD: '#55556a', topL: '#c0c0d2',
              brick: '#5c5c70', brickD: '#26262f', brickL: '#8a8aa0', block: '#7a6a6a', blockD: '#3a2e2e', blockL: '#a89898',
              pillar: '#8a5a5a', pillarD: '#4a2a2a', pillarL: '#c08a8a', plank: '#8a6a4a', plankD: '#4a3420', plankL: '#b89a78' },
  };

  function tile(theme, kind, frame = 0) {
    const T = THEMES[theme];
    return sprite(`t_${theme}_${kind}_${frame}`, 16, 16, r => {
      switch (kind) {
        case 'ground': case 'groundTop': {
          r(0, 0, 16, 16, T.dirt);
          const rand = rng(7);
          for (let i = 0; i < 9; i++) { r(Math.floor(rand() * 15), Math.floor(rand() * 15), 2, 1, T.dirtD); }
          for (let i = 0; i < 5; i++) { r(Math.floor(rand() * 15), Math.floor(rand() * 15), 1, 1, T.dirtL); }
          if (kind === 'groundTop') {
            r(0, 0, 16, 4, T.top); r(0, 0, 16, 1, T.topL);
            [1, 0, 2, 1, 0, 1, 2, 0, 1, 2, 1, 0, 2, 1, 0, 1].forEach((d, x) => r(x, 4, 1, d, T.top));
            r(0, 4, 16, 1, T.topD); r(3, 1, 1, 1, T.topL); r(10, 2, 1, 1, T.topL);
          }
          break;
        }
        case 'brick':
          r(0, 0, 16, 16, T.brick);
          r(0, 7, 16, 1, T.brickD); r(0, 15, 16, 1, T.brickD);
          r(7, 0, 1, 7, T.brickD); r(15, 0, 1, 7, T.brickD); r(3, 8, 1, 7, T.brickD); r(11, 8, 1, 7, T.brickD);
          r(0, 0, 7, 1, T.brickL); r(8, 0, 7, 1, T.brickL); r(0, 8, 3, 1, T.brickL); r(4, 8, 7, 1, T.brickL); r(12, 8, 4, 1, T.brickL);
          break;
        case 'mystery': {
          r(0, 0, 16, 16, '#8a4f08'); r(1, 1, 14, 14, '#f4b41a'); r(1, 1, 14, 1, '#ffe08a'); r(1, 1, 1, 14, '#ffe08a');
          r(1, 14, 14, 1, '#c07a0a'); r(14, 1, 1, 14, '#c07a0a');
          [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => r(x, y, 1, 1, '#8a4f08'));
          const col = ['#ffffff', '#fff4c0', '#ffc94a', '#fff4c0'][frame];
          [2, 4, 6, 8, 8, 6, 4, 2].forEach((w, i) => { r(9 - w / 2, 5 + i, w, 1, '#a0600a'); r(8 - w / 2, 4 + i, w, 1, col); });
          break;
        }
        case 'used':
          r(0, 0, 16, 16, '#4e3420'); r(1, 1, 14, 14, '#9a7350'); r(1, 1, 14, 1, '#b89070');
          [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => r(x, y, 1, 1, '#4e3420'));
          break;
        case 'solid':
          r(0, 0, 16, 16, T.block); r(0, 0, 16, 2, T.blockL); r(0, 0, 2, 16, T.blockL);
          r(0, 14, 16, 2, T.blockD); r(14, 0, 2, 16, T.blockD); r(4, 4, 8, 8, T.blockD); r(5, 5, 6, 6, T.block);
          break;
        case 'pillarTop':
          r(1, 6, 14, 10, T.pillar); r(4, 6, 1, 10, T.pillarD); r(8, 6, 1, 10, T.pillarD); r(11, 6, 1, 10, T.pillarD);
          r(2, 6, 1, 10, T.pillarL); r(1, 6, 1, 10, T.pillarD); r(14, 6, 1, 10, T.pillarD);
          r(0, 0, 16, 6, T.pillar); r(0, 0, 16, 1, T.pillarL); r(0, 5, 16, 1, T.pillarD); r(0, 0, 1, 6, T.pillarD); r(15, 0, 1, 6, T.pillarD);
          r(0, 2, 16, 1, T.pillarL);
          break;
        case 'pillar':
          r(1, 0, 14, 16, T.pillar); r(4, 0, 1, 16, T.pillarD); r(8, 0, 1, 16, T.pillarD); r(11, 0, 1, 16, T.pillarD);
          r(2, 0, 1, 16, T.pillarL); r(1, 0, 1, 16, T.pillarD); r(14, 0, 1, 16, T.pillarD);
          break;
        case 'plank':
          r(0, 0, 16, 5, T.plank); r(0, 0, 16, 1, T.plankL); r(0, 4, 16, 1, T.plankD);
          r(2, 2, 1, 1, T.plankD); r(13, 2, 1, 1, T.plankD); r(7, 0, 1, 5, T.plankD);
          break;
        case 'spikes':
          r(0, 14, 16, 2, '#55556a');
          for (let i = 0; i < 4; i++) {
            const x = i * 4;
            r(x + 1, 6, 2, 2, '#ffffff'); r(x + 1, 8, 2, 2, '#d0d0dc'); r(x, 10, 4, 4, '#b0b0c0'); r(x + 3, 10, 1, 4, '#70708a');
          }
          break;
      }
    });
  }
  // Lava surface has transparency above the wave, so it is built separately.
  function lavaTop(frame) {
    return sprite('lavatop' + frame, 16, 16, (r, g) => {
      for (let x = 0; x < 16; x++) {
        const h = 5 + Math.round(Math.sin((x + frame * 2) / 16 * Math.PI * 2) * 2);
        r(x, h, 1, 16 - h, '#ff4a12'); r(x, h, 1, 2, '#ffd040');
        if ((x + frame) % 6 === 0) r(x, h + 4, 1, 1, '#ffa030');
      }
    });
  }
  function lava(frame) {
    return sprite('lava' + frame, 16, 16, r => {
      r(0, 0, 16, 16, '#ff4a12');
      for (let i = 0; i < 6; i++) r((i * 7 + frame * 2) % 16, (i * 5 + frame) % 16, 2, 1, '#ff8a2a');
    });
  }

  // ---------------- Misc sprites ----------------
  const platform = (kind, theme) => sprite(`plat_${kind}_${theme}`, 16, 8, r => {
    const sky = theme === 'sky';
    const base = kind === 'fall' ? '#d06a4a' : sky ? '#ffffff' : '#c8a060';
    const dark = kind === 'fall' ? '#7a2a1a' : sky ? '#c8b8d8' : '#6a4a20';
    const light = kind === 'fall' ? '#ffa080' : sky ? '#ffffff' : '#f0d090';
    r(0, 0, 16, 8, base); r(0, 0, 16, 1, light); r(0, 7, 16, 1, dark);
    if (!sky) { r(2, 3, 2, 2, dark); r(12, 3, 2, 2, dark); } else { r(0, 5, 16, 2, '#e8dcf0'); }
  });

  const hudCoin = () => sprite('hudcoin', 8, 8, r => pix(r, [
    '..kkkk..',
    '.khhhyk.',
    'khwyyyYk',
    'khyrryYk',
    'khyrryYk',
    'khyyyYYk',
    '.kYYYYk.',
    '..kkkk..',
  ], 0, 0, COIN_PAL));
  const hudHead = () => sprite('hudhead', 12, 9, r => pix(r, HERO_HEAD.map(row => row.slice(4)), 0, 0, HERO_BASE));

  // ---------------- Backgrounds ----------------
  const BG_W = 512;
  const bgCache = {};
  function layer(key, h, fn) {
    if (!bgCache[key]) { const c = mk(BG_W, h); fn(c.getContext('2d')); bgCache[key] = c; }
    return bgCache[key];
  }
  function hillPath(g, baseY, amp, period, phase, color) {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, 240);
    for (let x = 0; x <= BG_W; x += 4) {
      const y = baseY - Math.abs(Math.sin((x / BG_W) * Math.PI * period + phase)) * amp;
      g.lineTo(x, Math.round(y));
    }
    g.lineTo(BG_W, 240); g.closePath(); g.fill();
  }
  function cloud(g, x, y, s, col) {
    g.fillStyle = col;
    const blobs = [[0, 6, 10], [10, 0, 12], [24, 4, 10], [8, 8, 14], [-8, 10, 8]];
    blobs.forEach(([bx, by, br]) => {
      for (const dx of [0, -BG_W, BG_W]) { g.beginPath(); g.arc(x + bx * s + dx, y + by * s, br * s, 0, Math.PI * 2); g.fill(); }
    });
  }
  function mountains(g, baseY, color, snow, rand, count, hMin, hMax) {
    for (let i = 0; i < count; i++) {
      const cx = rand() * BG_W, hw = 40 + rand() * 50, h = hMin + rand() * (hMax - hMin);
      for (const dx of [0, -BG_W, BG_W]) {
        g.fillStyle = color; g.beginPath(); g.moveTo(cx - hw + dx, baseY); g.lineTo(cx + dx, baseY - h); g.lineTo(cx + hw + dx, baseY); g.fill();
        if (snow) { g.fillStyle = snow; g.beginPath(); g.moveTo(cx + dx, baseY - h); g.lineTo(cx - hw * 0.25 + dx, baseY - h * 0.75); g.lineTo(cx + dx, baseY - h * 0.8); g.lineTo(cx + hw * 0.25 + dx, baseY - h * 0.75); g.fill(); }
      }
    }
  }

  function backgroundLayers(theme) {
    const H = 224;
    if (theme === 'meadow') return {
      sky: ['#5cc4f2', '#c8eeff'],
      layers: [
        { f: 0.05, drift: 0.08, c: layer('m_clouds', H, g => { const rd = rng(3); for (let i = 0; i < 6; i++) cloud(g, rd() * BG_W, 20 + rd() * 50, 0.8 + rd() * 0.5, 'rgba(255,255,255,0.9)'); }) },
        { f: 0.15, c: layer('m_mtn', H, g => mountains(g, 170, '#9fcfe6', '#f4fbff', rng(11), 7, 50, 100)) },
        { f: 0.35, c: layer('m_hill', H, g => { hillPath(g, 190, 40, 3, 0.4, '#86d56c'); hillPath(g, 206, 26, 5, 1.2, '#5fbb4c'); }) },
      ] };
    if (theme === 'cave') return {
      sky: ['#0e0b20', '#251d48'],
      layers: [
        { f: 0.15, c: layer('c_far', H, g => {
          const rd = rng(5); g.fillStyle = '#1e1840';
          for (let i = 0; i < 18; i++) { const x = rd() * BG_W, w = 10 + rd() * 20, h = 30 + rd() * 70; g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x, h); g.lineTo(x + w, 0); g.fill(); }
          for (let i = 0; i < 14; i++) { const x = rd() * BG_W, w = 10 + rd() * 24, h = 30 + rd() * 60; g.beginPath(); g.moveTo(x - w, H); g.lineTo(x, H - h); g.lineTo(x + w, H); g.fill(); }
        }) },
        { f: 0.35, c: layer('c_near', H, g => {
          const rd = rng(9);
          for (let i = 0; i < 12; i++) {
            const x = rd() * BG_W, y = 120 + rd() * 90, s = 4 + rd() * 8;
            g.fillStyle = ['#3a2f7a', '#2a5a8a', '#5a2f7a'][i % 3];
            g.beginPath(); g.moveTo(x, y - s * 3); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.fill();
            g.fillStyle = 'rgba(140,220,255,0.7)'; g.fillRect(Math.round(x), Math.round(y - s * 2), 1, 2);
          }
        }) },
      ] };
    if (theme === 'sky') return {
      sky: ['#ff8a6a', '#ffe0a8'], sun: true,
      layers: [
        { f: 0.08, drift: 0.05, c: layer('s_far', H, g => { const rd = rng(21); for (let i = 0; i < 8; i++) cloud(g, rd() * BG_W, 40 + rd() * 90, 0.9 + rd() * 0.6, 'rgba(255,190,170,0.75)'); }) },
        { f: 0.25, drift: 0.12, c: layer('s_mid', H, g => { const rd = rng(33); for (let i = 0; i < 7; i++) cloud(g, rd() * BG_W, 120 + rd() * 80, 1.2 + rd() * 0.8, 'rgba(255,240,230,0.85)'); }) },
      ] };
    return {
      sky: ['#14060c', '#3e1018'],
      layers: [
        { f: 0.12, c: layer('k_far', H, g => {
          const rd = rng(41); g.fillStyle = '#26080f';
          for (let i = 0; i < 9; i++) {
            const x = rd() * BG_W, w = 18 + rd() * 22, h = 60 + rd() * 80;
            for (const dx of [0, -BG_W, BG_W]) {
              g.fillRect(x + dx, H - h, w, h);
              for (let k = 0; k < w; k += 6) g.fillRect(x + dx + k, H - h - 5, 4, 5);
            }
          }
        }) },
        { f: 0.3, c: layer('k_near', H, g => {
          for (let i = 0; i < 4; i++) {
            const x = i * 128 + 20; g.fillStyle = '#3a1219'; g.fillRect(x, 40, 22, H - 40);
            g.fillStyle = '#ff7a3a'; g.fillRect(x + 8, 80, 6, 10); g.fillStyle = '#ffb060'; g.fillRect(x + 10, 82, 2, 6);
          }
        }) },
      ] };
  }

  return {
    sprite, draw, text, textWidth, hero, grumble, beetle, buzzer, hopper, spiker, boss,
    coin, berry, bloom, comet, lifeHeart, fireball, bossFire, spring, tile, lavaTop, lava, platform,
    hudCoin, hudHead, backgroundLayers, BG_W, THEMES, HERO_PALS,
  };
})();
