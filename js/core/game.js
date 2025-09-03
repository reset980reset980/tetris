import { Board } from './board.js';
import { Piece } from './piece.js';
import { EventEmitter } from './eventEmitter.js';

export class Game extends EventEmitter {
    constructor(options) {
        super();
        
        this.canvas = options.canvas;
        this.nextCanvas = options.nextCanvas;
        this.holdCanvas = options.holdCanvas;
        this.mode = options.mode || 'single';
        this.networkManager = options.networkManager;
        this.gameData = options.gameData;
        this.soundManager = options.soundManager;
        
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        // Game state
        this.board = new Board(10, 20);
        this.currentPiece = null;
        this.nextPieces = [];
        this.heldPiece = null;
        this.canHold = true;
        
        // Scoring and level
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.backToBack = false;
        
        // Game timing
        this.dropTimer = 0;
        this.dropInterval = 1000; // 1 second initial drop speed
        this.lastTime = 0;
        
        // Game control
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Input handling
        this.keys = {};
        this.keyRepeatTimers = {};
        this.lastSoftDrop = 0;
        
        // Battle items (for multiplayer)
        this.battleItems = {
            'line-clear': 0,
            'block-bomb': 0,
            'speed-up': 0,
            'shuffle': 0
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.generateNextPieces();
        this.spawnNewPiece();
        
        console.log('Game initialized in', this.mode, 'mode');
    }
    
    setupCanvas() {
        // Set up main game canvas
        this.canvas.width = 300;
        this.canvas.height = 600;
        
        // Set up next piece canvas
        this.nextCanvas.width = 120;
        this.nextCanvas.height = 120;
        
        // Set up hold piece canvas
        this.holdCanvas.width = 120;
        this.holdCanvas.height = 120;
        
        // Set canvas styles for crisp rendering
        [this.ctx, this.nextCtx, this.holdCtx].forEach(ctx => {
            ctx.imageSmoothingEnabled = false;
        });
    }
    
    generateNextPieces() {
        const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        
        // Generate bag of pieces
        while (this.nextPieces.length < 7) {
            const shuffled = [...pieces];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            this.nextPieces.push(...shuffled);
        }
    }
    
    spawnNewPiece() {
        if (this.nextPieces.length < 7) {
            this.generateNextPieces();
        }
        
        const pieceType = this.nextPieces.shift();
        this.currentPiece = new Piece(pieceType, 4, 0);
        
        // Check if game over
        if (!this.board.isValidPosition(this.currentPiece)) {
            this.gameOver();
            return false;
        }
        
        this.canHold = true;
        return true;
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.lastTime = performance.now();
        
        this.gameLoop();
        
        // Start background music
        if (this.soundManager) {
            this.soundManager.playBackgroundMusic();
        }
        
        console.log('Game started');
        this.emit('gameStart');
    }
    
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        console.log('Game paused');
        this.emit('gamePause');
    }
    
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game resumed');
        this.emit('gameResume');
    }
    
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        // Stop background music
        if (this.soundManager) {
            this.soundManager.stopBackgroundMusic();
        }
        
        console.log('Game stopped');
        this.emit('gameStop');
    }
    
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        if (this.isRunning && !this.isPaused) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    update(deltaTime) {
        if (!this.currentPiece) return;
        
        // Handle piece dropping
        this.dropTimer += deltaTime;
        if (this.dropTimer >= this.dropInterval) {
            this.movePieceDown();
            this.dropTimer = 0;
        }
        
        // Handle input
        this.handleInputs();
        
        // Update score display
        this.emit('scoreUpdate', {
            score: this.score,
            level: this.level,
            lines: this.lines,
            items: this.battleItems
        });
    }
    
    handleInputs() {
        // Handle continuous key presses with timing control
        const currentTime = performance.now();
        
        // Soft drop handling with controlled timing  
        if (this.keys['ArrowDown']) {
            if (!this.lastSoftDrop || (currentTime - this.lastSoftDrop) > 100) { // 100ms interval for soft drop
                if (this.movePieceDown(true)) {
                    this.soundManager?.play('move');
                    this.lastSoftDrop = currentTime;
                }
            }
        }
    }
    
    handleInput(event) {
        const key = event.code;
        
        // Prevent handled keys from bubbling
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyC', 'KeyZ', 'KeyX'].includes(key)) {
            event.preventDefault();
        }
        
        // Prevent key repeat for critical game actions
        if (event.repeat) {
            return;
        }
        
        this.keys[key] = event.type === 'keydown';
        
        if (event.type === 'keydown') {
            this.handleKeyDown(key);
        }
    }
    
    handleKeyDown(key) {
        if (!this.currentPiece || this.isPaused) return;
        
        switch (key) {
            case 'ArrowLeft':
                if (this.movePieceHorizontal(-1)) {
                    this.soundManager?.play('move');
                }
                break;
                
            case 'ArrowRight':
                if (this.movePieceHorizontal(1)) {
                    this.soundManager?.play('move');
                }
                break;
                
            // ArrowDown is handled in handleInputs() for continuous input
                
            case 'Space':
                this.hardDrop();
                this.soundManager?.play('drop');
                break;
                
            case 'ArrowUp':
            case 'KeyX':
                if (this.rotatePiece(1)) { // Clockwise
                    this.soundManager?.play('rotate');
                }
                break;
                
            case 'KeyZ':
                if (this.rotatePiece(-1)) { // Counter-clockwise
                    this.soundManager?.play('rotate');
                }
                break;
                
            case 'KeyC':
                if (this.holdPiece()) {
                    this.soundManager?.play('move');
                }
                break;
                
            // Battle items (multiplayer only)
            case 'Digit1':
                if (this.mode !== 'single') this.useItem('line-clear');
                break;
            case 'Digit2':
                if (this.mode !== 'single') this.useItem('block-bomb');
                break;
            case 'Digit3':
                if (this.mode !== 'single') this.useItem('speed-up');
                break;
            case 'Digit4':
                if (this.mode !== 'single') this.useItem('shuffle');
                break;
        }
    }
    
    movePieceHorizontal(direction) {
        if (!this.currentPiece) return;
        
        const newX = this.currentPiece.x + direction;
        if (this.board.isValidPosition(this.currentPiece, newX, this.currentPiece.y)) {
            this.currentPiece.x = newX;
        }
    }
    
    movePieceDown(isSoftDrop = false) {
        if (!this.currentPiece) return;
        
        const newY = this.currentPiece.y + 1;
        if (this.board.isValidPosition(this.currentPiece, this.currentPiece.x, newY)) {
            this.currentPiece.y = newY;
            if (isSoftDrop) {
                this.score += 1; // Soft drop bonus
            }
        } else {
            this.placePiece();
        }
    }
    
    hardDrop() {
        if (!this.currentPiece) return;
        
        let dropDistance = 0;
        while (this.board.isValidPosition(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        
        this.score += dropDistance * 2; // Hard drop bonus
        this.placePiece();
    }
    
    rotatePiece(direction) {
        if (!this.currentPiece) return;
        
        const originalRotation = this.currentPiece.rotation;
        this.currentPiece.rotate(direction);
        
        // Check if rotation is valid, try wall kicks if not
        if (!this.board.isValidPosition(this.currentPiece)) {
            const wallKicks = this.getWallKicks(this.currentPiece.type, originalRotation, this.currentPiece.rotation);
            
            let validKick = false;
            for (const kick of wallKicks) {
                const testX = this.currentPiece.x + kick.x;
                const testY = this.currentPiece.y + kick.y;
                
                if (this.board.isValidPosition(this.currentPiece, testX, testY)) {
                    this.currentPiece.x = testX;
                    this.currentPiece.y = testY;
                    validKick = true;
                    break;
                }
            }
            
            if (!validKick) {
                // Rotation failed, revert
                this.currentPiece.rotation = originalRotation;
            }
        }
    }
    
    getWallKicks(pieceType, fromRotation, toRotation) {
        // Simplified wall kick system (SRS - Super Rotation System)
        // This is a basic implementation, real Tetris has more complex wall kicks
        const basicKicks = [
            { x: 0, y: 0 },   // No kick
            { x: -1, y: 0 },  // Left
            { x: 1, y: 0 },   // Right
            { x: 0, y: -1 },  // Up
            { x: -1, y: -1 }, // Left + Up
            { x: 1, y: -1 }   // Right + Up
        ];
        
        return basicKicks;
    }
    
    holdPiece() {
        if (!this.currentPiece || !this.canHold) return;
        
        if (this.heldPiece === null) {
            // First hold
            this.heldPiece = this.currentPiece.type;
            this.spawnNewPiece();
        } else {
            // Swap with held piece
            const tempType = this.heldPiece;
            this.heldPiece = this.currentPiece.type;
            this.currentPiece = new Piece(tempType, 4, 0);
            
            // Check if swapped piece can be placed
            if (!this.board.isValidPosition(this.currentPiece)) {
                this.gameOver();
                return;
            }
        }
        
        this.canHold = false;
    }
    
    placePiece() {
        if (!this.currentPiece) return;
        
        this.board.placePiece(this.currentPiece);
        
        // Check for line clears
        const clearedLines = this.board.clearLines();
        if (clearedLines.length > 0) {
            this.handleLineClears(clearedLines);
        } else {
            this.combo = 0; // Reset combo if no lines cleared
        }
        
        // Generate attack for multiplayer
        if (this.mode !== 'single' && clearedLines.length > 0) {
            this.generateAttack(clearedLines.length);
        }
        
        // Spawn next piece
        this.spawnNewPiece();
    }
    
    handleLineClears(clearedLines) {
        const linesCleared = clearedLines.length;
        this.lines += linesCleared;
        
        // Play line clear sound
        this.soundManager?.play('lineClear');
        
        // Calculate score
        let baseScore = 0;
        switch (linesCleared) {
            case 1: baseScore = 100; break;
            case 2: baseScore = 300; break;
            case 3: baseScore = 500; break;
            case 4: baseScore = 800; break; // Tetris
        }
        
        // Level and combo multipliers
        let multiplier = this.level;
        if (this.combo > 0) {
            multiplier += this.combo * 0.5;
        }
        
        this.score += Math.floor(baseScore * multiplier);
        this.combo++;
        
        // Level progression
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 100); // Increase speed
            this.soundManager?.play('levelUp');
            this.emit('levelUp', this.level);
        }
        
        // Add battle items in multiplayer
        if (this.mode !== 'single') {
            this.addBattleItems(linesCleared);
        }
        
        this.emit('lineClears', {
            lines: linesCleared,
            totalLines: this.lines,
            score: this.score,
            level: this.level,
            combo: this.combo
        });
    }
    
    addBattleItems(linesCleared) {
        // Add items based on lines cleared
        if (linesCleared >= 2) {
            const itemTypes = Object.keys(this.battleItems);
            const randomItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            this.battleItems[randomItem]++;
        }
        
        // Tetris gives more items
        if (linesCleared === 4) {
            this.battleItems['line-clear']++;
        }
    }
    
    generateAttack(linesCleared) {
        if (!this.networkManager) return;
        
        let attackPower = 0;
        switch (linesCleared) {
            case 1: attackPower = 0; break; // Single doesn't send attack
            case 2: attackPower = 1; break; // Double
            case 3: attackPower = 2; break; // Triple
            case 4: attackPower = 4; break; // Tetris
        }
        
        if (attackPower > 0) {
            this.emit('attack', {
                power: attackPower,
                combo: this.combo,
                type: linesCleared === 4 ? 'tetris' : 'normal'
            });
        }
    }
    
    useItem(itemType) {
        if (this.battleItems[itemType] <= 0) return;
        
        this.battleItems[itemType]--;
        
        switch (itemType) {
            case 'line-clear':
                // Clear bottom line of current player's board
                this.board.addGarbageLines(1, true); // true means remove instead
                break;
                
            case 'block-bomb':
                // Clear 3x3 area around current piece
                if (this.currentPiece) {
                    this.board.clearArea(this.currentPiece.x, this.currentPiece.y, 3);
                }
                break;
                
            case 'speed-up':
                // Temporarily increase drop speed for opponents (sent via network)
                if (this.networkManager) {
                    this.networkManager.sendItemUsed({
                        type: 'speed-up',
                        target: 'opponents'
                    });
                }
                break;
                
            case 'shuffle':
                // Shuffle opponents' current piece
                if (this.networkManager) {
                    this.networkManager.sendItemUsed({
                        type: 'shuffle',
                        target: 'opponents'
                    });
                }
                break;
        }
        
        console.log(`Used item: ${itemType}`);
    }
    
    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;
        
        // Stop background music and play game over sound
        if (this.soundManager) {
            this.soundManager.stopBackgroundMusic();
            this.soundManager.play('gameOver');
        }
        
        const gameOverData = {
            score: this.score,
            level: this.level,
            lines: this.lines,
            mode: this.mode,
            time: Date.now()
        };
        
        console.log('Game Over!', gameOverData);
        this.emit('gameOver', gameOverData);
        
        // Send game over to network
        if (this.networkManager) {
            this.networkManager.sendGameOver(gameOverData);
        }
    }
    
    render() {
        // Clear canvases
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        
        // Render board
        this.board.render(this.ctx);
        
        // Render current piece
        if (this.currentPiece) {
            this.currentPiece.render(this.ctx, 30); // 30px cell size
        }
        
        // Render next piece
        if (this.nextPieces.length > 0) {
            const nextPiece = new Piece(this.nextPieces[0], 2, 2);
            nextPiece.render(this.nextCtx, 25); // Smaller size
        }
        
        // Render held piece
        if (this.heldPiece) {
            const heldPiece = new Piece(this.heldPiece, 2, 2);
            heldPiece.render(this.holdCtx, 25); // Smaller size
        }
    }
    
    // Getters for external access
    isPaused() {
        return this.isPaused;
    }
    
    getGameState() {
        return {
            board: this.board.serialize(),
            currentPiece: this.currentPiece ? this.currentPiece.serialize() : null,
            nextPieces: this.nextPieces.slice(0, 5),
            heldPiece: this.heldPiece,
            score: this.score,
            level: this.level,
            lines: this.lines,
            combo: this.combo,
            battleItems: { ...this.battleItems },
            isGameOver: this.isGameOver
        };
    }
}