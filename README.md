## WEB 1.9 — Progressive TIME LINE balance (2026-11-23)

- Each run begins with 42.0 seconds. Full-width TIME LINE checkpoints grant automatic +14/+12/+10/+8/+7/+6/+5 seconds by zone. Checkpoint spacing increases from 1,450 m to 2,800 m as the depth increases.
- Round clock pickups remain optional. Reaching the correct wall grants +5 seconds early, +4 in the middle, +3 late. Both rewards cap at 42 s. No time can be granted after expiry.
- Spawn ordering reserves safe space around time lines, clocks, coins and hazards; time bonuses can be collected without overlapping a lethal obstacle. Existing hazard collision and item purchase/wardrobe mechanics remain.
- Level-up thresholds grow more slowly; existing players keep earned levels and coins. Saved data is migrated once using a legacy level baseline. SFX peak strengths reduced without modifying user-selected volume or BGM.
- WEB 1.9 gameplay balance is beta. Galaxy physical playtest required before final approval. Existing 8-minute standalone simulator is not synchronized with this beta gameplay yet.

# 지옥 낙하 WEB 0.8 — 리듬게임 클래식 편곡 BGM 연결

실행: https://jongchan200-glitch.github.io/hell-drop/

- V0.7 홈 로비, 캐릭터 모션, 초당 5회 연타 최고 가속 및 빠른 감속, 모든 저장 기록 유지
- 실제 사용자가 만든 클래식 편곡 음원 8개(홈 1 + 7개 지층)를 `audio/*.mp3` 및 `audio/*.m4a`에 저장하고 로컬 파일만 참조
- `systems.js`의 독립 음악 8 슬롯 연결, 2.2초 교차 페이드, 곡별 반복, 음악/효과음 음량 분리
- 첫 사용자 터치 후 홈 음악 시작(모바일 브라우저 자동재생 정책 준수)
- 설정에서 각 지층 음악 미리듣기 ▶ 및 닫을 때 홈 음악 복구
- 다른 리듬게임 프로젝트 및 8분 AI 시뮬레이터 코드는 변경하지 않음
- 실제 플레이 지층 길이/시간/코인 밸런스는 V0.7 그대로. 8분 난이도는 아직 실제 게임에 미적용.
- 이 음원은 게임용 시안이며 원본/편곡의 상업 배포 권리와 반복 재생 완성도는 출시 전 확인해야 함.

파일 출처 및 사용된 각각의 버전은 `audio/README.md` / `audio/TRACKS.json`에 기재.

## WEB 0.9 — 홈 3D 캐릭터 (2026-11-23)
- 홈의 종이같은 CSS 평면 회전을 제거하고 실제 Z 두께·법선·깊이 판정이 있는 WebGL2 캐릭터 스컬프트로 교체. 좌우 360° 회전만 지원하며 상하 회전은 없음.
- 정면은 원본 우서이 `assets/hero_intro.webp`의 얼굴·의상 색상·선화를 그대로 사용. 옆면과 뒷면은 원화에 없으므로 재구성했으며, 아직 뼈대 모델이나 신규 장비 착용 시스템은 아님.
- 자체 렌더러 `hero_3d.js`, 메시 `assets/hero_sculpt.bin.gz`, 추정 뒷면 `assets/hero_back.webp`; 저성능 또는 WebGL2 미지원 환경은 원본 정면 정지 이미지를 사용. 종이 회전은 폴백에서도 삭제.
- 모바일 390×844, 360×640, 430×932 브라우저 렌더링 및 좌우 드래그, 설정과 게임 시작 확인.
- 중요: **V0.8 클래식 BGM 8곡·지층별 전환·설정 미리듣기**, 효과음, 저장된 코인·기록, 인게임 물리, 별도 AI 시뮬레이터 유지.


## WEB 1.0 TEST — New Character Review (2026-11-23)
- User review build. The home-lobby distorted WEB 0.9 sculpt is temporarily replaced with a **four-view illustrated turnaround** based on the newly approved appearance reference (front, 3/4, side, rear). The left viewpoints are mirrored previews, **not a true 3D or rigged character**. Swipe horizontally through 360 degrees to see directional illustrations; no faux 3D mesh stretching.
- Added `hero_turnaround.js`, `hero_turnaround.css`, `assets/turn_*.webp`. The original `hero_3d.js`, `assets/hero_sculpt.bin.gz`, and original sprites remain available for rollback/comparison. Current gameplay sprites remain unchanged.
- Existing gameplay, music 8 tracks, settings, records/coins (localStorage), and independent simulator are untouched.
- Requires user Galaxy review; do not treat this as approved or final 3D. Next version may need true multi-view sculpted rig/model.


