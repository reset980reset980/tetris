// ===== 게임 보드 시스템 =====

export class GameBoard {
    constructor(width = 10, height = 20) {
        this.width = width;
        this.height = height;
        this.grid = this.createEmptyGrid();
        this.canvas = null;
        this.ctx = null;
        this.cellSize = 30;
        this.borderSize = 2;
        
        // 시각적 효과를 위한 속성들
        this.completedLines = [];
        this.lineAnimation = null;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
    }
    
    // 빈 그리드 생성
    createEmptyGrid() {
        const grid = [];
        for (let row = 0; row < this.height; row++) {
            grid[row] = [];
            for (let col = 0; col < this.width; col++) {
                grid[row][col] = null;
            }
        }
        return grid;
    }
    
    // 캔버스 설정
    setupCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 캔버스 크기 설정
        const totalWidth = this.width * this.cellSize + this.borderSize * 2;
        const totalHeight = this.height * this.cellSize + this.borderSize * 2;
        
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        
        // 고해상도 디스플레이 지원
        const devicePixelRatio = window.devicePixelRatio || 1;
        const canvasPixelRatio = this.ctx.webkitBackingStorePixelRatio ||
                                this.ctx.mozBackingStorePixelRatio ||
                                this.ctx.msBackingStorePixelRatio ||
                                this.ctx.oBackingStorePixelRatio ||
                                this.ctx.backingStorePixelRatio || 1;
        
        const ratio = devicePixelRatio / canvasPixelRatio;
        
        if (devicePixelRatio !== canvasPixelRatio) {
            canvas.width = totalWidth * ratio;
            canvas.height = totalHeight * ratio;
            canvas.style.width = totalWidth + 'px';
            canvas.style.height = totalHeight + 'px';
            this.ctx.scale(ratio, ratio);
        }
        
