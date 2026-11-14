// Level data built with a tiny DSL. Tile legend:
//  ' ' empty   '#' ground   'B' brick   'C' multi-gem brick   '?' gem block   'M' power-up block
//  'S' comet block   'H' hidden life block   'E' used block   'X' solid stone
//  'P' pillar cap   'p' pillar body   '-' one-way plank   '^' spikes   'l' lava   'o' gem
const Levels = (() => {
  const H = 14;

  function build(w, info, fn) {
    const g = [];
    for (let y = 0; y < H; y++) g.push(new Array(w).fill(' '));
    const ents = [];
    const L = {
      set(x, y, c) { if (x >= 0 && x < w && y >= 0 && y < H) g[y][x] = c; },
      fill(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) L.set(x, y, c); },
      ground(x0, x1, top = 12) { L.fill(x0, top, x1, H - 1, '#'); },
      row(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== ' ') L.set(x + i, y, s[i]); },
      gems(x, y, n) { for (let i = 0; i < n; i++) L.set(x + i, y, 'o'); },
      arc(x, y, n) { for (let i = 0; i < n; i++) L.set(x + i, y - Math.round(Math.sin(Math.PI * i / (n - 1)) * 2), 'o'); },
      stairs(x, h, dir = 1, floor = 11) {
        for (let i = 0; i < h; i++) { const ht = dir > 0 ? i + 1 : h - i; L.fill(x + i, floor - ht + 1, x + i, floor, 'X'); }
      },
      pillar(x, h, floor = 11, wd = 2) {
        const top = floor - h + 1;
        for (let i = 0; i < wd; i++) { L.set(x + i, top, 'P'); L.fill(x + i, top + 1, x + i, floor, 'p'); }
      },
      e(type, x, y, o = {}) { ents.push(Object.assign({ type, x, y }, o)); },
    };
    const meta = { start: [2, 11] };
    fn(L, meta);
    return Object.assign({ w, h: H, rows: g.map(r => r.join('')), ents, start: meta.start }, info);
  }

  const list = [];

  // ---------------- 1: Sunny Meadow ----------------
  list.push(build(212, { name: 'SUNNY MEADOW', theme: 'meadow', music: 'meadow', time: 300 }, (L, m) => {
    m.start = [3, 11];
    L.ground(0, 60);
    L.arc(8, 9, 5);
    L.row(14, 8, '?M?');
    L.e('grumble', 22, 11);
    L.row(27, 9, '-----'); L.gems(28, 8, 3);
    L.pillar(35, 3);
    L.e('grumble', 41, 11); L.e('grumble', 43, 11);
    L.pillar(48, 2);
    L.row(52, 8, 'BCB');
    L.e('spring', 57, 11); L.set(57, 3, 'o'); L.set(57, 4, 'o'); L.set(57, 5, 'o');
    // gap 61-62
    L.ground(63, 130);
    L.e('hopper', 70, 11);
    L.row(73, 8, 'B?B?B');
    L.e('grumble', 79, 11); L.e('grumble', 81, 11);
    L.set(84, 8, 'H');
    L.e('checkpoint', 88, 11);
    L.e('grumble', 92, 11);
    L.pillar(96, 3);
    L.row(101, 8, '-------'); L.fill(103, 11, 107, 11, '^'); L.gems(102, 7, 5);
    L.e('beetle', 112, 11);
    L.row(116, 8, 'BB?BB'); L.row(117, 4, 'BSB');
    L.e('grumble', 120, 11); L.e('grumble', 122, 11);
    // gap 131-135 with a stepping column
    L.fill(133, 10, 133, 13, 'X');
    L.ground(136, 161);
    L.e('grumble', 140, 11); L.e('grumble', 142, 11); L.e('grumble', 144, 11);
    L.e('hopper', 150, 11);
    L.stairs(156, 4, 1); L.fill(160, 8, 161, 11, 'X');
    // gap 162-164
    L.ground(165, 211);
    L.stairs(165, 4, -1);
    L.pillar(174, 2);
    L.gems(177, 8, 5);
    L.e('grumble', 179, 11); L.e('beetle', 183, 11);
    L.stairs(188, 6, 1);
    L.arc(194, 4, 4);
    L.e('portal', 202, 9);
  }));

  // ---------------- 2: Crystal Caverns ----------------
  list.push(build(200, { name: 'CRYSTAL CAVERNS', theme: 'cave', music: 'cave', time: 300 }, (L, m) => {
    m.start = [2, 11];
    L.fill(0, 0, 199, 1, '#');
    L.ground(0, 45);
    L.row(7, 8, '?M?');
    L.e('grumble', 14, 11); L.e('grumble', 16, 11);
    L.fill(20, 9, 21, 11, 'B');
    L.gems(23, 11, 3);
    L.row(27, 8, 'BBCBB');
    L.e('spiker', 31, 11);
    L.fill(34, 2, 35, 7, 'B');
    L.e('beetle', 38, 11);
    L.pillar(42, 2);
    // pit 46-50 with planks
    L.row(47, 9, '---');
    L.ground(51, 90);
    L.e('hopper', 55, 11);
    L.row(58, 8, 'BMB');
    L.e('grumble', 62, 11); L.e('grumble', 64, 11); L.e('spiker', 70, 11);
    L.fill(74, 2, 86, 8, '#'); L.gems(76, 10, 8);
    L.e('beetle', 82, 11);
    L.e('checkpoint', 89, 11);
    // long pit 91-107 with falling platforms
    L.e('fall', 92, 9, { w: 3 }); L.e('fall', 97, 8, { w: 3 }); L.e('fall', 102, 9, { w: 3 });
    L.gems(97, 6, 3);
    L.ground(108, 150);
    L.e('plat', 114, 10, { w: 2, dy: -5, speed: 0.02 });
    L.row(118, 5, 'BBBBBBBBB'); L.gems(119, 4, 7);
    L.e('spiker', 122, 11); L.e('grumble', 128, 11); L.e('grumble', 130, 11);
    L.set(133, 8, 'H');
    L.row(136, 8, '?B?B?');
    L.e('hopper', 141, 11);
    L.stairs(147, 4, 1);
    // pit 151-154
    L.ground(155, 199);
    L.fill(155, 8, 156, 11, 'X');
    L.e('beetle', 162, 11); L.e('beetle', 166, 11);
    L.row(170, 8, 'BBSBB');
    L.e('grumble', 175, 11); L.e('spiker', 180, 11);
    L.pillar(184, 3);
    L.arc(187, 8, 4);
    L.e('portal', 193, 9);
  }));

  // ---------------- 3: Sunset Skyway ----------------
  list.push(build(232, { name: 'SUNSET SKYWAY', theme: 'sky', music: 'sky', time: 300 }, (L, m) => {
    m.start = [2, 11];
    L.ground(0, 16);
    L.arc(5, 9, 4);
    L.row(10, 8, '?M?');
    L.e('grumble', 14, 11);
    L.e('plat', 17, 10, { w: 3, dx: 3, speed: 0.025 });
    L.ground(23, 34, 10);
    L.e('buzzer', 28, 6);
    L.e('spring', 33, 9); L.gems(33, 2, 1); L.gems(33, 3, 1);
    L.ground(39, 44, 7);
    L.gems(40, 6, 4);
    L.ground(46, 58, 11);
    L.e('beetle', 52, 10);
    L.row(48, 7, 'B?BCB');
    // big gap 59-71
    L.e('plat', 59, 9, { w: 3, dx: 4, speed: 0.02 });
    L.e('plat', 66, 7, { w: 2, dy: 4, speed: 0.03 });
    L.e('buzzer', 63, 4);
    L.gems(66, 4, 2);
    L.ground(72, 90, 10);
    L.e('checkpoint', 74, 9);
    L.e('hopper', 80, 9); L.e('grumble', 84, 9); L.e('grumble', 86, 9);
    L.row(79, 6, '------'); L.gems(80, 5, 4);
    // gap 91-96 falling platforms
    L.e('fall', 91, 9, { w: 2 }); L.e('fall', 94, 8, { w: 2 });
    L.ground(97, 110, 9);
    L.e('buzzer', 102, 5); L.e('buzzer', 107, 3);
    L.row(102, 5, 'BSB');
    // gap 111-125 vertical platforms
    L.e('plat', 112, 10, { w: 2, dy: -4, speed: 0.03 });
    L.e('plat', 117, 6, { w: 2, dy: 4, speed: 0.03 });
    L.e('plat', 122, 10, { w: 2, dy: -4, speed: 0.035 });
    L.gems(117, 3, 2);
    L.ground(126, 145, 11);
    L.e('spiker', 131, 10); L.e('beetle', 138, 10);
    L.row(133, 7, '?H?');
    L.pillar(142, 2, 10);
    // gap 146-160 long ride
    L.e('plat', 146, 9, { w: 3, dx: 10, speed: 0.012 });
    L.e('buzzer', 152, 5);
    L.arc(150, 6, 6);
    L.ground(161, 175, 9);
    L.e('grumble', 165, 8); L.e('hopper', 170, 8);
    L.e('spring', 174, 8);
    L.gems(178, 2, 4);
    // gap 176-185 (spring or the small plank)
    L.row(179, 8, '--');
    L.ground(186, 231, 11);
    L.e('beetle', 190, 10);
    L.stairs(196, 5, 1, 10);
    L.arc(202, 4, 5);
    L.e('portal', 215, 8);
  }));

  // ---------------- 4: Ember Fortress ----------------
  list.push(build(200, { name: 'EMBER FORTRESS', theme: 'castle', music: 'castle', time: 300, boss: true }, (L, m) => {
    m.start = [2, 11];
    L.fill(0, 0, 199, 1, '#');
    L.ground(0, 20);
    L.row(8, 8, '?M?');
    L.e('grumble', 15, 11);
    L.fill(21, 12, 25, 13, 'l');
    L.ground(26, 50);
    L.set(32, 8, 'X'); L.e('firebar', 32, 8, { len: 5, speed: 0.04 });
    L.e('spiker', 38, 11);
    L.fill(42, 2, 44, 7, '#');
    L.set(47, 8, 'X'); L.e('firebar', 47, 8, { len: 5, speed: -0.05 });
    L.fill(51, 12, 58, 13, 'l'); L.row(54, 9, 'XX');
    L.ground(59, 90);
    L.e('beetle', 64, 11);
    L.row(66, 8, 'BMB');
    L.e('grumble', 68, 11); L.e('grumble', 70, 11);
    L.fill(74, 9, 75, 11, 'X');
    L.set(80, 6, 'X'); L.e('firebar', 80, 6, { len: 6, speed: 0.035 });
    L.gems(77, 11, 6);
    L.e('checkpoint', 86, 11);
    L.fill(91, 12, 104, 13, 'l');
    L.e('plat', 92, 9, { w: 3, dx: 8, speed: 0.02 });
    L.gems(94, 6, 6);
    L.ground(105, 140);
    L.fill(108, 9, 108, 11, 'X');
    L.e('spiker', 115, 11); L.e('spiker', 121, 11);
    L.set(118, 7, 'X'); L.e('firebar', 118, 7, { len: 6, speed: 0.045 });
    L.fill(125, 11, 129, 11, '^'); L.row(124, 8, '-------'); L.gems(125, 7, 5);
    L.row(132, 8, '?S?');
    L.e('beetle', 135, 11);
    L.fill(141, 12, 146, 13, 'l'); L.row(143, 9, 'XX');
    L.ground(147, 199);
    L.e('grumble', 152, 11); L.e('grumble', 154, 11);
    L.row(156, 8, 'M');
    L.fill(162, 2, 163, 8, '#');
    L.e('boss', 186, 10);
    L.e('portal', 196, 9, { locked: true });
  }));

  return { list, H };
})();
