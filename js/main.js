import { Game } from './core/game.js';
import { MenuManager } from './ui/menuManager.js';
import { NetworkManager } from './network/networkManager.js';
import { SoundManager } from './audio/soundManager.js';

class TetrisApp {
    constructor() {
        this.game = null;
        this.menuManager = new MenuManager();
        this.networkManager = new NetworkManager();
        this.soundManager = new SoundManager();
        
        this.currentMode = null;
        this.isGameActive = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showMainMenu();
        
        // Initialize network status
        this.updateNetworkStatus(false, 'Offline');
        
        console.log('Tetris Battle initialized');
    }
    
    setupEventListeners() {
        // Menu button handlers
        document.getElementById('singlePlayerBtn').addEventListener('click', () => {
            this.startSinglePlayer();
        });
        
        document.getElementById('battleModeBtn').addEventListener('click', () => {
            this.showRoomMenu();
        });
        
        document.getElementById('multiModeBtn').addEventListener('click', () => {
            this.showRoomMenu();
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });
        
        // Game control handlers
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // Room menu event listeners
        this.setupRoomEventListeners();
        
        // Global key handlers
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
        
        // Network event handlers
        this.networkManager.on('connected', () => {
            this.updateNetworkStatus(true, 'Connected');
        });
        
        this.networkManager.on('disconnected', () => {
            this.updateNetworkStatus(false, 'Disconnected');
        });
        
        this.networkManager.on('roomCreated', (roomData) => {
            console.log('Room created:', roomData);
        });
        
        this.networkManager.on('gameStart', (gameData) => {
            console.log('Game start event received:', gameData);
            this.startNetworkGame(gameData);
        });
        
        this.networkManager.on('roomCreated', (data) => {
            this.handleRoomCreated(data);
        });
        
        this.networkManager.on('roomJoined', (data) => {
            this.handleRoomJoined(data);
        });
        
        this.networkManager.on('playerJoined', (data) => {
            this.handlePlayerJoined(data);
        });
        
        this.networkManager.on('matchFound', (data) => {
            this.handleRoomJoined(data);
        });
        
        this.networkManager.on('error', (error) => {
            console.error('Network error:', error);
            alert('Network error: ' + (error.message || error));
        });
    }
    
    setupRoomEventListeners() {
        // Back to main menu
        document.getElementById('backToMainBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // Create room
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.createRoom();
        });
        
        // Join room
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        // Quick match
        document.getElementById('quickMatchBtn').addEventListener('click', () => {
            this.quickMatch();
        });
        
