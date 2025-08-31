// ===== 게임 매니저 - 핵심 게임 로직 관리 =====

import { GameBoard } from './GameBoard.js';
import { Tetromino, TetrominoGenerator } from './Tetromino.js';

export class GameManager {
    constructor(app) {
        this.app = app;
        this.board = new GameBoard(10, 20);
        this.generator = new TetrominoGenerator();
        
        // 게임 상태
        this.isPlaying = false;
        this.isPaused = false;
        this.isGameOver = false;
        
        // 현재 블록들
        this.currentTetromino = null;
        this.nextTetromino = null;
        this.holdTetromino = null;
        this.canHold = true;
        
        // 게임 통계
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.totalLines = 0;
        
        // 타이밍 제어
        this.dropTimer = 0;
        this.dropInterval = 1000; // 1초 (레벨 1)
        this.lastUpdateTime = 0;
        
        // 입력 처리
        this.keys = new Set();
        this.keyRepeat = new Map();
        this.keyDelays = {
            left: { delay: 150, repeat: 50 },
            right: { delay: 150, repeat: 50 },
            down: { delay: 0, repeat: 50 },
            rotate: { delay: 200, repeat: 200 }
        };
        
        // 애니메이션
        this.animationId = null;
        
        // 멀티플레이어 관련
        this.gameMode = 'single';
        this.playerId = null;
        this.opponents = new Map();
        
        this.init();
    }
    
    init() {
        // 캔버스 설정
        const gameCanvas = document.getElementById('gameBoard');
        const nextCanvas = document.getElementById('nextBlockCanvas');
        
        if (gameCanvas) {
            this.board.setupCanvas(gameCanvas);
        }
        
        if (nextCanvas) {
            this.nextCanvas = nextCanvas;
            this.nextCtx = nextCanvas.getContext('2d');
            this.setupNextBlockCanvas();
        }
        
        // 초기 테트로미노 생성
        this.generateNextTetromino();
        
        console.log('🎮 GameManager initialized');
    }
    
    // 다음 블록 캔버스 설정
    setupNextBlockCanvas() {
        const canvas = this.nextCanvas;
        const ctx = this.nextCtx;
        
        // 고해상도 디스플레이 지원
        const devicePixelRatio = window.devicePixelRatio || 1;
        const canvasPixelRatio = ctx.webkitBackingStorePixelRatio ||
                                ctx.mozBackingStorePixelRatio ||
                                ctx.msBackingStorePixelRatio ||
                                ctx.oBackingStorePixelRatio ||
                                ctx.backingStorePixelRatio || 1;
        
        const ratio = devicePixelRatio / canvasPixelRatio;
        
        if (devicePixelRatio !== canvasPixelRatio) {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * ratio;
            canvas.height = rect.height * ratio;
            ctx.scale(ratio, ratio);
        }
        
        ctx.imageSmoothingEnabled = false;
    }
    
    // 게임 시작
    async startGame(mode = 'single') {
        this.gameMode = mode;
        this.resetGame();
        this.isPlaying = true;
        this.isGameOver = false;
        
        // 첫 번째 테트로미노 스폰
        this.spawnTetromino();
        
        // 게임 루프 시작
        this.lastUpdateTime = Date.now();
        this.gameLoop();
        
        console.log(`🚀 Game started in ${mode} mode`);
    }
    
    // 게임 재시작
    async restartGame() {
        this.stopGame();
        await this.startGame(this.gameMode);
    }
    
    // 게임 중지
    stopGame() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // 게임 일시정지
    pauseGame() {
        if (this.isPlaying && !this.isGameOver) {
            this.isPaused = true;
            console.log('⏸️ Game paused');
        }
    }
    
    // 게임 재개
    resumeGame() {
        if (this.isPaused) {
            this.isPaused = false;
            this.lastUpdateTime = Date.now();
            console.log('▶️ Game resumed');
        }
    }
    
    // 게임 초기화
    resetGame() {
        this.board.clear();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.totalLines = 0;
        this.dropInterval = 1000;
        this.dropTimer = 0;
        this.currentTetromino = null;
        this.holdTetromino = null;
        this.canHold = true;
        this.keys.clear();
        this.keyRepeat.clear();
        
        // 새 생성기로 초기화
        this.generator = new TetrominoGenerator();
        this.generateNextTetromino();
        
        // UI 업데이트
        this.updateUI();
        
        console.log('🔄 Game reset');
    }
    
