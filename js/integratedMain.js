// ===== Integrated Tetris Game with All Features =====
import { ItemBattleSystem } from './itemBattle.js';
import { NetworkMultiplayer } from './networkMultiplayer.js';
import { SoundSystem } from './soundSystem.js';

class IntegratedTetrisGame {
    constructor() {
        // Core game properties
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextBlockCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Game dimensions
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 30;
        
        // Set canvas sizes
        this.canvas.width = this.cols * this.blockSize;
        this.canvas.height = this.rows * this.blockSize;
        this.nextCanvas.width = 4 * this.blockSize;
        this.nextCanvas.height = 4 * this.blockSize;
        
        // Game state
        this.board = this.createBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.backToBack = false;
        this.gameOver = false;
        this.paused = false;
        this.controlsEnabled = true;
        
        // Game timing
        this.dropSpeed = 1000;
        this.dropTimer = null;
        this.gravity = 1;
        
        // Game mode
        this.gameMode = 'single'; // single, battle, multi
        this.currentOpponent = null;
        
        // Enhanced systems
        this.itemBattle = new ItemBattleSystem(this);
        this.network = new NetworkMultiplayer();
        this.sound = new SoundSystem();
        
        // Tetromino definitions with enhanced colors
        this.tetrominos = {
            I: { shape: [[1,1,1,1]], color: '#06b6d4', name: 'I' },
            O: { shape: [[1,1],[1,1]], color: '#eab308', name: 'O' },
            T: { shape: [[0,1,0],[1,1,1]], color: '#a855f7', name: 'T' },
            S: { shape: [[0,1,1],[1,1,0]], color: '#10b981', name: 'S' },
            Z: { shape: [[1,1,0],[0,1,1]], color: '#ef4444', name: 'Z' },
            J: { shape: [[1,0,0],[1,1,1]], color: '#3b82f6', name: 'J' },
            L: { shape: [[0,0,1],[1,1,1]], color: '#f97316', name: 'L' }
        };
        
        this.init();
    }
    
    async init() {
        // Setup UI first (shows mode selector)
        this.setupUI();
        
        // Setup controls
        this.setupControls();
        
        // Don't start game automatically - wait for mode selection
        // Game will start when user selects a mode in setGameMode()
        console.log('Game initialized. Please select a game mode.');
    }
    
    setupUI() {
        // Add game mode selector
        const modeSelector = document.createElement('div');
        modeSelector.className = 'game-mode-selector';
        modeSelector.innerHTML = `
            <h2>Select Game Mode</h2>
            <div class="mode-buttons">
                <button id="singleMode" class="mode-btn">Single Player</button>
                <button id="battleMode" class="mode-btn">1vs1 Battle</button>
                <button id="multiMode" class="mode-btn">4P Multi Battle</button>
            </div>
        `;
        
        // Insert into body, positioned over everything
        if (!document.querySelector('.game-mode-selector')) {
            document.body.appendChild(modeSelector);
        }
        
        // Mode button handlers
        document.getElementById('singleMode')?.addEventListener('click', () => {
            this.setGameMode('single');
        });
        
        document.getElementById('battleMode')?.addEventListener('click', () => {
            this.setGameMode('battle');
        });
        
        document.getElementById('multiMode')?.addEventListener('click', () => {
            this.setGameMode('multi');
        });
    }
    
    async setGameMode(mode) {
        this.gameMode = mode;
        
        // Hide mode selector
        document.querySelector('.game-mode-selector')?.classList.add('hidden');
        
        // Initialize multiplayer if needed
        if (mode !== 'single') {
            await this.initMultiplayer();
        }
        
        // Change background music based on mode
        if (mode === 'battle' || mode === 'multi') {
            this.sound.playMusic('battle');
        }
        
        this.startNewGame();
    }
    