        // Leave room
        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // Start game (host only)
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startMultiplayerGame();
        });
    }
    
    showMainMenu() {
        this.menuManager.showMenu('main');
        this.stopGame();
        this.currentMode = null;
        this.isGameActive = false;
        
        // Hide game panels
        this.hideGamePanels();
    }
    
    startSinglePlayer() {
        console.log('Starting single player mode');
        this.currentMode = 'single';
        this.menuManager.hideMenu('main');
        this.showGameContainer();
        
        // Hide multiplayer elements
        this.hideMultiplayerElements();
        
        this.game = new Game({
            canvas: document.getElementById('gameCanvas'),
            nextCanvas: document.getElementById('nextCanvas'),
            holdCanvas: document.getElementById('holdCanvas'),
            mode: 'single',
            soundManager: this.soundManager
        });
        
        this.game.on('scoreUpdate', (data) => {
            this.updateUI(data);
        });
        
        this.game.on('gameOver', (data) => {
            this.handleGameOver(data);
        });
        
        this.game.start();
        this.isGameActive = true;
    }
    
    async startBattleMode() {
        console.log('Starting 1v1 battle mode');
        this.currentMode = 'battle';
        
        try {
            await this.networkManager.connect();
            const room = await this.networkManager.createRoom('1v1 Battle', 2);
            
            this.menuManager.hideMenu('main');
            this.showGameContainer();
            
            // Show battle elements
            this.showBattleElements();
            
            console.log('Waiting for opponent...');
            this.updateNetworkStatus(true, 'Waiting for opponent...');
            
        } catch (error) {
            console.error('Failed to start battle mode:', error);
            alert('Failed to connect to server. Starting offline mode.');
            this.startSinglePlayer();
        }
    }
    
    async startMultiMode() {
        console.log('Starting 4-player battle mode');
        this.currentMode = 'multi';
        
        try {
            await this.networkManager.connect();
            const room = await this.networkManager.createRoom('4P Battle', 4);
            
            this.menuManager.hideMenu('main');
            this.showGameContainer();
            
            // Show multi elements
            this.showMultiElements();
            
            console.log('Waiting for players...');
            this.updateNetworkStatus(true, 'Waiting for players...');
            
        } catch (error) {
            console.error('Failed to start multi mode:', error);
            alert('Failed to connect to server. Starting offline mode.');
            this.startSinglePlayer();
        }
    }
    
    startNetworkGame(gameData) {
        console.log('Starting network game:', gameData);
        
        // Hide menus and show game
        this.menuManager.hideAllMenus();
        this.menuManager.showGameContainer();
        
        // Set current mode based on player count
        const playerCount = gameData?.players?.length || 2;
        this.currentMode = playerCount > 2 ? 'multi' : 'battle';
        
        // Show appropriate multiplayer elements
        if (this.currentMode === 'multi') {
            this.showMultiElements();
        } else {
            this.showBattleElements();
        }
        
        this.game = new Game({
            canvas: document.getElementById('gameCanvas'),
            nextCanvas: document.getElementById('nextCanvas'),
            holdCanvas: document.getElementById('holdCanvas'),
            mode: this.currentMode,
            networkManager: this.networkManager,
            gameData: gameData,
            soundManager: this.soundManager
        });
        
        this.game.on('scoreUpdate', (data) => {
            this.updateUI(data);
        });
        
        this.game.on('gameOver', (data) => {
            this.handleGameOver(data);
        });
        
        this.game.on('attack', (attackData) => {
            this.networkManager.sendAttack(attackData);
        });
        
        this.game.start();
        this.isGameActive = true;
        
        this.updateNetworkStatus(true, 'Game in progress');
    }
    
    showGameContainer() {
        document.getElementById('gameContainer').classList.add('active');
    }
    
    hideGameContainer() {
        document.getElementById('gameContainer').classList.remove('active');
    }
    
    hideGamePanels() {
        this.hideGameContainer();
    }
    
    hideMultiplayerElements() {
        document.getElementById('battleItems').style.display = 'none';
        document.getElementById('opponentBoards').style.display = 'none';
    }
    
    showBattleElements() {
        document.getElementById('battleItems').style.display = 'block';
        document.getElementById('opponentBoards').style.display = 'block';
        
        // Create opponent board for 1v1
        const opponentsGrid = document.getElementById('opponentsGrid');
        opponentsGrid.innerHTML = `
            <div class="opponent-board">
                <h4>Opponent</h4>
                <canvas id="opponentCanvas1" width="120" height="240"></canvas>
            </div>
        `;
    }
    
    showMultiElements() {
        document.getElementById('battleItems').style.display = 'block';
        document.getElementById('opponentBoards').style.display = 'block';
        
        // Create opponent boards for 4-player
        const opponentsGrid = document.getElementById('opponentsGrid');
        opponentsGrid.innerHTML = `
            <div class="opponent-board">
                <h4>Player 2</h4>
                <canvas id="opponentCanvas1" width="100" height="200"></canvas>
            </div>
            <div class="opponent-board">
                <h4>Player 3</h4>
                <canvas id="opponentCanvas2" width="100" height="200"></canvas>
            </div>
            <div class="opponent-board">
                <h4>Player 4</h4>
                <canvas id="opponentCanvas3" width="100" height="200"></canvas>
            </div>
        `;
    }
    
    updateUI(data) {
        document.getElementById('score').textContent = data.score || 0;
        document.getElementById('level').textContent = data.level || 1;
        document.getElementById('lines').textContent = data.lines || 0;
        
        // Update battle items if in multiplayer mode
        if (this.currentMode !== 'single' && data.items) {
            this.updateBattleItems(data.items);
        }
    }
    
    updateBattleItems(items) {
        Object.keys(items).forEach(itemType => {
            const itemSlot = document.querySelector(`[data-item="${itemType}"]`);
            if (itemSlot) {
                const countElement = itemSlot.querySelector('.item-count');
                if (countElement) {
                    countElement.textContent = items[itemType];
                }
            }
        });
    }
    
    handleGameOver(data) {
        console.log('Game over:', data);
        this.isGameActive = false;
        
        document.getElementById('finalScore').textContent = data.score || 0;
        document.getElementById('gameOverlay').style.display = 'flex';
        
        // Update network status if in network mode
        if (this.currentMode !== 'single') {
            this.updateNetworkStatus(true, 'Game finished');
        }
    }
    
    restartGame() {
        document.getElementById('gameOverlay').style.display = 'none';
        
        if (this.currentMode === 'single') {
            this.startSinglePlayer();
        } else {
            // For network games, return to menu for now
            this.showMainMenu();
        }
    }
    
    stopGame() {
        if (this.game) {
            this.game.stop();
            this.game = null;
        }
        
        // Hide overlays
        document.getElementById('gameOverlay').style.display = 'none';
        document.getElementById('pauseOverlay').style.display = 'none';
        
        this.isGameActive = false;
    }
    
    pauseGame() {
        if (this.game && this.isGameActive) {
            if (this.game.isPaused()) {
                this.game.resume();
                document.getElementById('pauseOverlay').style.display = 'none';
            } else {
                this.game.pause();
                document.getElementById('pauseOverlay').style.display = 'flex';
            }
        }
    }
    
    handleKeyPress(e) {
        // Prevent default for game keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        
        switch (e.code) {
            case 'KeyP':
                if (this.isGameActive) {
                    this.pauseGame();
                }
                break;
                
            case 'Escape':
                if (this.isGameActive) {
                    this.showMainMenu();
                }
                break;
                
            case 'KeyM':
                // Mute toggle (to be implemented)
                break;
                
            default:
                if (this.game && this.isGameActive) {
                    this.game.handleInput(e);
                }
                break;
        }
    }
    
    showSettings() {
        console.log('Settings not implemented yet');
        alert('Settings panel coming soon!');
    }
    
    updateNetworkStatus(isOnline, message) {
        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');
        
        if (isOnline) {
            indicator.classList.add('online');
            indicator.style.color = '#4ecdc4';
        } else {
            indicator.classList.remove('online');
            indicator.style.color = '#ff4444';
        }
        
        text.textContent = message;
        this.menuManager.updateConnectionStatus(isOnline ? 'connected' : 'offline', message);
    }
    
    // Room management methods
    showRoomMenu() {
        this.menuManager.showMenu('rooms');
        this.connectIfNeeded();
    }
    
    async connectIfNeeded() {
        if (!this.networkManager.connected) {
            try {
                this.updateNetworkStatus(false, 'Connecting...');
                await this.networkManager.connect();
                this.updateNetworkStatus(true, 'Connected');
            } catch (error) {
                console.error('Connection failed:', error);
                this.updateNetworkStatus(false, 'Connection failed');
            }
        }
    }
    
    async createRoom() {
        const roomName = document.getElementById('roomNameInput').value || 'New Room';
        const maxPlayers = parseInt(document.getElementById('maxPlayersSelect').value) || 4;
        
        this.soundManager.play('move'); // Button click sound
        
        try {
            await this.connectIfNeeded();
            const roomData = await this.networkManager.createRoom(roomName, maxPlayers);
            console.log('Room created successfully:', roomData);
            this.soundManager.play('levelUp'); // Success sound
        } catch (error) {
            console.error('Failed to create room:', error);
            this.soundManager.play('warning'); // Error sound
            alert('Failed to create room: ' + (error.message || error));
        }
    }
    
    async joinRoom() {
        const roomId = document.getElementById('roomIdInput').value;
        const playerName = document.getElementById('playerNameInput').value || 'Anonymous';
        
        if (!roomId) {
            alert('Please enter a Room ID');
            return;
        }
        
        try {
            await this.connectIfNeeded();
            const joinData = await this.networkManager.joinRoom(roomId, playerName);
            console.log('Joined room successfully:', joinData);
        } catch (error) {
            console.error('Failed to join room:', error);
            alert('Failed to join room: ' + (error.message || error));
        }
    }
    
    async quickMatch() {
        try {
            await this.connectIfNeeded();
            this.updateNetworkStatus(true, 'Finding match...');
            const matchData = await this.networkManager.quickMatch();
            console.log('Quick match found:', matchData);
        } catch (error) {
            console.error('Quick match failed:', error);
            alert('Quick match failed: ' + (error.message || error));
            this.updateNetworkStatus(true, 'Connected');
        }
    }
    
    leaveRoom() {
        // Disconnect from current room
        if (this.networkManager.connected) {
            this.networkManager.disconnect();
        }
        this.showMainMenu();
    }
    
    startMultiplayerGame() {
        console.log('Requesting game start...');
        if (this.networkManager.connected && this.networkManager.room) {
            const message = {
                type: 'START_GAME',
                roomId: this.networkManager.room.id || this.networkManager.room.roomId
            };
            
            if (this.networkManager.send(message)) {
                this.updateNetworkStatus(true, 'Starting game...');
            } else {
                alert('Failed to start game - not connected');
            }
        } else {
            alert('Not connected to a room');
        }
    }
    
    // Room event handlers
    handleRoomCreated(data) {
        console.log('Room created event:', data);
        this.menuManager.showMenu('waiting');
        this.menuManager.updateRoomInfo({
            name: 'New Room',
            roomId: data.roomId,
            playerCount: 1,
            maxPlayers: data.maxPlayers || 4
        });
        this.menuManager.updatePlayersList(data.players || []);
        this.menuManager.showStartGameButton(true); // Host can start game
        this.updateNetworkStatus(true, 'In room (Host)');
    }
    
    handleRoomJoined(data) {
        console.log('Room joined event:', data);
        this.menuManager.showMenu('waiting');
        
        // Check if current player is host
        const currentPlayerId = this.networkManager.playerId || this.networkManager.player;
        const players = data.players || [];
        
        console.log('Current player ID:', currentPlayerId);
        console.log('Players in room:', players);
        
        const isHost = players.some(player => {
            console.log(`Checking player ${player.id}, isHost: ${player.isHost}`);
            return player.id === currentPlayerId && player.isHost;
        });
        
        console.log('Is current player host?', isHost);
        
        this.menuManager.updateRoomInfo({
            name: 'Joined Room',
            roomId: data.roomId,
            playerCount: players.length,
            maxPlayers: data.maxPlayers || 4
        });
        this.menuManager.updatePlayersList(players);
        this.menuManager.showStartGameButton(isHost); // Host can start game
        this.updateNetworkStatus(true, isHost ? 'In room (Host)' : 'In room');
    }
    
    handlePlayerJoined(data) {
        console.log('Player joined event:', data);
        // Update player list in waiting room
        if (this.menuManager.getCurrentMenu() === 'waiting') {
            // Get updated room info from network manager if available
            const roomData = this.networkManager.room;
            if (roomData) {
                this.menuManager.updateRoomInfo(roomData);
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tetrisApp = new TetrisApp();
});

// Export for potential external access
export default TetrisApp;