## WEB 1.1 TEST — original front/back-only lobby (2026-11-23)
- User rejected the redrawn four-view WEB 1.0 character and its direction-by-direction slideshow. Revert the home display to the original V4.2 front artwork `assets/hero_intro.webp` and the preexisting WEB 0.9 inferred rear artwork `assets/hero_back.webp`.
- On horizontal swipe (32px threshold), alternate **front ↔ back** only. No angled view, faux mesh, deformation, or 360-degree claim. Keyboard arrows/Enter alternate; Home restores front.
- Gameplay sprites and original character files are unchanged; no changes to BGM, gameplay physics, user levels/coins/records, settings, or simulator.
- This is a two-view illustrated toggle, not genuine 3D. Real-device visual QA is pending user review. The older WEB 0.9/1.0 implementations remain in Git history for rollback.


## WEB 1.2 TEST — original front + corrected back artwork (2026-11-23)
- User-reported regression: WEB 1.1 reused a synthetic rear image with hair streaks over the face and shoes facing toward the camera. That image was NOT quality-checked before publishing.
- The home front remains unchanged: `assets/hero_intro.webp` (original approved character art). Replaced only the **home back view** reference with new transparent artwork `assets/hero_back_fixed.webp`: naturally arranged rear-facing wavy hair, red-and-gold cape, tan cargo pants and rear-facing sneaker heel/toe geometry.
- QA before commit: reviewed corrected transparent art against screenshot of approved front side-by-side; inspected alpha/background edges, lower-body shape and shoe heels. This is an illustrated rear view, not a 3D mesh; pose is an artistic approximation. A real browser screenshot and Galaxy touch validation still need to be explicitly confirmed.
- Swipe operation remains strictly front/back, no side pictures. Gameplay, sound, coins, level, records and simulator unchanged. `assets/hero_back.webp` (previous defective asset) preserved only for history, not loaded by the new preview.


## WEB 1.3 TEST — much quieter default music (2026-11-23)
- Initial background music defaults to 7% instead of 26%. The existing BGM slider still allows full 0–100% user adjustment. Effects (SFX) remain unchanged.
- Existing profile with the exact legacy 26% default is migrated to 7% once using `settings.musicDefaultRevision`; custom stored BGM values other than the old default are preserved and any subsequently selected value is retained. Older manually selected 26% cannot be distinguished from an untouched default.
- No changes to the soundtrack list, crossfade, track transitions, game logic, coins, character, settings except the default BGM value, or the simulator.
- This is intentionally only the first volume experiment. Whether automatic music selection should persist across home/play/game over will be reviewed separately after user listening feedback.


## WEB 1.4 — cave terrain, compact controls and uninterrupted game music (2026-11-23)
- Visual cave walls are jagged, layered rock with fissures, facets, embedded mineral specks and shaded cliff edges instead of rulers. Hazard art now has angular rock faces, fractured timber and molten cracks; all original collision logic, wall switching and obstacle placements remain intact.
- Bottom controls visually shrink from a 109px minimum height to 62px (58px on shorter devices), with translucent backplates so approaching hazards remain more visible. Both actions and handedness setting remain unchanged.
- STORM moves from the far lower-right to a small left-side overlay vertically centered near the hero (35% screen height). Parametric spiral animation remains the same.
- Game soundtrack is now a seven-track playlist (zone_01 through zone_07), only active during a game session. Game over, immediate retry, and passing into any new zone NEVER interrupt or restart the current track. On natural end, the next song starts; song 7 wraps to song 1. Leaving via Home stops and resets the playlist; there is no automatic home soundtrack. Seven tracks can still be previewed deliberately inside settings while not in an active session.
- Original default BGM=7%, SFX unchanged, local coins/level/record untouched. Existing two-view character and independent simulator untouched.
- QA: JavaScript parse checks for both changed modules, audio mocked-media tests (off until play, 7% default, preserve timestamp on retry, track advance + wrap, stop and preview), initial 100-frame deterministic mocked 390x844 canvas gameplay smoke test (spawning 11 obstacles, no JS errors) before the commit. Manual visual and audio verification on the real Galaxy remains pending.


