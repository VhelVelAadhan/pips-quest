# Pip's Quest: social media kit

Game link: **https://pips-quest.vercel.app**

## Which file goes where

| File | Size | Use it for |
| --- | --- | --- |
| `videos/reel-vertical-1080x1920.mp4` | 9:16, 22 s, with music | Instagram Reels and Stories, LinkedIn video posted from a phone |
| `videos/feed-square-1080x1080.mp4` | 1:1, 22 s, with music | LinkedIn feed video, Instagram feed video |
| `posters/instagram-post-1080x1350.png` | 4:5 | Instagram feed post (first image of a carousel) |
| `posters/instagram-linkedin-square-1080x1080.png` | 1:1 | Boss poster: Instagram carousel slide 2, or a LinkedIn image post |
| `posters/instagram-story-1080x1920.png` | 9:16 | Instagram Story (add a link sticker in the open sky at the top) |
| `posters/linkedin-landscape-1200x627.png` | 1.91:1 | LinkedIn image post or link preview |

Both videos use real gameplay from the game, with its own chiptune music and sound effects.

---

## LinkedIn

**Recommended:** post `feed-square-1080x1080.mp4` as a native video with this text. LinkedIn shows native video bigger than a link preview.

```
I made a small retro game: Pip's Quest 🦊

It's a pixel-art platformer that runs right in your browser. No download, no sign-up. Guide Pip the fox through four levels, then take on King Grumblor in the final fortress.

What went into it:
• Plain JavaScript and HTML5 canvas, no game engine or libraries
• All pixel art drawn in code; chiptune music and sound effects synthesized live with the Web Audio API
• Touch controls on phones, keyboard and gamepad on desktop
• Installable to your home screen, hosted on Vercel

Play free: https://pips-quest.vercel.app

Tell me your best score, and which level gave you the most trouble.

#GameDev #JavaScript #IndieGame #PixelArt #WebDevelopment #HTML5
```

Optional line to add if you want to mention how it was built:

```
Built with Claude Code as my pair programmer.
```

**Shorter version** (works well with `linkedin-landscape-1200x627.png`):

```
Weekend project shipped 🎮 Pip's Quest is a retro pixel platformer you can play in any browser, on phone or desktop. Four levels, a boss fight, and chiptune music made entirely in code.

▶ https://pips-quest.vercel.app

#GameDev #JavaScript #IndieGame #PixelArt
```

---

## Instagram

Links in Instagram captions aren't clickable, so put **pips-quest.vercel.app** in your bio, or use a link sticker on Stories.

**Reel caption** (with `reel-vertical-1080x1920.mp4`):

```
Meet Pip 🦊 Run, jump and stomp through 4 pixel worlds, then face King Grumblor 👑🔥

🎮 Free to play in your browser, on phone or PC
🔗 Link in bio: pips-quest.vercel.app

Can you beat the boss? Drop your score below 👇

#pixelart #indiegame #retrogaming #gamedev #platformer #8bit #browsergame #indiedev #retro #fox
```

**Carousel post caption** (slides: `instagram-post-1080x1350.png`, `instagram-linkedin-square-1080x1080.png`, `feed-square-1080x1080.mp4`):

```
New game drop 🦊✨ Pip's Quest is a retro platformer you can play right in your browser.

➡ Swipe to meet the final boss
🔗 Play free: link in bio

#pixelart #indiegame #retrogaming #gamedev #platformer #8bitart #browsergame
```

**Story:** post `instagram-story-1080x1920.png`, add a **Link** sticker to `https://pips-quest.vercel.app` in the sky above the logo, and add a poll sticker such as "Can you beat King Grumblor? Yes / Not yet".

---

## Tips

- Pick the story poster, or a frame from the end of the reel, as the Reel **cover**.
- The videos already have music. You can still add trending audio in Instagram and lower the original sound.
- Post the Reel first, then share it to your Story with the link sticker.
- To remake the files after changing the game, run `npm install` once, then `npm run render`, in `marketing/studio`.
