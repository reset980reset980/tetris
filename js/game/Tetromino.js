// ===== 테트로미노 블록 시스템 =====

export class Tetromino {
    constructor(type) {
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.shape = this.getShape(type);
        this.color = this.getColor(type);
        this.isGhost = false;
    }
    
    // 7가지 표준 테트로미노 모양 정의
    getShape(type) {
        const shapes = {
            I: [
                [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
                [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
                [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
                [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
            ],
            O: [
                [[1,1], [1,1]],
                [[1,1], [1,1]],
                [[1,1], [1,1]],
                [[1,1], [1,1]]
            ],
            T: [
                [[0,1,0], [1,1,1], [0,0,0]],
                [[0,1,0], [0,1,1], [0,1,0]],
                [[0,0,0], [1,1,1], [0,1,0]],
                [[0,1,0], [1,1,0], [0,1,0]]
            ],
            S: [
                [[0,1,1], [1,1,0], [0,0,0]],
                [[0,1,0], [0,1,1], [0,0,1]],
                [[0,0,0], [0,1,1], [1,1,0]],
                [[1,0,0], [1,1,0], [0,1,0]]
            ],
            Z: [
                [[1,1,0], [0,1,1], [0,0,0]],
                [[0,0,1], [0,1,1], [0,1,0]],
                [[0,0,0], [1,1,0], [0,1,1]],
                [[0,1,0], [1,1,0], [1,0,0]]
            ],
            J: [
                [[1,0,0], [1,1,1], [0,0,0]],
                [[0,1,1], [0,1,0], [0,1,0]],
                [[0,0,0], [1,1,1], [0,0,1]],
                [[0,1,0], [0,1,0], [1,1,0]]
            ],
            L: [
                [[0,0,1], [1,1,1], [0,0,0]],
                [[0,1,0], [0,1,0], [0,1,1]],
                [[0,0,0], [1,1,1], [1,0,0]],
                [[1,1,0], [0,1,0], [0,1,0]]
            ]
        };
        
        return shapes[type] || shapes.T;
    }
    
    // 테트로미노 색상 정의
    getColor(type) {
        const colors = {
            I: '#00f5ff',  // Cyan - 하늘색
            O: '#ffed4e',  // Yellow - 노란색
            T: '#a020f0',  // Purple - 보라색
            S: '#32cd32',  // Green - 초록색
            Z: '#ff4757',  // Red - 빨간색
            J: '#3742fa',  // Blue - 파란색
            L: '#ff8c00'   // Orange - 주황색
        };
        
        return colors[type] || colors.T;
    }
    
    // 현재 회전 상태의 모양 가져오기
    getCurrentShape() {
        return this.shape[this.rotation];
    }
    
    // 블록의 실제 좌표들 계산
    getBlocks() {
        const blocks = [];
        const currentShape = this.getCurrentShape();
        
        for (let row = 0; row < currentShape.length; row++) {
            for (let col = 0; col < currentShape[row].length; col++) {
                if (currentShape[row][col]) {
                    blocks.push({
                        x: this.x + col,
                        y: this.y + row,
                        color: this.isGhost ? this.getGhostColor() : this.color
                    });
                }
            }
        }
        
        return blocks;
    }
    
    // 고스트 블록 색상 (반투명)
    getGhostColor() {
        const rgb = this.hexToRgb(this.color);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
    }
    
    // hex를 rgb로 변환
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    // 블록 이동
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
    
    // 블록 회전
    rotate(direction = 1) {
        this.rotation = (this.rotation + direction + 4) % 4;
    }
    
    // 위치 설정
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // 회전 설정
    setRotation(rotation) {
        this.rotation = rotation % 4;
    }
    
    // 블록 복사
    clone() {
        const clone = new Tetromino(this.type);
        clone.x = this.x;
        clone.y = this.y;
        clone.rotation = this.rotation;
        clone.isGhost = this.isGhost;
        return clone;
    }
    
    // 고스트 블록 생성
    createGhost() {
        const ghost = this.clone();
        ghost.isGhost = true;
        return ghost;
    }
    
    // 블록의 경계 박스 계산
    getBoundingBox() {
        const blocks = this.getBlocks();
        if (blocks.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        const minX = Math.min(...blocks.map(block => block.x));
        const maxX = Math.max(...blocks.map(block => block.x));
        const minY = Math.min(...blocks.map(block => block.y));
        const maxY = Math.max(...blocks.map(block => block.y));
        
        return { minX, maxX, minY, maxY };
    }
    
    // 블록의 폭과 높이 계산
    getDimensions() {
        const currentShape = this.getCurrentShape();
        return {
            width: currentShape[0] ? currentShape[0].length : 0,
            height: currentShape.length
        };
    }
    
    // 회전 후 위치 조정을 위한 킥 테이블 (SRS - Super Rotation System)
    getKickOffsets(fromRotation, toRotation) {
        const kickData = {
            I: {
                '0->1': [[-2, 0], [1, 0], [-2, -1], [1, 2]],
                '1->0': [[2, 0], [-1, 0], [2, 1], [-1, -2]],
                '1->2': [[-1, 0], [2, 0], [-1, 2], [2, -1]],
                '2->1': [[1, 0], [-2, 0], [1, -2], [-2, 1]],
                '2->3': [[2, 0], [-1, 0], [2, 1], [-1, -2]],
                '3->2': [[-2, 0], [1, 0], [-2, -1], [1, 2]],
                '3->0': [[1, 0], [-2, 0], [1, -2], [-2, 1]],
                '0->3': [[-1, 0], [2, 0], [-1, 2], [2, -1]]
            },
            default: {
                '0->1': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
                '1->0': [[1, 0], [1, -1], [0, 2], [1, 2]],
                '1->2': [[1, 0], [1, -1], [0, 2], [1, 2]],
                '2->1': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
                '2->3': [[1, 0], [1, 1], [0, -2], [1, -2]],
                '3->2': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
                '3->0': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
                '0->3': [[1, 0], [1, 1], [0, -2], [1, -2]]
            }
        };
        
        const key = `${fromRotation}->${toRotation}`;
        const data = this.type === 'I' ? kickData.I : kickData.default;
        
        return data[key] || [[0, 0]];
    }
}

// 랜덤 테트로미노 생성기
export class TetrominoGenerator {
    constructor() {
        this.bag = [];
        this.types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        this.refillBag();
    }
    
    // 7-bag 시스템으로 가방 채우기
    refillBag() {
        const newBag = [...this.types];
        
        // Fisher-Yates 셔플
        for (let i = newBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
        }
        
        this.bag = this.bag.concat(newBag);
    }
    
    // 다음 테트로미노 생성
    next() {
        if (this.bag.length === 0) {
            this.refillBag();
        }
        
        const type = this.bag.shift();
        return new Tetromino(type);
    }
    
    // 미리보기용 (실제로 생성하지 않고 확인만)
    peek(count = 1) {
        while (this.bag.length < count) {
            this.refillBag();
        }
        
        return this.bag.slice(0, count);
    }
}