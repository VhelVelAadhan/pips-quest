// Renders Pip's Quest social posters (PNG) and trailer videos (MP4, H.264 + AAC) into ../posters and ../videos.
// Usage (in marketing/studio):  npm install   then   node render.js [posters|videos|all]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpegPath = require('ffmpeg-static');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..');
const BROWSER = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => p && fs.existsSync(p));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function ffmpeg(args) {
  const proc = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr.on('data', d => { err += d; });
  proc.done = new Promise((resolve, reject) => proc.on('close', code => (code === 0 ? resolve() : reject(new Error('ffmpeg failed: ' + err.slice(-1500))))));
  return proc;
}

async function main() {
  const which = process.argv[2] || 'all';
  if (!BROWSER) throw new Error('Chrome or Edge not found. Set CHROME_PATH to your browser executable.');
  for (const d of ['posters', 'videos']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

  const srv = await serve();
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--mute-audio'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('page console:', m.text()); });
    await page.goto(`http://127.0.0.1:${srv.address().port}/marketing/studio/studio.html`, { waitUntil: 'load' });
    await page.waitForFunction('window.Studio && window.Studio.ready', { timeout: 20000 });

    if (which === 'all' || which === 'posters') {
      const names = await page.evaluate(() => Object.keys(Studio.posters));
      for (const name of names) {
        const b64 = await page.evaluate(n => Studio.poster(n), name);
        const file = path.join(OUT, 'posters', name + '.png');
        fs.writeFileSync(file, Buffer.from(b64, 'base64'));
        console.log('poster  ', path.relative(ROOT, file));
      }
    }

    if (which === 'all' || which === 'videos') {
      const layouts = await page.evaluate(() => Studio.layouts);
      for (const name of layouts) {
        const info = await page.evaluate(n => Studio.startVideo(n), name);
        const silent = path.join(OUT, 'videos', name + '.silent.mp4');
        const enc = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'png', '-i', '-',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(info.fps), silent]);
        for (let i = 0; ; i++) {
          const b64 = await page.evaluate(() => Studio.nextFrame());
          if (!b64) break;
          if (!enc.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => enc.stdin.once('drain', r));
          if (i % 30 === 0) process.stdout.write(`\rvideo    ${name}: frame ${i}/${info.frames}   `);
        }
        enc.stdin.end();
        await enc.done;
        const { wav, sfx } = await page.evaluate(() => Studio.audio());
        const wavFile = path.join(OUT, 'videos', name + '.wav');
        fs.writeFileSync(wavFile, Buffer.from(wav, 'base64'));
        const final = path.join(OUT, 'videos', name + '.mp4');
        // Normalize to typical social-video loudness (about -14 LUFS) so it isn't quiet on phones.
        const mux = ffmpeg(['-y', '-i', silent, '-i', wavFile, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
          '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final]);
        mux.stdin.end();
        await mux.done;
        fs.unlinkSync(silent); fs.unlinkSync(wavFile);
        console.log(`\rvideo    ${path.relative(ROOT, final)}  (${info.width}x${info.height}, ${(info.frames / info.fps).toFixed(1)}s, ${sfx} sound effects)`);
      }
    }
  } finally {
    await browser.close();
    srv.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