    // 다음 테트로미노 생성
    generateNextTetromino() {
        this.nextTetromino = this.generator.next();
        this.renderNextBlock();
    }
    
    // 테트로미노 스폰
    spawnTetromino() {
        if (!this.nextTetromino) {
            this.generateNextTetromino();
        }
        
        this.currentTetromino = this.nextTetromino;
        this.generateNextTetromino();
        
        // 시작 위치 설정 (보드 중앙 상단)
        const startX = Math.floor((this.board.width - this.currentTetromino.getDimensions().width) / 2);
        this.currentTetromino.setPosition(startX, 0);
        
        // 홀드 가능 상태로 초기화
        this.canHold = true;
        
        // 스폰 위치에서 충돌 검사
        if (!this.board.canPlaceTetromino(this.currentTetromino)) {
            this.gameOver();
            return;
        }
        
        console.log(`📦 Spawned ${this.currentTetromino.type} at (${startX}, ${this.currentTetromino.y})`);
    }
    
    // 메인 게임 루프
    gameLoop() {
        if (!this.isPlaying) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        
        if (!this.isPaused && !this.isGameOver) {
            this.update(deltaTime);
        }
        
        this.render();
        
        this.lastUpdateTime = currentTime;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    // 게임 로직 업데이트
    update(deltaTime) {
        if (!this.currentTetromino) return;
        
        // 키 입력 처리
        this.processInput(deltaTime);
        
        // 자동 하강 처리
        this.dropTimer += deltaTime;
        if (this.dropTimer >= this.dropInterval) {
            this.moveTetromino(0, 1);
            this.dropTimer = 0;
        }
    }
    
    // 입력 처리
    processInput(deltaTime) {
        // 키 반복 처리
        for (const [key, timing] of this.keyRepeat.entries()) {
            timing.timer += deltaTime;
            
            if (timing.timer >= (timing.hasTriggered ? timing.repeatDelay : timing.initialDelay)) {
                this.processKeyAction(key);
                timing.hasTriggered = true;
                timing.timer = 0;
            }
        }
    }
    
    // 키 동작 처리
    processKeyAction(key) {
        if (!this.currentTetromino || this.isPaused || this.isGameOver) return;
        
        switch (key) {
            case 'ArrowLeft':
                this.moveTetromino(-1, 0);
                break;
            case 'ArrowRight':
                this.moveTetromino(1, 0);
                break;
            case 'ArrowDown':
                if (this.moveTetromino(0, 1)) {
                    this.score += 1; // 소프트 드롭 보너스
                    this.updateUI();
                }
                break;
            case 'ArrowUp':
                this.rotateTetromino();
                break;
            case 'Space':
                this.hardDrop();
                break;
            case 'KeyC':
                this.holdTetromino();
                break;
        }
    }
    
    // 테트로미노 이동
    moveTetromino(dx, dy) {
        if (!this.currentTetromino) return false;
        
        const originalX = this.currentTetromino.x;
        const originalY = this.currentTetromino.y;
        
        this.currentTetromino.move(dx, dy);
        
        if (this.board.canPlaceTetromino(this.currentTetromino)) {
            // 이동 성공
            if (dy > 0) {
                // 아래로 이동한 경우 사운드 재생
                this.app.audioManager?.playSound('move');
            }
            return true;
        } else {
            // 이동 실패 - 원래 위치로 복원
            this.currentTetromino.setPosition(originalX, originalY);
            
            // 아래로 이동 실패한 경우 블록 고정
            if (dy > 0) {
                this.lockTetromino();
            }
            return false;
        }
    }
    
    // 테트로미노 회전
    rotateTetromino(direction = 1) {
        if (!this.currentTetromino) return false;
        
        const originalRotation = this.currentTetromino.rotation;
        const newRotation = (originalRotation + direction + 4) % 4;
        
        this.currentTetromino.setRotation(newRotation);
        
        // 기본 위치에서 회전 가능한지 확인
        if (this.board.canPlaceTetromino(this.currentTetromino)) {
            this.app.audioManager?.playSound('rotate');
            return true;
        }
        
        // Wall Kick 시도 (SRS)
        const kickOffsets = this.currentTetromino.getKickOffsets(originalRotation, newRotation);
        
        for (const offset of kickOffsets) {
            this.currentTetromino.move(offset[0], offset[1]);
            
            if (this.board.canPlaceTetromino(this.currentTetromino)) {
                this.app.audioManager?.playSound('rotate');
                return true;
            }
            
            // 원래 위치로 복원 후 다음 오프셋 시도
            this.currentTetromino.move(-offset[0], -offset[1]);
        }
        
        // 모든 시도 실패 - 원래 회전으로 복원
        this.currentTetromino.setRotation(originalRotation);
        return false;
    }
    
    // 하드 드롭 (즉시 하강)
    hardDrop() {
        if (!this.currentTetromino) return;
        
        const startY = this.currentTetromino.y;
        
        // 최대한 아래로 이동
        while (this.moveTetromino(0, 1)) {
            // 계속 이동
        }
        
        const dropDistance = Math.max(0, this.currentTetromino.y - startY);
        this.score += dropDistance * 2; // 하드 드롭 보너스
        
        // 즉시 고정
        this.lockTetromino();
        
        this.app.audioManager?.playSound('hardDrop');
        this.updateUI();
    }
    
    // 테트로미노 고정
    lockTetromino() {
        if (!this.currentTetromino) return;
        
        // 보드에 블록 배치
        this.board.placeTetromino(this.currentTetromino);
        
        // 완성된 줄 확인
        const completedLines = this.board.findCompletedLines();
        
        if (completedLines.length > 0) {
            this.clearLines(completedLines);
        }
        
        // 다음 테트로미노 스폰
        this.currentTetromino = null;
        this.spawnTetromino();
        
        this.app.audioManager?.playSound('lock');
    }
    
    // 줄 제거 처리
    clearLines(lines) {
        const lineCount = lines.length;
        
        // 점수 계산 (한 줄: 10점, 두 줄: 30점, 세 줄: 60점, 네 줄: 100점)
        const scoreMap = { 1: 10, 2: 30, 3: 60, 4: 100 };
        const baseScore = scoreMap[lineCount] || 0;
        const levelMultiplier = this.level;
        const earnedScore = baseScore * levelMultiplier;
        
        this.score += earnedScore;
        this.lines += lineCount;
        this.totalLines += lineCount;
        
        // 레벨업 검사 (1000점마다)
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel > this.level) {
            this.levelUp(newLevel);
        }
        
        // 줄 제거 애니메이션
        this.board.removeLines(lines);
        
        // 이벤트 알림
        this.app.onLineCleared?.(lineCount, earnedScore, this.totalLines, this.level);
        
        console.log(`✨ Cleared ${lineCount} lines, +${earnedScore} points`);
    }
    
