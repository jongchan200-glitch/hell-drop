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