        // 렌더링 최적화 설정
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }
    
    // 보드 클리어
    clear() {
        this.grid = this.createEmptyGrid();
        this.completedLines = [];
        this.lineAnimation = null;
        this.shakeDuration = 0;
    }
    
    // 특정 위치가 유효한지 확인
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    // 특정 위치가 비어있는지 확인
    isEmpty(x, y) {
        if (!this.isValidPosition(x, y)) return false;
        return this.grid[y][x] === null;
    }
    
    // 테트로미노가 현재 위치에 놓일 수 있는지 확인
    canPlaceTetromino(tetromino) {
        const blocks = tetromino.getBlocks();
        
        for (const block of blocks) {
            // 범위 체크
            if (block.x < 0 || block.x >= this.width || block.y >= this.height) {
                return false;
            }
            
            // 위쪽 경계는 허용 (스폰 지역)
            if (block.y < 0) {
                continue;
            }
            
            // 이미 블록이 있는지 확인
            if (!this.isEmpty(block.x, block.y)) {
                return false;
            }
        }
        
        return true;
    }
    
    // 테트로미노를 보드에 배치
    placeTetromino(tetromino) {
        const blocks = tetromino.getBlocks();
        
        for (const block of blocks) {
            if (this.isValidPosition(block.x, block.y)) {
                this.grid[block.y][block.x] = {
                    color: block.color,
                    type: tetromino.type,
                    timestamp: Date.now()
                };
            }
        }
    }
    
    // 완성된 줄 찾기
    findCompletedLines() {
        const completedLines = [];
        
        for (let row = 0; row < this.height; row++) {
            let isComplete = true;
            for (let col = 0; col < this.width; col++) {
                if (this.grid[row][col] === null) {
                    isComplete = false;
                    break;
                }
            }
            
            if (isComplete) {
                completedLines.push(row);
            }
        }
        
        return completedLines;
    }
    
    // 줄 제거 (애니메이션과 함께)
    removeLines(lines) {
        if (lines.length === 0) return;
        
        // 애니메이션을 위해 완성된 줄 저장
        this.completedLines = [...lines];
        this.lineAnimation = {
            phase: 'highlight',
            timer: 0,
            duration: 500 // 0.5초
        };
        
        // 흔들림 효과
        this.startShake(lines.length);
        
        // 실제 줄 제거는 애니메이션 후에
        setTimeout(() => {
            this.executeLineRemoval(lines);
        }, 300);
    }
    
    // 실제 줄 제거 실행
    executeLineRemoval(lines) {
        // 위에서부터 정렬 (높은 인덱스부터 제거)
        lines.sort((a, b) => b - a);
        
        for (const line of lines) {
            // 해당 줄 제거
            this.grid.splice(line, 1);
            
            // 맨 위에 빈 줄 추가
            const emptyRow = new Array(this.width).fill(null);
            this.grid.unshift(emptyRow);
        }
        
        // 애니메이션 상태 초기화
        this.completedLines = [];
        this.lineAnimation = null;
    }
    
    // 흔들림 효과 시작
    startShake(intensity) {
        this.shakeDuration = 200; // 0.2초
        this.shakeIntensity = Math.min(intensity * 2, 8);
    }
    
    // 테트로미노가 착지할 위치 계산 (고스트 블록용)
    getDropPosition(tetromino) {
        const ghost = tetromino.createGhost();
        
        // 아래로 계속 이동하면서 충돌 확인
        while (this.canPlaceTetromino(ghost)) {
            ghost.move(0, 1);
        }
        
        // 마지막 유효한 위치로 되돌리기
        ghost.move(0, -1);
        
        return ghost;
    }
    
    // 보드 렌더링
    render(showGrid = true, showGhost = true, currentTetromino = null) {
        if (!this.ctx) return;
        
        // 화면 지우기
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 흔들림 효과 적용
        this.ctx.save();
        if (this.shakeDuration > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(shakeX, shakeY);
            this.shakeDuration -= 16; // 대략 60fps
        }
        
        // 배경 그리기
        this.renderBackground();
        
        // 격자 그리기
        if (showGrid) {
            this.renderGrid();
        }
        
        // 고정된 블록들 그리기
        this.renderPlacedBlocks();
        
        // 고스트 블록 그리기
        if (showGhost && currentTetromino) {
            const ghost = this.getDropPosition(currentTetromino);
            this.renderTetromino(ghost);
        }
        
        // 현재 테트로미노 그리기
        if (currentTetromino) {
            this.renderTetromino(currentTetromino);
        }
        
        // 줄 제거 애니메이션
        this.renderLineAnimation();
        
        // 테두리 그리기
        this.renderBorder();
        
        this.ctx.restore();
    }
    
    // 배경 렌더링
    renderBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.borderSize, 
            this.borderSize, 
            this.width * this.cellSize, 
            this.height * this.cellSize
        );
    }
    
    // 격자 렌더링
    renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // 세로선
        for (let col = 0; col <= this.width; col++) {
            const x = this.borderSize + col * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.borderSize);
            this.ctx.lineTo(x, this.borderSize + this.height * this.cellSize);
            this.ctx.stroke();
        }
        
        // 가로선
        for (let row = 0; row <= this.height; row++) {
            const y = this.borderSize + row * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.borderSize, y);
            this.ctx.lineTo(this.borderSize + this.width * this.cellSize, y);
            this.ctx.stroke();
        }
    }
    
    // 배치된 블록들 렌더링
    renderPlacedBlocks() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.grid[row][col];
                if (cell) {
                    // 줄 제거 애니메이션 중인 줄은 특별히 처리
                    let alpha = 1;
                    if (this.completedLines.includes(row) && this.lineAnimation) {
                        alpha = this.getLineAnimationAlpha();
                    }
                    
                    this.renderBlock(col, row, cell.color, alpha);
                }
            }
        }
    }
    
    // 테트로미노 렌더링
    renderTetromino(tetromino) {
        const blocks = tetromino.getBlocks();
        
        for (const block of blocks) {
            if (block.y >= 0) { // 화면 위쪽은 렌더링 하지 않음
                this.renderBlock(block.x, block.y, block.color, tetromino.isGhost ? 0.3 : 1);
            }
        }
    }
    
    // 개별 블록 렌더링
    renderBlock(x, y, color, alpha = 1) {
        const pixelX = this.borderSize + x * this.cellSize;
        const pixelY = this.borderSize + y * this.cellSize;
        const size = this.cellSize - 2; // 블록 간 간격
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // 메인 블록 색상
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX + 1, pixelY + 1, size, size);
        
        // 3D 효과를 위한 하이라이트
        if (alpha > 0.5) { // 고스트 블록에는 3D 효과 없음
            // 위쪽과 왼쪽 하이라이트
            this.ctx.fillStyle = this.adjustBrightness(color, 40);
            this.ctx.fillRect(pixelX + 1, pixelY + 1, size, 3);
            this.ctx.fillRect(pixelX + 1, pixelY + 1, 3, size);
            
            // 아래쪽과 오른쪽 그림자
            this.ctx.fillStyle = this.adjustBrightness(color, -40);
            this.ctx.fillRect(pixelX + 1, pixelY + size - 2, size, 3);
            this.ctx.fillRect(pixelX + size - 2, pixelY + 1, 3, size);
        }
        
        this.ctx.restore();
    }
    
    // 색상 밝기 조정
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
    
    // 줄 제거 애니메이션 렌더링
    renderLineAnimation() {
        if (!this.lineAnimation) return;
        
        this.lineAnimation.timer += 16; // 대략 60fps
        
        if (this.lineAnimation.phase === 'highlight') {
            // 완성된 줄들을 번쩍이게 함
            const alpha = this.getLineAnimationAlpha();
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ffffff';
            
            for (const row of this.completedLines) {
                const y = this.borderSize + row * this.cellSize;
                this.ctx.fillRect(
                    this.borderSize, 
                    y, 
                    this.width * this.cellSize, 
                    this.cellSize
                );
            }
            
            this.ctx.restore();
        }
    }
    
    // 줄 애니메이션 투명도 계산
    getLineAnimationAlpha() {
        if (!this.lineAnimation) return 1;
        
        const progress = this.lineAnimation.timer / this.lineAnimation.duration;
        
        if (this.lineAnimation.phase === 'highlight') {
            // 번쩍임 효과
            return Math.abs(Math.sin(progress * Math.PI * 6)) * 0.8;
        }
        
        return 1 - progress;
    }
    
    // 테두리 렌더링
    renderBorder() {
        this.ctx.strokeStyle = '#4ecdc4';
        this.ctx.lineWidth = this.borderSize;
        this.ctx.setLineDash([]);
        
        // 발광 효과
        this.ctx.shadowColor = '#4ecdc4';
        this.ctx.shadowBlur = 10;
        
        this.ctx.strokeRect(
            this.borderSize / 2, 
            this.borderSize / 2, 
            this.width * this.cellSize + this.borderSize, 
            this.height * this.cellSize + this.borderSize
        );
        
        // 그림자 제거
        this.ctx.shadowBlur = 0;
    }
    
    // 보드 상태를 JSON으로 직렬화
    serialize() {
        return {
            width: this.width,
            height: this.height,
            grid: this.grid.map(row => 
                row.map(cell => cell ? { 
                    color: cell.color, 
                    type: cell.type 
                } : null)
            )
        };
    }
    
    // JSON에서 보드 상태 복원
    deserialize(data) {
        this.width = data.width;
        this.height = data.height;
        this.grid = data.grid.map(row =>
            row.map(cell => cell ? {
                ...cell,
                timestamp: Date.now()
            } : null)
        );
    }
}