# 🎮 Enhanced Tetris Battle - Multi-Battle Edition

4개의 오픈소스 테트리스 프로젝트를 통합하여 완성한 최고급 기능의 테트리스 게임입니다. 
1vs1 배틀, 4인 멀티플레이, 10가지 아이템 시스템, 3D 비주얼 효과, 동적 사운드를 지원합니다.

## 🎮 게임 특징

### 🏆 고급 게임플레이 시스템
- **T-Spin 시스템**: 3-corner rule과 front-corner rule을 사용한 정확한 T-spin 판정
- **Back-to-Back 보너스**: 연속 특수 클리어 시 1.5배 점수 보너스
- **콤보 시스템**: 연속 라인 클리어로 점수 및 공격력 증가 (최대 무한 콤보)
- **고급 스코어링**: 난이도, T-spin, 콤보, Back-to-Back을 모두 고려한 점수 계산

### ⚔️ 배틀 시스템
- **가비지 라인 시스템**: 상대방 공격 시 랜덤 홀이 있는 방해 라인 생성
- **공격력 계산**: T-spin, Tetris, 콤보에 따른 정교한 공격력 산정
- **아이템 배틀**: 4종의 전략적 아이템으로 배틀 전개
- **실시간 상태 표시**: 콤보, 공격력, B2B 상태를 실시간으로 표시

### 🎵 고급 사운드 시스템
- **25개 이상 사운드**: T-spin, 콤보, 아이템별 전용 사운드
- **동적 오디오**: Pitch shifting으로 콤보에 따른 사운드 변화
- **Web Audio API**: 고품질 오디오 처리 및 실시간 믹싱
- **상황별 음향 효과**: 게임 상황에 맞춤형 오디오 피드백

### 시각적 효과
- **줄 제거 애니메이션**: 화려한 시각 효과와 함께 줄 제거
- **3D 블록 렌더링**: 입체감 있는 블록 디자인
- **파티클 효과**: 특수 상황에서의 시각적 피드백
- **화면 흔들림**: 강력한 액션 시 스크린 셰이크 효과

## 🚀 실행 방법

### 🎯 메인 게임 파일
**`integrated-game.html`** - 모든 기능이 통합된 완전한 게임

### 실행 순서
1. **파일 다운로드**
   ```bash
   git clone https://github.com/reset980reset980/tetris.git
   cd tetris
   ```

2. **브라우저에서 직접 실행** (간단한 방법)
   ```
   integrated-game.html 파일을 더블클릭하여 브라우저에서 열기
   ```

3. **로컬 서버 실행** (권장)
   ```bash
   # Python 3가 설치된 경우
   python -m http.server 8000
   
   # Node.js가 설치된 경우  
   npx serve .
   
   # PHP가 설치된 경우
   php -S localhost:8000
   ```
   
   그 다음 브라우저에서 `http://localhost:8000/integrated-game.html` 접속

### 📁 게임 파일 구성
- **`integrated-game.html`** ← **메인 게임 (이 파일 실행)**
- **`index.html`** - 기본 버전
- **`js/integratedMain.js`** - 통합된 메인 게임 로직

## 🎹 조작법

### 기본 조작
| 키 | 기능 |
|---|---|
| ← → | 좌우 이동 |
| ↑ | 시계방향 회전 |
| ↓ | 소프트 드롭 (빠른 하강) |
| Space | 하드 드롭 (즉시 하강) |
| C | 홀드 (블록 보관) |
| ESC | 일시정지 / 메뉴 |

### ⚔️ 아이템 시스템 (10가지)
| 키 | 아이템 | 효과 | 지속시간 |
|---|-------|-----|---------|
| 1 | 🛡️ Shield | 공격 차단 | 10초 |
| 2 | ⚔️ Attack | 상대에게 가비지 라인 3줄 전송 | 즉시 |
| 3 | 💥 Line Clear | 하단 2줄 제거 | 즉시 |
| 4 | 🐢 Slow Down | 상대 속도 50% 감소 | 8초 |
| 5 | ⚡ Speed Up | 자신 속도 50% 증가 | 8초 |
| 6 | 💣 Bomb | 3×3 영역 블록 파괴 | 즉시 |
| 7 | ❄️ Freeze | 상대 조작 불가 | 5초 |
| 8 | ⬇️ Gravity | 상대 중력 2배 | 10초 |
| 9 | 🔀 Shuffle | 상대 보드 셔플 | 즉시 |
| 0 | 👻 Invisible | 상대 블록 투명화 | 7초 |

