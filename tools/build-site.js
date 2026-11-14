// Builds a deployable copy of the game in ./dist (for Netlify or any static host),
// including PNG app icons drawn from Pip's pixel-art head and a web app manifest.
// Usage: node tools/build-site.js          -> builds ./dist (drag-and-drop hosts like Netlify)
//        node tools/build-site.js docs     -> builds ./docs (served by GitHub Pages)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const outName = process.argv[2] || 'dist';
if (!/^[a-z0-9_-]+$/i.test(outName)) throw new Error('Output folder must be a simple name like dist or docs');
const dist = path.join(root, outName);

// ---------- minimal PNG encoder ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- icon art (same pixels as the in-game head) ----------
const HEAD = [
  '.k.....k....',
  'kok...kok...',
  'kpok.kpok...',
  'kohhooooook.',
  'kooooooieok.',
  'kooooooeeok.',
  'kOoooowwwwwn',
  'kOOoowwwwwk.',
  '.kOOwwwwkk..',
];
const PAL = { k: '#2a1206', o: '#f27a26', O: '#c4531a', h: '#ffb066', w: '#fff3dc', e: '#1a0c06', i: '#ffffff', n: '#1a0c06', p: '#ff9aa0' };
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function icon(size, withScene) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, rgb, a = 255) => { const o = (y * size + x) * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = a; };
  if (withScene) {
    const skyTop = hex('#5cc4f2'), skyBot = hex('#c8eeff'), grass = hex('#57c53c'), dirt = hex('#c27a3e');
    const groundY = Math.round(size * 0.78);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (y < groundY) set(x, y, mix(skyTop, skyBot, y / groundY));
      else if (y < groundY + Math.max(2, Math.round(size * 0.04))) set(x, y, grass);
      else set(x, y, dirt);
    }
  }
  const scale = Math.floor((size * 0.62) / 12);
  const w = 12 * scale, h = 9 * scale;
  const ox = Math.round((size - w) / 2), oy = withScene ? Math.round(size * 0.78) - h - scale : Math.round((size - h) / 2);
  HEAD.forEach((row, ry) => [...row].forEach((ch, rx) => {
    const c = PAL[ch]; if (!c) return;
    const rgb = hex(c);
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) set(ox + rx * scale + x, oy + ry * scale + y, rgb);
  }));
  return encodePNG(size, size, px);
}

// ---------- build ----------
// Clear the old build but keep host link folders (e.g. .vercel, which tells the Vercel CLI which project to update).
const KEEP = new Set(['.vercel', '.netlify', '.gitignore']);
if (fs.existsSync(dist)) {
  for (const f of fs.readdirSync(dist)) if (!KEEP.has(f)) fs.rmSync(path.join(dist, f), { recursive: true, force: true });
}
for (const d of ['js', 'css', 'icons']) fs.mkdirSync(path.join(dist, d), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'js'))) fs.copyFileSync(path.join(root, 'js', f), path.join(dist, 'js', f));
fs.copyFileSync(path.join(root, 'css', 'game.css'), path.join(dist, 'css', 'game.css'));
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('</head>', [
  '<meta name="description" content="Guide Pip the fox through four pixel-art stages to King Grumblor\'s fortress. Play with touch, keyboard or gamepad.">',
  '<meta property="og:title" content="Pip\'s Quest">',
  '<meta property="og:description" content="A pixel-art platformer starring Pip the fox. Plays in the browser on phone or computer.">',
  '<link rel="icon" type="image/png" href="icons/favicon.png">',
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '</head>',
].join('\n'));
fs.writeFileSync(path.join(dist, 'index.html'), page);

fs.writeFileSync(path.join(dist, 'icons', 'icon-192.png'), icon(192, true));
fs.writeFileSync(path.join(dist, 'icons', 'icon-512.png'), icon(512, true));
fs.writeFileSync(path.join(dist, 'icons', 'apple-touch-icon.png'), icon(180, true));
fs.writeFileSync(path.join(dist, 'icons', 'favicon.png'), icon(32, false));

fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
  name: "Pip's Quest",
  short_name: "Pip's Quest",
  description: 'Guide Pip the fox through four pixel-art stages to King Grumblor\'s fortress.',
  start_url: './',
  scope: './',
  display: 'fullscreen',
  orientation: 'landscape',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2));

// Netlify: always serve fresh HTML; scripts are cache-busted by ?v= in index.html.
fs.writeFileSync(path.join(dist, '_headers'), [
  '/index.html', '  Cache-Control: no-cache', '/', '  Cache-Control: no-cache',
  '/manifest.webmanifest', '  Content-Type: application/manifest+json', '',
].join('\n'));

// Vercel: same caching rule as _headers (fresh HTML; scripts are cache-busted by ?v=).
fs.writeFileSync(path.join(dist, 'vercel.json'), JSON.stringify({
  cleanUrls: true,
  headers: [
    { source: '/', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/manifest.webmanifest', headers: [{ key: 'Content-Type', value: 'application/manifest+json' }] },
  ],
}, null, 2));

// GitHub Pages: serve files as-is (no Jekyll processing).
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const list = [];
(function walk(d, rel = '') { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, rel + f + '/') : list.push(rel + f + '  ' + fs.statSync(p).size + 'B'); } })(dist);
console.log(`Built ${outName}/:\n  ` + list.join('\n  '));