## WEB 1.5 — reliable BGM gain and 20% default (2026-11-23)
- Source inspection: previous BGM slider saved the value and assigned it to HTMLAudioElement.volume during each animation frame, but did not have an independent digital gain stage. The user reports Samsung Galaxy audio stays loud even at 2%; this was not directly reproducible remotely. Media volume support/behavior can vary across browsers.
- New actual BGM output path: same AudioContext used for SFX, plus a dedicated MediaElementAudioSourceNode and GainNode, which routes music to the output while SFX oscillators bypass the music GainNode. This source connection happens only once per HTMLAudioElement, so consecutive songs, game-over and retries reuse the same route and continue uninterrupted.
- Slider input calls audio.applyMusicVolume() immediately, which sets gain to the exact fraction (0%=0, 2%=0.02, 20%=0.20); 0% is silent. A fallback preserves HTML element.volume and sets muted at 0%. HTML media volume is kept at unity in WebAudio routed mode to avoid double attenuation.
- New install default BGM 20%, effective user-adjustable range 0–100%. One-time migration changes untouched prior default (26%/7%) to 20%, while retaining any manually chosen values including 2%; existing coins/records/SFX/handedness persist.
- Settings labels BGM (background music) explicitly and explains that Home is intentionally silent; users can play a song in the settings list to hear volume adjustments while moving the slider.
- Pending earlier item/obstacle spacing and SFX balance adjustments remain pending for a future batch, not changed in this targeted audio fix.
- Automated tests: JS parse and mocked Android-capable Web Audio routing verify gain 0, 0.02, 0.2, 0.6, one routed element across songs, fallback silent, profile migration and preserving manual 2%/coin/record settings. Actual Samsung Internet listening confirmation remains necessary.


## WEB 1.6 TEST — 우이지, shared gear and protective consumables (2026-11-23)
- Added second selectable hero **우이지**, a chibi boy using an alpha-transparent portrait at `assets/uiji_intro.webp`. The originally approved `우서이` sprite set and original front/back switch remain unchanged. Both available free in the Character drawer; choice is saved as `selectedCharacter`.
- The approved image for 우이지 currently has an official **front view only**. Do not mirror his face as a fake rear or claim that his lobby preview can rotate 360 degrees. His current in-game sprite reuses that same boy cutout with a small rotating/tilting transform on wall jumps; additional dedicated animated frames remain a later quality milestone.
- Shop beta items: **yellow bubble** 10 seconds / 20 coins, **green bubble** 20 seconds / 45 coins, **red bubble** 30 seconds / 80 coins. Bubble items are consumables, stored with exact quantities; one armed bubble is automatically consumed and activated at the start of the next game run. If the player dies and retries, another purchase is needed unless they own more copies.
- **Explorer/basic helmet** costs 160 coins and blocks 1 lethal collision per run; **frog helmet** costs 320 coins and blocks 2 per run. Helmets are persistent once purchased. Their collision charges reset every new run, and the equipped helmet is shared across every character, with decorative visual overlays for both sprites.
- Bubble is a tinted translucent yellow/green/red sphere enclosing the selected hero; collision while active does not kill. Helmets intercept collisions after bubble expiration, with a 0.75-second anti-double-hit grace. No change to obstacle spawning, standard hitbox, game speed, game duration, coin/time gate spawning or level threshold.
- Draw a small protection status badge while playing; keep the regular game over/coin rewards/BGM intact.
- Save migration adds `selectedCharacter`, `consumables`, `armedBubble`, `equippedHelmet`, preserving existing coins, achievements, level, music and controls. Purchased helmet IDs are in the existing inventory, not charged again on restart. Profile storage key unchanged.
- QA before deploy: JavaScript syntax validation; simulated 390×844 canvas and DOM shop/character clicks; green bubble and frog helmet purchases deduct exactly 45/320 coins; selected character updates home avatar and start game; bubble seconds count down; armor charges reported; collision unit scenario verifies that bubble blocks, helmet absorbs, and an unprotected collision still ends the run; retry consumes new bubble only if owned and replenishes helmet charges. Browser rendering quality and Galaxy touch interactions require user acceptance.
- Still pending for future batch: unreachable overlap of coins/time rewards and hazards, level progression recalibration, optional personalized wearable positions, dedicated falling poses and approved boy rear artwork.


