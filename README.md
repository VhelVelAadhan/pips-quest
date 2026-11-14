# Pip's Quest

A pixel-art platformer that runs in the browser. Guide Pip the fox through four stages — Sunny Meadow, Crystal Caverns, Sunset Skyway and Ember Fortress — and defeat King Grumblor.

**Play:** https://pips-quest.vercel.app (also on GitHub Pages: https://vhelvelaadhan.github.io/pips-quest/)

Works on phones (touch controls; turn the phone sideways), computers (keyboard) and with gamepads. On a phone you can use **Add to Home Screen** to launch it full screen like an app.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrows / A D | ◀ ▶ (holding runs automatically) |
| Jump (hold for higher) | Z / Space / W / Up | A |
| Run / throw fire | X / Shift | B |
| Crouch | Down / S | ▼ |
| Pause | P / Esc / Enter | II |
| Mute | M | ♪ |

## Project layout

- `index.html`, `css/`, `js/` — the game (plain HTML5 canvas, no libraries or build step needed to play locally)
- `tools/build-site.js` — builds a deployable copy with app icons and a web app manifest
- `docs/` — the built site that GitHub Pages serves

## Updating the live site

```bash
node tools/build-site.js docs
git add -A
git commit -m "Update game"
git push
```

GitHub Pages republishes automatically about a minute after the push.
