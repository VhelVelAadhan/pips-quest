# Pip's Quest: project notes

Original pixel-art platformer for the browser (HTML5 canvas, plain JavaScript, no libraries, no build step to play).
Hero: **Pip the fox**. Four stages: Sunny Meadow, Crystal Caverns, Sunset Skyway, Ember Fortress (boss: King Grumblor).
It is genre-inspired but **original**: keep characters, art, music and level layouts original (not a recreation of any existing game).

## Live links

| Where | URL | How it's deployed |
| --- | --- | --- |
| Vercel (main) | https://pips-quest.vercel.app | Vercel CLI, team `aadhan-labs` (user `selvaxr-7315`), project `pips-quest` |
| GitHub Pages | https://vhelvelaadhan.github.io/pips-quest/ | Repo `VhelVelAadhan/pips-quest`, branch `main`, folder `/docs` |
| Netlify | https://mario4pip.netlify.app | Manual drag-and-drop of `dist/` (free plan shows a "Powered by Netlify" badge; only removable on a paid plan, so don't hide it with CSS) |
| claude.ai Artifact | https://claude.ai/artifact/Gj1qZPeJfVkeNoiiU8km8B | Private; republish `artifact/pips-quest.html` with `js/*.js` (see below) |

The `gh` and `vercel` CLIs are signed in on this PC. Git identity is set in this repo only: `VhelVelAadhan <98093418+VhelVelAadhan@users.noreply.github.com>`.

## Layout

```
index.html            page shell + touch buttons; scripts/css use ?v=N cache-busting (bump N on every change)
css/game.css          page/touch-control styles (dark single-theme, safe-area aware)
js/audio.js           WebAudio synth SFX + chiptune sequencer (songs: meadow, cave, sky, castle, boss, star, title);
                      Sound.renderOffline() renders music + SFX to an AudioBuffer (used by the marketing studio)
js/sprites.js         Gfx: 5x7 pixel font, hero (pixel grids + procedural legs), enemies, coins, tiles, themes, parallax
js/levels.js          Levels.list built with a small DSL (tile legend at top of file)
js/entities.js        physics helpers, Player, enemies (Grumble, Beetle, Buzzer, Hopper, Spiker, Boss), items, platforms, FX
js/game.js            main loop (fixed 60 Hz), states (title/intro/play/dying/clear/gameover/victory), input, HUD, camera
tools/build-site.js   builds a deployable copy with icons + manifest:  node tools/build-site.js [dist|docs|pips-quest]
tools/build-artifact.js  builds artifact/pips-quest.html for claude.ai
docs/                 GitHub Pages build (committed)
dist/, pips-quest/, artifact/, *.zip   local build outputs (git-ignored); pips-quest/.vercel links the Vercel project
marketing/            social media kit: posters/, videos/, captions.md, studio/ (renderer)
.claude/launch.json   local preview server: python -m http.server 8123 (git-ignored)
```

Scripts are classic `<script>` tags with globals (`Sound`, `Gfx`, `Levels`, `TS`, entity classes, `window.PipQuest`) so the game also runs from `file://`.

## Updating and deploying

After changing the game, bump `?v=N` in `index.html`, then:

```bash
# GitHub Pages
node tools/build-site.js docs && git add -A && git commit -m "..." && git push

# Vercel (pips-quest/.vercel is kept between builds)
node tools/build-site.js pips-quest && cd pips-quest && vercel deploy --prod --yes --scope aadhan-labs
# if the link is ever lost: cd pips-quest && vercel link --project pips-quest --scope aadhan-labs --yes

# Netlify: node tools/build-site.js  -> drag dist/ onto the mario4pip project's Deploys page

# claude.ai Artifact: node tools/build-artifact.js, then (in Claude Code) publish artifact/pips-quest.html
# to url https://claude.ai/artifact/Gj1qZPeJfVkeNoiiU8km8B with files js/audio.js, js/sprites.js,
# js/levels.js, js/entities.js, js/game.js
```

## Testing

- Run locally: open `index.html` directly, or start the `pips-quest` preview server (port 8123).
- Console helpers: `PipQuest._warp(levelIndex, checkpointTileX)` jumps to a level; `PipQuest._step(n)` advances n frames
  and renders (deterministic tests: dispatch `KeyboardEvent`s on `window`, then step).
- Phone checks: touch controls appear on load or on the first touch (`enableTouch`); A/B sit above the bottom-right corner so hosting badges don't cover them; landscape moves mute/fullscreen/pause to the bottom center.

## Gameplay tuning notes

- Jump: velocity 5.4 + 0.25*|vx|; every jump gets a 10-frame minimum boost (gravity 0.2) so quick taps clear 2-3 tile gaps; holding jump extends it.
- Walk 1.75, run 2.8 px/frame; coyote time and jump buffer are 8 frames each. On touch screens, holding a direction auto-runs.
- Stomp check: player falling with previous bottom at or above enemy top + 7px; after a stomp the player is snapped above the enemy.

## Marketing studio

`marketing/studio` renders posters and 22 s trailer videos (H.264 + AAC, loudness-normalized) from the real game
using puppeteer-core (drives installed Chrome/Edge headless) and ffmpeg-static:

```bash
cd marketing/studio && npm install && npm run render      # or: npm run posters / npm run videos
```

Layouts and the trailer timeline live in `marketing/studio/studio.js`; post texts are in `marketing/captions.md`.
