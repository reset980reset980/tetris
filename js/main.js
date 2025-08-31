// ===== 메인 애플리케이션 진입점 =====
import { GameManager } from './game/GameManager.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { SettingsManager } from './managers/SettingsManager.js';

class TetrisApp {
    constructor() {
        this.gameManager = null;
        this.uiManager = null;
        this.audioManager = null;
        this.networkManager = null;
        this.settingsManager = null;
        
        this.currentScreen = 'mainMenu';
        this.gameMode = 'single'; // single, oneVsOne, multiBattle
        
        this.init();
    }
    
    async init() {
        try {
            // 매니저들 초기화
            this.settingsManager = new SettingsManager();
            await this.settingsManager.loadSettings();
            
            this.audioManager = new AudioManager(this.settingsManager);
            await this.audioManager.init();
            
            this.uiManager = new UIManager(this);
            this.networkManager = new NetworkManager(this);
            this.gameManager = new GameManager(this);
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 화면 표시
            this.showScreen('mainMenu');
            
            console.log('✅ Tetris App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Tetris App:', error);
            this.showErrorMessage('게임 초기화에 실패했습니다.');
        }
    }
    
    setupEventListeners() {
        // 메인 메뉴 버튼들
        document.getElementById('singleModeBtn').addEventListener('click', () => {
            this.startGame('single');
        });
        
        document.getElementById('oneVsOneBtn').addEventListener('click', () => {
            this.showScreen('lobby');
            this.gameMode = 'oneVsOne';
        });
        
        document.getElementById('multiBattleBtn').addEventListener('click', () => {
            this.showScreen('lobby');
            this.gameMode = 'multiBattle';
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showScreen('settings');
        });
        
        document.getElementById('exitBtn').addEventListener('click', () => {
            this.confirmExit();
        });
        
        // 게임 화면 버튼들
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // 로비 화면 관련
        document.getElementById('backToMainBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // 설정 화면 관련
        document.getElementById('settingsBackBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // 키보드 입력 처리
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
        
        // 창 크기 변경 처리
        window.addEventListener('resize', () => {
            if (this.gameManager && this.gameManager.isPlaying) {
                this.gameManager.handleResize();
            }
        });
        
        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    showScreen(screenName) {
        // 모든 화면 숨기기
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // 선택된 화면 보이기
        const targetScreen = document.getElementById(screenName + 'Screen') || 
                           document.getElementById(screenName);
        
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // 화면 전환 시 오디오 조정
            this.audioManager.onScreenChange(screenName);
        }
    }
    
    async startGame(mode) {
        try {
            this.gameMode = mode;
            this.showScreen('game');
            
            // 게임 시작
            await this.gameManager.startGame(mode);
            
            // 배경음악 시작
            this.audioManager.playBackgroundMusic('game');
            
        } catch (error) {
            console.error('❌ Failed to start game:', error);
            this.showErrorMessage('게임 시작에 실패했습니다.');
            this.showScreen('mainMenu');
        }
    }
    
    async restartGame() {
        if (this.gameManager) {
            await this.gameManager.restartGame();
        }
    }
    
    pauseGame() {
        if (this.gameManager && this.gameManager.isPlaying) {
            this.gameManager.pauseGame();
            this.audioManager.pauseBackgroundMusic();
        }
    }
    
    resumeGame() {
        if (this.gameManager && this.gameManager.isPaused) {
            this.gameManager.resumeGame();
            this.audioManager.resumeBackgroundMusic();
        }
    }
    
    handleKeyDown(e) {
        // ESC키로 일시정지/메뉴 토글
        if (e.code === 'Escape') {
            e.preventDefault();
            if (this.currentScreen === 'game') {
                if (this.gameManager.isPlaying && !this.gameManager.isPaused) {
                    this.pauseGame();
                } else if (this.gameManager.isPaused) {
                    this.resumeGame();
                }
            }
            return;
        }
        
        // 게임 중일 때만 게임 컨트롤 처리
        if (this.currentScreen === 'game' && this.gameManager && this.gameManager.isPlaying) {
            this.gameManager.handleKeyDown(e);
        }
    }
    
    handleKeyUp(e) {
        if (this.currentScreen === 'game' && this.gameManager && this.gameManager.isPlaying) {
            this.gameManager.handleKeyUp(e);
        }
    }
    
    onGameOver(finalScore, level, lines) {
        // 게임 오버 처리
        this.audioManager.playSound('gameOver');
        this.audioManager.stopBackgroundMusic();
        
        // 최종 점수 표시
        document.getElementById('finalScore').textContent = finalScore.toLocaleString();
        
        // 게임 오버 오버레이 표시
        document.getElementById('gameOverOverlay').classList.remove('hidden');
        
        console.log(`🎮 Game Over - Score: ${finalScore}, Level: ${level}, Lines: ${lines}`);
    }
    
    onLineCleared(lines, score, totalLines, level) {
        // 줄 제거 효과음
        this.audioManager.playSound('lineClear', lines);
        
        // UI 업데이트
        this.uiManager.updateGameInfo(score, level, totalLines);
        
        console.log(`🎯 Lines cleared: ${lines}, Score: +${score}, Total: ${totalLines}, Level: ${level}`);
    }
    
    onLevelUp(newLevel) {
        // 레벨업 효과음 및 음악 변화
        this.audioManager.playSound('levelUp');
        this.audioManager.adjustMusicTempo(newLevel);
        
        console.log(`⬆️ Level up! New level: ${newLevel}`);
    }
    
    showErrorMessage(message) {
        this.uiManager.showToast(message, 'error');
    }
    
    showSuccessMessage(message) {
        this.uiManager.showToast(message, 'success');
    }
    
    showInfoMessage(message) {
        this.uiManager.showToast(message, 'info');
    }
    
    confirmExit() {
        this.uiManager.showModal(
            '게임 종료',
            '정말로 게임을 종료하시겠습니까?',
            [
                {
                    text: '취소',
                    type: 'secondary',
                    callback: () => {}
                },
                {
                    text: '종료',
                    type: 'primary',
                    callback: () => {
                        this.cleanup();
                        window.close();
                    }
                }
            ]
        );
    }
    
    cleanup() {
        // 리소스 정리
        if (this.gameManager) {
            this.gameManager.cleanup();
        }
        
        if (this.audioManager) {
            this.audioManager.cleanup();
        }
        
        if (this.networkManager) {
            this.networkManager.cleanup();
        }
        
        console.log('🧹 App cleanup completed');
    }
    
    // 네트워크 이벤트 처리
    onPlayerJoined(playerId, playerInfo) {
        this.showInfoMessage(`${playerInfo.name}님이 참여했습니다.`);
    }
    
    onPlayerLeft(playerId, playerInfo) {
        this.showInfoMessage(`${playerInfo.name}님이 나갔습니다.`);
    }
    
    onGameStateUpdate(gameState) {
        if (this.gameManager) {
            this.gameManager.updateGameState(gameState);
        }
    }
    
    // 게임 상태 getter
    get isPlaying() {
        return this.gameManager ? this.gameManager.isPlaying : false;
    }
    
    get isPaused() {
        return this.gameManager ? this.gameManager.isPaused : false;
    }
    
    get currentGameMode() {
        return this.gameMode;
    }
    
    get settings() {
        return this.settingsManager ? this.settingsManager.settings : {};
    }
}

// 앱 인스턴스 생성 및 전역 접근 가능하도록 설정
window.tetrisApp = new TetrisApp();

// 개발용 디버그 정보
if (process?.env?.NODE_ENV === 'development') {
    console.log('🚀 Tetris App loaded in development mode');
    window.DEBUG = {
        gameManager: () => window.tetrisApp.gameManager,
        audioManager: () => window.tetrisApp.audioManager,
        networkManager: () => window.tetrisApp.networkManager,
        settings: () => window.tetrisApp.settings
    };
}