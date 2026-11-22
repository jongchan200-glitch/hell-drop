# 지옥 낙하 · HELL FALL WEB 0.3

## Current live build
- Public site: https://jongchan200-glitch.github.io/hell-drop/
- v0.3 — rhythmic fold-to-dive gameplay implemented; original V4.2 art and profile kept.
- Left button `망토 접기`: each distinct tap folds the cape and adds speed. Holding is one tap only. The cape unfolds and the fall slows naturally when tapping ends.
- Right button `벽 점프`: swap walls once on press, with the original short hop.
- Visuals: original V4.2 glide/jump/intro/impact sprites, plus two newly generated consistent illustrated phases `assets/hero_fold.webp`, `assets/hero_dive.webp`. Animated crossfade by cape fold, enhanced speed airflow, and a fold meter.
- Maintains 10-second clock, depth zones, collision and time gates, highscores under the original `hell_fall_web_v42_best` localStorage key.
- This is a web test build, not user-approved final release. Actual Galaxy gameplay balancing remains to be evaluated.

## Controls
Touch: rapid TAP left to accelerate; tap right to switch walls. Stop tapping to slow. Hold does **not** continuously accelerate.
Keyboard: tap Space repeatedly to accelerate, Right Arrow to jump, Enter to start/retry.

## Source and backups
- Main branch remains the **single** live source, with GitHub Pages `main / (root)` published.
- Earlier v0.2 full source is preserved in Git history. The V4.2 native backup is preserved in Google Drive.
- All artworks in this repository have been authorized for publication by their creator.
- Gameplay music, advertisement/coins, online rankings, and Android packaging remain unimplemented.

## Testing
- Node syntax check and Chromium mobile-viewport automated tests: startup, sprite loading, idle speed, one tap, press-and-hold exactly one event, fast multi-tap speed boost, relaxation, wall jump, no JS errors.
- Real-world phone timing, difficulty and user approval remain pending.