    // 레벨업 처리
    levelUp(newLevel) {
        this.level = newLevel;
        
        // 하강 속도 증가 (최대 10레벨까지 빨라짐)
        const speedLevel = Math.min(newLevel, 10);
        this.dropInterval = Math.max(50, 1000 - (speedLevel - 1) * 100);
        
        // 이벤트 알림
        this.app.onLevelUp?.(newLevel);
        
        console.log(`⬆️ Level up! New level: ${newLevel}, Drop interval: ${this.dropInterval}ms`);
    }
    
    // 홀드 기능
    holdBlock() {
        if (!this.canHold || !this.currentTetromino) return;
        
        if (this.holdTetromino) {
            // 홀드 블록과 교체
            const temp = this.holdTetromino;
            this.holdTetromino = new Tetromino(this.currentTetromino.type);
            this.currentTetromino = temp;
        } else {
            // 처음 홀드
            this.holdTetromino = new Tetromino(this.currentTetromino.type);
            this.spawnTetromino();
            return;
        }
        
        // 홀드된 블록을 스폰 위치에 배치
        const startX = Math.floor((this.board.width - this.currentTetromino.getDimensions().width) / 2);
        this.currentTetromino.setPosition(startX, 0);
        this.currentTetromino.setRotation(0);
        
        this.canHold = false;
        this.app.audioManager?.playSound('hold');
        
        console.log(`🔄 Held ${this.holdTetromino.type}, Current: ${this.currentTetromino.type}`);
    }
    
    // 게임 오버 처리
    gameOver() {
        this.isGameOver = true;
        this.isPlaying = false;
        
        // 애니메이션 중지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // 이벤트 알림
        this.app.onGameOver?.(this.score, this.level, this.totalLines);
        
        console.log(`💀 Game Over! Final Score: ${this.score}, Level: ${this.level}, Lines: ${this.totalLines}`);
    }
    