    async initMultiplayer() {
        try {
            await this.network.connect();
            
            if (this.gameMode === 'battle') {
                // Create or join 2-player room
                const roomData = await this.network.createRoom(2);
                console.log('Created battle room:', roomData.roomId);
            } else if (this.gameMode === 'multi') {
                // Create or join 4-player room
                const roomData = await this.network.createRoom(4);
                console.log('Created multi room:', roomData.roomId);
            }
            
            // Setup network event handlers
            this.setupNetworkHandlers();
            
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
            // Fallback to simulation mode
            this.network.startSimulationMode();
        }
    }
    
    setupNetworkHandlers() {
        // Handle opponent updates
        this.network.onOpponentUpdate = (data) => {
            this.updateOpponentDisplay(data);
        };
        
        // Handle attacks received
        this.network.onAttackReceived = (data) => {
            this.receiveGarbageLines(data.lines);
            this.sound.play('attacked');
        };
        
        // Handle item effects
        this.network.onItemEffect = (data) => {
            this.applyItemEffect(data);
        };
        
        // Handle game start
        this.network.onGameStarted = () => {
            this.startGame();
        };
        
        // Handle player elimination
        this.network.onPlayerEliminated = (data) => {
            console.log(`Player ${data.playerId} eliminated!`);
            this.showNotification(`Player ${data.playerId} eliminated!`);
        };
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.controlsEnabled || this.gameOver || this.paused) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.movePiece(-1, 0);
                    this.sound.play('move');
                    break;
                case 'ArrowRight':
                    this.movePiece(1, 0);
                    this.sound.play('move');
                    break;
                case 'ArrowDown':
                    this.softDrop();
                    break;
                case 'ArrowUp':
                case 'x':
                    this.rotatePiece(1);
                    this.sound.play('rotate');
                    break;
                case 'z':
                    this.rotatePiece(-1);
                    this.sound.play('rotate');
                    break;
                case ' ':
                    this.hardDrop();
                    break;
                case 'c':
                    this.holdPiece();
                    break;
                case 'p':
                    this.togglePause();
                    break;
                // Item usage keys (1-0)
                case '1': case '2': case '3': case '4': case '5':
                case '6': case '7': case '8': case '9': case '0':
                    // Item system handles these
                    break;
            }
        });
    }
    
    createBoard() {
        return Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    }
    
    startNewGame() {
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        
        // Clear board
        this.board = this.createBoard();
        
        // Spawn first pieces
        this.nextPiece = this.randomPiece();
        this.spawnPiece();
        
        // Start game loop
        this.startGameLoop();
        
        // Play music based on mode
        if (this.gameMode === 'battle' || this.gameMode === 'multi') {
            this.sound.playMusic('battle');
        } else {
            this.sound.playMusic('main');
        }
        
        // Show multiplayer boards if needed
        if (this.gameMode !== 'single') {
            if (this.gameMode === 'battle') {
                // 1vs1 battle mode - show right panel
                const multiplayerBoards = document.getElementById('multiplayerBoards');
                const fourPlayerBoards = document.getElementById('fourPlayerBoards');
                
                if (multiplayerBoards) multiplayerBoards.style.display = 'block';
                if (fourPlayerBoards) fourPlayerBoards.style.display = 'none';
                
            } else if (this.gameMode === 'multi') {
                // 4 player mode - show bottom layout
                const multiplayerBoards = document.getElementById('multiplayerBoards');
                const fourPlayerBoards = document.getElementById('fourPlayerBoards');
                
                if (multiplayerBoards) multiplayerBoards.style.display = 'none';
                if (fourPlayerBoards) {
                    fourPlayerBoards.style.display = 'grid';
                    // Update opponent displays for 4 player mode
                    this.setupFourPlayerDisplay();
                }
            }
        } else {
            // Single player - hide all multiplayer boards
            const multiplayerBoards = document.getElementById('multiplayerBoards');
            const fourPlayerBoards = document.getElementById('fourPlayerBoards');
            
            if (multiplayerBoards) multiplayerBoards.style.display = 'none';
            if (fourPlayerBoards) fourPlayerBoards.style.display = 'none';
        }
        
        // Show game started notification
        this.showNotification(`${this.gameMode.toUpperCase()} Mode Started!`);
    }
    
    setupFourPlayerDisplay() {
        // Initialize AI opponents for 4-player mode
        const canvases = [
            'opponent-AI1',
            'opponent-AI2', 
            'opponent-AI3'
        ];
        
        canvases.forEach((canvasId, index) => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                // Draw empty board initially
                this.drawEmptyBoard(ctx, canvas.width, canvas.height);
            }
        });
        
        // Show room info for multiplayer
        this.showRoomInfo();
    }
    
    showRoomInfo() {
        const notification = document.createElement('div');
        notification.className = 'room-info';
        notification.innerHTML = `
            <div class="room-info-content">
                <h3>🎮 Multiplayer Room</h3>
                <p><strong>Room Code:</strong> <span id="roomCode">${this.generateRoomCode()}</span></p>
                <p><strong>Players:</strong> <span id="playerCount">1/4</span></p>
                <div class="room-controls">
                    <button id="copyRoomCode" class="btn btn-small">Copy Code</button>
                    <button id="joinRoomBtn" class="btn btn-small">Join Room</button>
                    <input type="text" id="joinRoomInput" placeholder="Enter room code..." style="display: none;">
                </div>
                <p class="room-note">📝 현재는 AI와 대전 (실제 서버 구현 예정)</p>
                <button id="closeRoomInfo" class="btn btn-secondary">Close</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add event listeners
        document.getElementById('copyRoomCode')?.addEventListener('click', () => {
            const roomCode = document.getElementById('roomCode').textContent;
            navigator.clipboard.writeText(roomCode).then(() => {
                this.showNotification('Room code copied!');
            });
        });
        
        document.getElementById('joinRoomBtn')?.addEventListener('click', () => {
            const input = document.getElementById('joinRoomInput');
            input.style.display = input.style.display === 'none' ? 'block' : 'none';
            if (input.style.display === 'block') {
                input.focus();
            }
        });
        
        document.getElementById('joinRoomInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const roomCode = e.target.value.trim();
                if (roomCode) {
                    this.joinRoom(roomCode);
                    notification.remove();
                }
            }
        });
        
        document.getElementById('closeRoomInfo')?.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 10000);
    }
    
    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    joinRoom(roomCode) {
        this.showNotification(`Joining room: ${roomCode} (현재 AI 시뮬레이션)`);
        // In real implementation, this would connect to actual room
    }
    
    drawEmptyBoard(ctx, width, height) {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const blockSize = width / 10;
        
        // Vertical lines
        for (let x = 0; x <= 10; x++) {
            ctx.beginPath();
            ctx.moveTo(x * blockSize, 0);
            ctx.lineTo(x * blockSize, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= 20; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * blockSize);
            ctx.lineTo(width, y * blockSize);
            ctx.stroke();
        }
    }
    
    startGame() {
        // Alias for compatibility
        this.startNewGame();
    }
    
    startGameLoop() {
        if (this.dropTimer) clearInterval(this.dropTimer);
        
        this.dropTimer = setInterval(() => {
            if (!this.paused && !this.gameOver) {
                this.dropPiece();
            }
        }, this.dropSpeed / this.level);
    }
    
    randomPiece() {
        const pieces = Object.keys(this.tetrominos);
        const type = pieces[Math.floor(Math.random() * pieces.length)];
        const piece = this.tetrominos[type];
        
        return {
            shape: piece.shape,
            color: piece.color,
            type: type,
            x: Math.floor((this.cols - piece.shape[0].length) / 2),
            y: 0,
            rotation: 0
        };
    }
    
    spawnPiece() {
        this.currentPiece = { ...this.nextPiece };
        this.nextPiece = this.randomPiece();
        
        // Check if spawn position is blocked
        if (!this.isValidPosition(this.currentPiece)) {
            this.endGame();
        }
        
        this.drawNextPiece();
    }
    
    movePiece(dx, dy) {
        const newPiece = {
            ...this.currentPiece,
            x: this.currentPiece.x + dx,
            y: this.currentPiece.y + dy
        };
        
        if (this.isValidPosition(newPiece)) {
            this.currentPiece = newPiece;
            return true;
        }
        return false;
    }
    
    rotatePiece(direction) {
        const rotated = this.rotate(this.currentPiece.shape, direction);
        const newPiece = {
            ...this.currentPiece,
            shape: rotated,
            rotation: (this.currentPiece.rotation + direction + 4) % 4
        };
        
        // Try wall kicks
        const kicks = this.getWallKicks(this.currentPiece.type, this.currentPiece.rotation, newPiece.rotation);
        
        for (let kick of kicks) {
            const testPiece = {
                ...newPiece,
                x: newPiece.x + kick[0],
                y: newPiece.y + kick[1]
            };
            
            if (this.isValidPosition(testPiece)) {
                this.currentPiece = testPiece;
                
                // Check for T-spin
                if (this.currentPiece.type === 'T') {
                    this.checkTSpin();
                }
                return true;
            }
        }
        return false;
    }
    
    rotate(matrix, direction) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (direction > 0) {
                    rotated[col][rows - 1 - row] = matrix[row][col];
                } else {
                    rotated[cols - 1 - col][row] = matrix[row][col];
                }
            }
        }
        
        return rotated;
    }
    
    getWallKicks(type, fromRotation, toRotation) {
        // SRS wall kick data
        const wallKickData = {
            'I': [
                [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
                [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
                [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
                [[0,0], [1,0], [-2,0], [1,-2], [-2,1]]
            ],
            'default': [
                [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
                [[0,0], [1,0], [1,-1], [0,2], [1,2]],
                [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
                [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]]
            ]
        };
        
        const data = wallKickData[type] || wallKickData['default'];
        return data[fromRotation];
    }
    
    dropPiece() {
        if (!this.movePiece(0, 1)) {
            this.lockPiece();
        }
    }
    
    softDrop() {
        if (this.movePiece(0, 1)) {
            this.score += 1;
            this.sound.play('drop');
        }
    }
    
    hardDrop() {
        let dropDistance = 0;
        while (this.movePiece(0, 1)) {
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this.lockPiece();
        this.sound.play('hardDrop');
    }
    
    lockPiece() {
        // Add piece to board
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const boardY = this.currentPiece.y + row;
                    const boardX = this.currentPiece.x + col;
                    
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.type;
                    }
                }
            }
        }
        
        // Check for line clears
        const clearedLines = this.checkLineClears();
        
        // Update score and stats
        this.updateScore(clearedLines);
        
        // Send game state in multiplayer
        if (this.gameMode !== 'single') {
            this.network.sendGameState({
                board: this.board,
                currentPiece: this.currentPiece,
                nextPiece: this.nextPiece,
                score: this.score,
                level: this.level,
                lines: this.lines,
                combo: this.combo,
                items: this.itemBattle.items
            });
        }
        
        // Spawn next piece
        this.spawnPiece();
    }
    
    checkLineClears() {
        const linesToClear = [];
        
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                linesToClear.push(row);
            }
        }
        
        if (linesToClear.length > 0) {
            this.clearLines(linesToClear);
            
            // Play appropriate sound
            if (linesToClear.length === 4) {
                this.sound.play('tetris');
                this.showNotification('TETRIS!');
                this.itemBattle.calculateItemReward('tetris', 4);
            } else if (linesToClear.length === 3) {
                this.sound.play('tripleClear');
            } else if (linesToClear.length === 2) {
                this.sound.play('doubleClear');
            } else {
                this.sound.play('lineClear');
            }
            
            // Update combo
            this.combo++;
            if (this.combo > 1) {
                this.itemBattle.showCombo(this.combo);
                this.sound.play('combo', this.combo);
            }
        } else {
            this.combo = 0;
        }
        
        return linesToClear.length;
    }
    
    clearLines(lines) {
        // Animate line clear
        this.animateLineClear(lines);
        
        // Remove cleared lines
        for (let line of lines.sort((a, b) => b - a)) {
            this.board.splice(line, 1);
            this.board.unshift(Array(this.cols).fill(0));
        }
        
        this.lines += lines.length;
        
        // Check for level up
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.sound.play('levelUp');
            this.showNotification(`Level ${this.level}!`);
            this.startGameLoop(); // Restart with new speed
        }
    }
    
    animateLineClear(lines) {
        // Add flash effect to cleared lines
        for (let line of lines) {
            for (let col = 0; col < this.cols; col++) {
                // Flash animation will be handled in draw method
                this.board[line][col] = 'clearing';
            }
        }
        
        // Redraw with flash effect
        this.draw();
        
        // Reset after animation
        setTimeout(() => {
            for (let line of lines) {
                for (let col = 0; col < this.cols; col++) {
                    if (this.board[line][col] === 'clearing') {
                        this.board[line][col] = 0;
                    }
                }
            }
        }, 200);
    }
    
    checkTSpin() {
        // Check T-spin corners
        const corners = [
            [this.currentPiece.y, this.currentPiece.x],
            [this.currentPiece.y, this.currentPiece.x + 2],
            [this.currentPiece.y + 2, this.currentPiece.x],
            [this.currentPiece.y + 2, this.currentPiece.x + 2]
        ];
        
        let filledCorners = 0;
        for (let [y, x] of corners) {
            if (y < 0 || y >= this.rows || x < 0 || x >= this.cols || this.board[y][x] !== 0) {
                filledCorners++;
            }
        }
        
        if (filledCorners >= 3) {
            this.sound.play('tSpin');
            this.showNotification('T-SPIN!');
            this.itemBattle.calculateItemReward('tspin', 1);
            return true;
        }
        
        return false;
    }
    
    updateScore(lines) {
        const basePoints = [0, 100, 300, 500, 800];
        let points = basePoints[lines] * this.level;
        
        // Combo bonus
        if (this.combo > 1) {
            points += 50 * this.combo * this.level;
        }
        
        // Back-to-back bonus
        if (lines === 4 || this.currentPiece.type === 'T') {
            if (this.backToBack) {
                points *= 1.5;
                this.sound.play('backToBack');
                this.itemBattle.calculateItemReward('backToBack', 1);
            }
            this.backToBack = true;
        } else if (lines > 0) {
            this.backToBack = false;
        }
        
        this.score += Math.floor(points);
        this.updateDisplay();
    }
    
    isValidPosition(piece, board = this.board) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const newX = piece.x + col;
                    const newY = piece.y + row;
                    
                    if (newX < 0 || newX >= this.cols || 
                        newY >= this.rows ||
                        (newY >= 0 && board[newY][newX] !== 0)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    holdPiece() {
        // Hold piece functionality
        if (!this.heldPiece) {
            this.heldPiece = this.currentPiece;
            this.spawnPiece();
        } else {
            const temp = this.currentPiece;
            this.currentPiece = this.heldPiece;
            this.currentPiece.x = Math.floor((this.cols - this.currentPiece.shape[0].length) / 2);
            this.currentPiece.y = 0;
            this.heldPiece = temp;
        }
    }
    
    receiveGarbageLines(count) {
        // Add garbage lines from opponent attack
        for (let i = 0; i < count; i++) {
            this.board.shift();
            const garbageLine = Array(this.cols).fill('garbage');
            const hole = Math.floor(Math.random() * this.cols);
            garbageLine[hole] = 0;
            this.board.push(garbageLine);
        }
    }
    
    clearBottomLine() {
        this.board.pop();
        this.board.unshift(Array(this.cols).fill(0));
    }
    
    sendGarbageLines(target, lines) {
        if (this.gameMode !== 'single' && target) {
            this.network.sendAttack(target, { lines });
        }
    }
    
    togglePause() {
        this.paused = !this.paused;
        this.sound.play('pause');
        
        if (this.paused) {
            this.showNotification('PAUSED');
        } else {
            this.showNotification('RESUMED');
        }
    }
    
    endGame() {
        this.gameOver = true;
        clearInterval(this.dropTimer);
        
        this.sound.play('gameOver');
        this.sound.stopMusic();
        
        // Show game over screen
        const gameOverOverlay = document.querySelector('.game-over-overlay');
        if (gameOverOverlay) {
            gameOverOverlay.style.display = 'flex';
            document.getElementById('finalScore').textContent = this.score;
        }
        
        // Send game over in multiplayer
        if (this.gameMode !== 'single') {
            this.network.send({
                type: 'GAME_OVER',
                playerId: this.network.playerId,
                score: this.score
            });
        }
    }
    
    restartGame() {
        // Hide game over overlay
        const gameOverOverlay = document.querySelector('.game-over-overlay');
        if (gameOverOverlay) {
            gameOverOverlay.style.display = 'none';
        }
        
        this.startGame();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] !== 0) {
                    if (this.board[row][col] === 'clearing') {
                        // Flash effect for clearing lines
                        this.ctx.fillStyle = '#fff';
                    } else if (this.board[row][col] === 'garbage') {
                        this.ctx.fillStyle = '#555';
                    } else {
                        const pieceType = this.board[row][col];
                        this.ctx.fillStyle = this.tetrominos[pieceType]?.color || '#888';
                    }
                    
                    this.drawBlock(col, row, this.ctx.fillStyle);
                }
            }
        }
        
        // Draw ghost piece
        this.drawGhostPiece();
        
        // Draw current piece
        if (this.currentPiece) {
            for (let row = 0; row < this.currentPiece.shape.length; row++) {
                for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                    if (this.currentPiece.shape[row][col]) {
                        const x = this.currentPiece.x + col;
                        const y = this.currentPiece.y + row;
                        
                        if (y >= 0) {
                            this.drawBlock(x, y, this.currentPiece.color);
                        }
                    }
                }
            }
        }
        
        // Draw grid lines
        this.drawGrid();
    }
    
    drawBlock(x, y, color) {
        const padding = 1;
        
        // Main block with 3D effect
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize + padding,
            y * this.blockSize + padding,
            this.blockSize - padding * 2,
            this.blockSize - padding * 2
        );
        
        // Top highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(
            x * this.blockSize + padding,
            y * this.blockSize + padding,
            this.blockSize - padding * 2,
            3
        );
        
        // Bottom shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(
            x * this.blockSize + padding,
            (y + 1) * this.blockSize - padding - 3,
            this.blockSize - padding * 2,
            3
        );
    }
    
    drawGhostPiece() {
        if (!this.currentPiece) return;
        
        // Calculate ghost position
        let ghostPiece = { ...this.currentPiece };
        while (this.isValidPosition({ ...ghostPiece, y: ghostPiece.y + 1 })) {
            ghostPiece.y++;
        }
        
        // Draw ghost
        this.ctx.globalAlpha = 0.3;
        for (let row = 0; row < ghostPiece.shape.length; row++) {
            for (let col = 0; col < ghostPiece.shape[row].length; col++) {
                if (ghostPiece.shape[row][col]) {
                    const x = ghostPiece.x + col;
                    const y = ghostPiece.y + row;
                    
                    if (y >= 0) {
                        this.ctx.strokeStyle = ghostPiece.color;
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(
                            x * this.blockSize + 2,
                            y * this.blockSize + 2,
                            this.blockSize - 4,
                            this.blockSize - 4
                        );
                    }
                }
            }
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let row = 0; row <= this.rows; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * this.blockSize);
            this.ctx.lineTo(this.canvas.width, row * this.blockSize);
            this.ctx.stroke();
        }
        
        for (let col = 0; col <= this.cols; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * this.blockSize, 0);
            this.ctx.lineTo(col * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }
    }
    
    drawNextPiece() {
        // Clear next piece canvas
        this.nextCtx.fillStyle = '#000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (!this.nextPiece) return;
        
        // Center the piece
        const offsetX = (4 - this.nextPiece.shape[0].length) / 2;
        const offsetY = (4 - this.nextPiece.shape.length) / 2;
        
        // Draw next piece
        for (let row = 0; row < this.nextPiece.shape.length; row++) {
            for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                if (this.nextPiece.shape[row][col]) {
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(
                        (offsetX + col) * this.blockSize,
                        (offsetY + row) * this.blockSize,
                        this.blockSize - 2,
                        this.blockSize - 2
                    );
                }
            }
        }
    }
    
    updateDisplay() {
        document.querySelector('.score-value').textContent = this.score;
        document.querySelector('.level-value').textContent = this.level;
        document.querySelector('.lines-value').textContent = this.lines;
    }
    
    updateOpponentDisplay(data) {
        // Update opponent board display
        const opponentCanvas = document.querySelector(`#opponent-${data.playerId}`);
        if (opponentCanvas) {
            const ctx = opponentCanvas.getContext('2d');
            const scale = 0.5;
            
            // Draw opponent board
            ctx.clearRect(0, 0, opponentCanvas.width, opponentCanvas.height);
            
            for (let row = 0; row < data.state.board.length; row++) {
                for (let col = 0; col < data.state.board[row].length; col++) {
                    if (data.state.board[row][col] !== 0) {
                        ctx.fillStyle = '#888';
                        ctx.fillRect(
                            col * this.blockSize * scale,
                            row * this.blockSize * scale,
                            this.blockSize * scale - 1,
                            this.blockSize * scale - 1
                        );
                    }
                }
            }
        }
    }
    
    applyItemEffect(data) {
        // Apply item effects from opponents
        console.log('Item effect received:', data);
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }
    
    // Animation loop
    animate() {
        if (!this.gameOver) {
            this.draw();
            requestAnimationFrame(() => this.animate());
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new IntegratedTetrisGame();
    game.animate();
    
    // Make game instance globally available for debugging
    window.tetrisGame = game;
});

// Add notification styles
const notificationStyles = `
<style>
.game-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: #4ecdc4;
    padding: 1rem 2rem;
    border-radius: 10px;
    border: 2px solid #4ecdc4;
    font-size: 1.5rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: notificationPulse 0.5s ease-out;
    z-index: 1000;
}

.game-notification.fade-out {
    animation: notificationFadeOut 0.5s ease-out forwards;
}

@keyframes notificationPulse {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.1);
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}

@keyframes notificationFadeOut {
    to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
    }
}

.game-mode-selector {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    padding: 2rem;
    border-radius: 15px;
    border: 2px solid #4ecdc4;
    z-index: 999;
    text-align: center;
}

.game-mode-selector.hidden {
    display: none;
}

.game-mode-selector h2 {
    color: #4ecdc4;
    margin-bottom: 2rem;
    font-size: 2rem;
}

.mode-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.mode-btn {
    padding: 1rem 2rem;
    background: rgba(78, 205, 196, 0.2);
    border: 2px solid #4ecdc4;
    color: #4ecdc4;
    border-radius: 10px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.mode-btn:hover {
    background: #4ecdc4;
    color: #000;
    transform: scale(1.05);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);

export default IntegratedTetrisGame;