## WEB 1.7 TEST — 우이지 36-frame cape/face motion for actual gameplay (2026-11-23)
- Added transparent `assets/uiji_motion_atlas.webp` (2304×2304, 36 full-quality 384×384 cells): 12 frames each of scared slow descent with fully OPEN purple-and-gold cape; 12 frames of eyes-shut, determined/braced fast descent with FOLDED cape; and 12 frames of comedic wide-eyed PANIC at very high fall speed with the cape still folded and hair flying upward.
- Source artworks retain the approved boy identity, outfit, curled dark hair, brown harness/backpack, purple gold-trimmed cape and sneakers. The ultra-speed key art was created by combining the approved frightened facial expression with the folded cape/body, rather than regenerating a new-looking boy.
- Frames include organic per-frame cape flutter, hair/boot movement; canvas draws **interpolated successive sprite frames at 60fps** with subtle body bob, wind, dynamic scale and tilt. A narrow cape contraction bridges open-to-closed poses while avoiding double-face ghost artifacts. Ultra-speed panic transitions from closed-body to matching closed-body reaction; no photo slideshow.
- His wall-jump has a custom continuous 0.4-second launch/contact/landing path, rotation, squash/stretch, one close echo and contact sparks, synchronized to the original unmodified 0.155-second physics. Collision, speed, existing equipment overlays, bubble/helmet safety, music and profile data are untouched. His game-over uses a funny spinning/starry reaction.
- Important: his HOME portrait remains the approved standing illustration and has no unapproved backward-facing fake image; only gameplay falling sprites are new. The original heroine's hand-cut cape rig and all of her existing artwork remain untouched.
- QA before commit: atlas verified as 6×6 RGBA (1.32MB), contact-sheet visual inspection of all three poses, syntax test of modified game JS; simulated 390×844 gameplay and draw of open, folded, panic, jump and dead animations with actual 9-argument canvas drawImage atlas coordinates; real Galaxy listening/visual confirmation remains pending.

 
## WEB 1.8 TEST — swipe character wardrobe, per-character gear, manually activated item buttons, crisp Uiji motion (2026-11-23)
- Character drawer redesigned from two side-by-side character cards into a large SINGLE centered character with swipe-left/right carousel, explicit arrow buttons, active "✓ 사용 중", and pagination dots; switching hero is persisted to the existing profile without affecting coins, levels or record. The visual art is the existing approved original.
- Below the selected hero is its own wearable/consumable closet. Two **character-specific** item quick slots support mobile pointer drag/drop, desktop HTML drag/drop and accessible tap-item-then-tap-slot. A clear/unequip × control restores the slot; it never decreases stock. All owned consumable quantities remain **global inventory** and are only decremented upon deliberate in-game activation, not on purchase, character selection, wardrobe equip or starting a run.
- Five wearable slot categories: helmet (fully working, 1-hit or 2-hit protection as before, stored independently per hero), cape, shoes, pants, shirt (future item placeholders, no nonexistent items advertised). An actual vector helmet preview is overlaid on the character's head in the wardrobe, and the existing procedural helmet graphic appears in-game. Purchased helmet ownership is global and independent of its per-character equipped state; equipment may be worn/removed in the Character drawer, while Shop is purchase-only.
- The two large gameplay buttons remain left and right (both smaller but still thumb-operable); two mini item buttons are between them. In-game tapping a quick item consumes exactly 1 of the equipped global inventory and creates the respective 10, 20 or 30 second colored invulnerable bubble. It cannot stack an additional bubble while one is active. If the final stocked item is used, all matching character quick slots clear. Helmet protection remains automatic and recharges at each new run.
- Existing legacy `profile.armedBubble`, `profile.equippedHelmet` and preliminary global quickSlots are migrated to the previously selected hero's `profile.wardrobes[characterId]` schema. Other characters begin with empty loadout/helmet; existing coins, records, history, music, booster preferences, active cosmetics and progression preserved.
- Uiji visual fix: remove 2-sprite alpha frame mixing and motion echo/double-exposure. Exactly one **fully opaque** atlas frame is rendered at a time; character silhouette continuously contracts and body leans more as acceleration starts, before late keyframe change to the folded-cape pose, and extreme speed changes to panic. The cape/body adjustment is interpolated, while the facial expression remains crisp keyframed. Original 우서이 sprite logic untouched.
- QA: JS parse and mocked in-game DOM interaction test validates carousel swipe forward/back, per-character loadout state, buying and equipping, removing/reattaching helmet, 2 item slot buttons with actual manual stock spend, no start-of-run auto spend and 60 simulated game frames; sprite test confirms one opaque atlas draw (no ghost). Responsive 390×844 prototype screenshot inspected; outer buttons 123px each, central bar 109px with two button cells. NOTE: the local screenshot is a layout prototype and not an actual screenshot of the live deployed game. Real Galaxy browser touch drag, character portrait art alignment and full motion still require user confirmation.
- Remaining tasks outside this version: collision/coin/time item no-overlap; leveling threshold increase; sound effects balance; additional helmets, cape/shoes/pants/shirt item art and actual body-specific attachments; richer Uiji transitional expression frames if keyframe expression remains abrupt in real playback.