#### 아이템 획득
- Tetris, T-Spin, 콤보 등 고급 플레이 시 획득
- 아이템 종류별 최대 9개까지 보관
- 전략적 사용으로 배틀 승리 확률 증가

## 🏗️ 프로젝트 구조

```
tetris/
├── index.html              # 메인 HTML 파일
├── styles/                 # CSS 스타일시트
│   ├── main.css           # 메인 스타일 및 레이아웃
│   ├── game.css           # 게임 화면 스타일
│   └── ui.css             # UI 컴포넌트 스타일
├── js/                    # JavaScript 모듈들
│   ├── main.js            # 메인 애플리케이션 진입점
│   ├── game/              # 게임 로직 모듈
│   │   ├── GameManager.js # 게임 상태 관리
│   │   ├── GameBoard.js   # 게임 보드 렌더링
│   │   └── Tetromino.js   # 테트로미노 블록 시스템
│   ├── ui/                # UI 관련 모듈
│   │   └── UIManager.js   # 사용자 인터페이스 관리
│   ├── audio/             # 오디오 시스템
│   │   └── AudioManager.js# 동적 음악 및 효과음
│   ├── network/           # 네트워크 통신
│   │   └── NetworkManager.js # 멀티플레이어 통신
│   └── managers/          # 기타 매니저들
│       └── SettingsManager.js # 설정 관리
└── assets/                # 게임 리소스 (구현 예정)
    ├── music/             # 배경음악 파일들
    ├── sounds/            # 효과음 파일들
    └── images/            # 이미지 리소스
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Graphics**: HTML5 Canvas
- **Audio**: Web Audio API
- **Network**: WebSocket (실시간 통신)
- **Storage**: LocalStorage (설정 저장)

## 🌟 주요 시스템

### 1. 테트로미노 시스템
- 7가지 표준 테트로미노 (I, O, T, S, Z, J, L)
- SRS (Super Rotation System) 회전 규칙
- 7-bag 랜덤 생성 시스템

### 2. 게임 보드
- 10x20 표준 크기
- 실시간 렌더링 최적화
- 줄 제거 애니메이션
- 고스트 블록 표시

### 3. 동적 음악 시스템
- 게임 상황에 따른 음악 변화
- 레벨에 따른 템포 조절
- 다양한 효과음 지원

### 4. 네트워크 시스템
- WebSocket 기반 실시간 통신
- 게임 상태 동기화
- 방 생성 및 참여 시스템
- 빠른 매칭 기능

### 5. UI/UX 시스템
- 반응형 디자인
- 토스트 메시지
- 모달 다이얼로그
- 설정 관리

## 🎯 게임 모드

### 싱글 모드
- 혼자서 즐기는 클래식 테트리스
- 점수 기록 및 통계 저장
- 무한 플레이 가능

### 1vs1 대전
- 두 플레이어간 실시간 대전
- 공격 및 방어 시스템
- 승부 판정 시스템

### 멀티 배틀 (2~4인)
- 최대 4명까지 동시 대전
- 아이템을 활용한 전략적 플레이
- 순위 시스템

## 🔧 개발자 정보

### 디버그 모드
브라우저 콘솔에서 다음 명령어들을 사용할 수 있습니다:

```javascript
// 현재 게임 상태 확인
window.DEBUG.gameManager()

// 오디오 시스템 정보
window.DEBUG.audioManager()

// 네트워크 상태 확인
window.DEBUG.networkManager()

// 설정 정보 확인
window.DEBUG.settings()
```

### 성능 모니터링
- FPS 표시 옵션
- 메모리 사용량 모니터링
- 네트워크 지연시간 측정

## 📱 브라우저 지원

- Chrome 80+ (권장)
- Firefox 75+
- Safari 13+
- Edge 80+

### 필요한 웹 기술
- ES6 Modules
- Web Audio API
- WebSocket
- Canvas 2D
- LocalStorage

## 🛠️ 향후 개발 계획

### 단기 계획
- [ ] 실제 오디오 파일 추가
- [ ] 서버 구현 (현재는 시뮬레이션 모드)
- [ ] 모바일 최적화
- [ ] PWA (Progressive Web App) 지원

### 장기 계획
- [ ] AI 상대 추가
- [ ] 토너먼트 시스템
- [ ] 스킨 시스템
- [ ] 리플레이 기능
- [ ] 통계 대시보드

## 📄 라이센스

이 프로젝트는 교육 및 학습 목적으로 제작되었습니다.

## 🤝 기여하기

버그 제보나 기능 제안은 언제든 환영합니다!

---

**Modern Tetris** - 전통적인 테트리스의 재미와 현대적인 기술의 만남 🎮✨