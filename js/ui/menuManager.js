export class MenuManager {
    constructor() {
        this.currentMenu = 'main';
    }
    
    showMenu(menuName) {
        // Hide all menus first
        this.hideAllMenus();
        
        // Show requested menu
        switch (menuName) {
            case 'main':
                this.showMainMenu();
                break;
            case 'rooms':
                this.showRoomMenu();
                break;
            case 'waiting':
                this.showWaitingRoom();
                break;
            case 'settings':
                this.showSettingsMenu();
                break;
            default:
                console.warn('Unknown menu:', menuName);
                this.showMainMenu();
        }
        
        this.currentMenu = menuName;
    }
    
    hideMenu(menuName) {
        switch (menuName) {
            case 'main':
                this.hideMainMenu();
                break;
            case 'rooms':
                this.hideRoomMenu();
                break;
            case 'waiting':
                this.hideWaitingRoom();
                break;
            case 'settings':
                this.hideSettingsMenu();
                break;
        }
    }
    
    hideAllMenus() {
        this.hideMainMenu();
        this.hideRoomMenu();
        this.hideWaitingRoom();
        this.hideSettingsMenu();
        this.hideGameContainer();
    }
    
    showMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.classList.add('active');
        }
    }
    
    hideMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.classList.remove('active');
        }
    }
    
    showSettingsMenu() {
        // Settings menu will be implemented later
        console.log('Settings menu not implemented yet');
    }
    
    hideSettingsMenu() {
        // Settings menu will be implemented later
    }
    
    showRoomMenu() {
        const roomMenu = document.getElementById('roomMenu');
        if (roomMenu) {
            roomMenu.classList.add('active');
        }
    }
    
    hideRoomMenu() {
        const roomMenu = document.getElementById('roomMenu');
        if (roomMenu) {
            roomMenu.classList.remove('active');
        }
    }
    
    showWaitingRoom() {
        const waitingRoom = document.getElementById('waitingRoom');
        if (waitingRoom) {
            waitingRoom.classList.add('active');
        }
    }
    
    hideWaitingRoom() {
        const waitingRoom = document.getElementById('waitingRoom');
        if (waitingRoom) {
            waitingRoom.classList.remove('active');
        }
    }
    
    showGameContainer() {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.classList.add('active');
        }
    }
    
    hideGameContainer() {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.classList.remove('active');
        }
    }
    
    updateRoomInfo(roomData) {
        // Update room information in waiting room
        const roomName = document.getElementById('currentRoomName');
        const roomId = document.getElementById('currentRoomId');
        const playerCount = document.getElementById('playerCount');
        const maxPlayers = document.getElementById('maxPlayers');
        
        if (roomName) roomName.textContent = roomData.name || roomData.roomId;
        if (roomId) roomId.textContent = roomData.roomId || roomData.id;
        if (playerCount) playerCount.textContent = roomData.playerCount || 0;
        if (maxPlayers) maxPlayers.textContent = roomData.maxPlayers || 4;
    }
    
    updatePlayersList(players) {
        const playersGrid = document.getElementById('playersGrid');
        if (!playersGrid) return;
        
        playersGrid.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            if (player.isHost) playerCard.classList.add('host');
            if (player.isReady) playerCard.classList.add('ready');
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-status">
                    ${player.isHost ? '👑 Host' : ''}
                    ${player.isReady ? '✅ Ready' : '⏳ Not Ready'}
                </div>
            `;
            
            playersGrid.appendChild(playerCard);
        });
    }
    
    updateConnectionStatus(status, message) {
        const connectionStatus = document.getElementById('connectionStatus');
        const networkStatus = document.getElementById('networkStatus');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (connectionStatus) {
            connectionStatus.textContent = message || status;
        }
        
        if (statusText) {
            statusText.textContent = message || status;
        }
        
        if (statusIndicator) {
            if (status === 'connected') {
                statusIndicator.classList.add('online');
                statusIndicator.textContent = '●';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.textContent = '●';
            }
        }
    }
    
    showStartGameButton(show = true) {
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.style.display = show ? 'block' : 'none';
        }
    }
    
    getCurrentMenu() {
        return this.currentMenu;
    }
}