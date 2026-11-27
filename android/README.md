# Android Studio 개발용 앱 골격 (WEB 3.1)
- 저장소를 통째로 clone한 뒤 Android Studio에서 android/ 폴더를 Open. JDK 17, Android SDK 35, Gradle 8.9 / AGP 8.7.3 사용. Gradle wrapper 바이너리는 아직 포함되지 않았으므로 Studio Gradle 설정 또는 설치된 Gradle 8.9 사용.
- Build > Build APK(s) 또는 android/에서 gradle :app:assembleDebug. 빌드 시 web-assets.txt의 파일만 APK assets/www에 자동 동기화. 개발 중 웹 파일을 수정하면 다음 빌드에 반영된다.
- WebViewAssetLoader의 고정 HTTPS 로컬 origin으로 실행. 게임 자체는 HTML/CSS/Canvas/JS 및 로컬 음원, 네트워크 없이 작동하도록 구성. 실제 안드로이드 APK 빌드/실기기 검증은 별도 수행 필요.
- 브라우저와 앱은 저장소 origin이 다르므로 기존 브라우저 코인/기록 자동 이관되지 않음. 앱 자체 데이터는 localStorage로 유지. 추후 서버 계정/인증/광고/결제는 별도 구현. 실제 결제용 코인 원장은 서버 검증 필요.
- TEST_MODE=true 및 1,000코인·남녀 전환을 유지하는 테스트 앱이다. release 빌드 차단. 출시 시 패키지명·서명·최신 타깃 SDK·뒤로가기·안전 영역/화면 수명주기·실기기 성능·접근성·광고/스토어 정책 검증 필요.
- 공식 가이드: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
