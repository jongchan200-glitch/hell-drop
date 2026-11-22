# Hell Fall — browser restoration (WEB 0.1)

2026-11-22. Playable web reconstruction based on the previously archived Android/Kotlin V4.2 game rules. This is a **test version**, not a final release.

## Launch

Open `index.html` in a modern desktop/mobile browser, or host the folder through a static web server. No server API and no external dependencies are required. The game uses a Canvas, `game.js` and `style.css`. The optional original test sprites **are not included in this public repository**; the game renders a generic character when `assets/hero_*.png` are absent.

## Controls

- Mobile: **hold the left button** for cape braking; **tap the right button** to leap from one wall to the other.
- Desktop: **Space** = brake while held, **Right Arrow** = jump, **Enter** = start/restart.
- A time orb is collected only on its wall. Hazards must be dodged by switching walls. Best depth is stored in browser local storage.

## Origin / preserved V4.2 rules

- Intro, fall, collision/game over, retry; fixed time limit of 10s, time pickup increases it; 2,000m difficulty tiers and seven 5,000m environments; obstacles are seeded per attempt, do not reshuffle each frame; collision uses a swept depth check.
- Physics constants trace to the V4.2 backup; this web build is an independent translation, not a verified byte-equivalent native build.
- A **later proposed** mechanic (cape normally open, tap repeatedly to accelerate) is **not yet implemented**; it will be a separate reviewed change.
- Difficulty preset menu, online rankings, revive tickets, shared/free coins, ads and backend are also not implemented.

## Privacy

Original V4.2 sprites and documentation were from a private family prototype and may be identifying. They have **not** been published to this GitHub repository. Do not add personal names, school information, family photos, API secrets, or original private sprites to the public history. Public builds use only the generic fallback artwork.

## Development status

Local Chromium smoke test: start, stage transition, wall jump, cape braking, and console error checks passed. Original sprite version was also tested locally but remains private. Real Galaxy hands-on test and user acceptance remain pending. No Play Store release.

Project Google Drive handoff is maintained separately and describes older V3/V4/V4.1/V4.2 native backups and future plans.

## Web preview

GitHub Pages source: `main` branch, `/ (root)`. Once deployment succeeds, the browser test URL is https://jongchan200-glitch.github.io/hell-drop/ . This is a work-in-progress preview, not the final approved release.
