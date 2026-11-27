# 지옥 낙하 WEB 3.2 — 정리된 개발 기준
최신 게임: https://jongchan200-glitch.github.io/hell-drop/?v=nov27-wing32
기능: WEB 3.0의 캐릭터 선택/테스트 전환, 6개 스킨(기본/탐험가/윙슈트 남녀 각 1종), 100·200코인 구매, 1,000코인 테스트 지갑, 장비/소모품, 레벨/기록/음악/낙하 조작을 보존한다.
- index.html, style.css: 화면 / hero_turnaround.js: 단일 홈 원화 / starter-poses.js: 승인된 초보 3동작 / helmet-composer.js: 기능성 헬멧 / game.js: 게임 및 UI / systems.js: 카탈로그·경제·저장·음악 / platform.js: 저장/수명주기 경계.
- 이전 실험 리그·3D·키포즈 및 구형 초보 원화는 운영 트리에서 제거했으며 전체 원본과 과거 README는 backup-pre-android-cleanup-20261127 브랜치에 보존한다.
- simulator.html / sim-core.js 등 밸런스 검증 도구와 CHARACTER_LOCK.md, character-production/original-2d-reference-lock.json 등 원화 기준은 보존. APK에는 포함하지 않는다.
- Android Studio 개발용 로컬 WebView 골격: android/README.md. 현재 APK 실기기 검증 전, 정식 release 변형은 비활성화.
- 이전 저장 키 및 기존 WEB 3.0 테스트 지갑 그대로 유지.

- 윙슈트 남녀 200코인, 최고속 76%·감속 75% 임시. 동일 본체 전신 원화 3동작, 기존 저장 키 유지.