    // 렌더링
    render() {
        // 메인 보드 렌더링
        const showGrid = this.app.settings?.showGrid ?? true;
        const showGhost = this.app.settings?.showGhost ?? true;
        
        this.board.render(showGrid, showGhost, this.currentTetromino);
        
        // 다음 블록 렌더링
        this.renderNextBlock();
    }
    
    // 다음 블록 렌더링
    renderNextBlock() {
        if (!this.nextCtx || !this.nextTetromino) return;
        
        const canvas = this.nextCanvas;
        const ctx = this.nextCtx;
        
        // 캔버스 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 블록 크기 계산
        const cellSize = Math.min(canvas.width, canvas.height) / 6;
        const blocks = this.nextTetromino.getBlocks();
        
        if (blocks.length === 0) return;
        
        // 블록들의 경계 박스 계산
        const minX = Math.min(...blocks.map(b => b.x));
        const maxX = Math.max(...blocks.map(b => b.x));
        const minY = Math.min(...blocks.map(b => b.y));
        const maxY = Math.max(...blocks.map(b => b.y));
        
        const blockWidth = (maxX - minX + 1) * cellSize;
        const blockHeight = (maxY - minY + 1) * cellSize;
        
        // 중앙 정렬을 위한 오프셋
        const offsetX = (canvas.width - blockWidth) / 2 - minX * cellSize;
        const offsetY = (canvas.height - blockHeight) / 2 - minY * cellSize;
        
        // 블록 렌더링
        for (const block of blocks) {
            const x = offsetX + block.x * cellSize;
            const y = offsetY + block.y * cellSize;
            
            // 메인 색상
            ctx.fillStyle = block.color;
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
            
            // 3D 효과
            ctx.fillStyle = this.adjustBrightness(block.color, 40);
            ctx.fillRect(x, y, cellSize - 2, 3);
            ctx.fillRect(x, y, 3, cellSize - 2);
            
            ctx.fillStyle = this.adjustBrightness(block.color, -40);
            ctx.fillRect(x, y + cellSize - 5, cellSize - 2, 3);
            ctx.fillRect(x + cellSize - 5, y, 3, cellSize - 2);
        }
    }
    
    // 색상 밝기 조정 (GameBoard와 동일)
    adjustBrightness(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.max(0, Math.min(255, rgb.r + amount));
        const g = Math.max(0, Math.min(255, rgb.g + amount));
        const b = Math.max(0, Math.min(255, rgb.b + amount));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // hex를 rgb로 변환
    hexToRgb(hex) {
        if (hex.startsWith('rgb')) {
            const match = hex.match(/\d+/g);
            return match ? { r: +match[0], g: +match[1], b: +match[2] } : null;
        }
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // UI 업데이트
    updateUI() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.totalLines;
    }
    
    // 키보드 이벤트 처리
    handleKeyDown(e) {
        const key = e.code || e.key;
        
        if (this.keys.has(key)) return; // 이미 눌려진 키는 무시
        
        this.keys.add(key);
        
        // 즉시 실행 키들 (한 번만 실행)
        if (key === 'ArrowUp' || key === 'Space' || key === 'KeyC') {
            this.processKeyAction(key);
            return;
        }
        
        // 반복 가능한 키들
        const keyConfig = {
            'ArrowLeft': this.keyDelays.left,
            'ArrowRight': this.keyDelays.right,
            'ArrowDown': this.keyDelays.down
        }[key];
        
        if (keyConfig) {
            this.keyRepeat.set(key, {
                timer: 0,
                initialDelay: keyConfig.delay,
                repeatDelay: keyConfig.repeat,
                hasTriggered: false
            });
            
            // 첫 번째 실행
            this.processKeyAction(key);
        }
    }
    
    handleKeyUp(e) {
        const key = e.code || e.key;
        this.keys.delete(key);
        this.keyRepeat.delete(key);
    }
    
    // 창 크기 변경 처리
    handleResize() {
        if (this.board.canvas) {
            this.board.setupCanvas(this.board.canvas);
        }
        
        if (this.nextCanvas) {
            this.setupNextBlockCanvas();
        }
    }
    
    // 정리
    cleanup() {
        this.stopGame();
        this.keys.clear();
        this.keyRepeat.clear();
        console.log('🧹 GameManager cleanup completed');
    }
    
    // 게임 상태 업데이트 (멀티플레이어용)
    updateGameState(gameState) {
        // 멀티플레이어 게임 상태 동기화
        if (gameState.opponents) {
            this.opponents = new Map(Object.entries(gameState.opponents));
        }
    }
}