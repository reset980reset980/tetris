// ===== Network Multiplayer System =====
// Supports up to 4 players with real-time synchronization

export class NetworkMultiplayer {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.players = new Map();
        this.isHost = false;
        this.gameState = 'waiting';
        this.serverUrl = `ws://${window.location.hostname}:9001`;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.messageHandlers = new Map();
        this.setupMessageHandlers();
    }
    
    // Connect to game server
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.onopen = () => {
                    console.log('Connected to multiplayer server');
                    this.reconnectAttempts = 0;
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from server');
                    this.handleDisconnection();
                };
            } catch (error) {
                console.error('Failed to connect:', error);
                // Fallback to simulation mode
                this.startSimulationMode();
                resolve();
            }
        });
    }
    
    // Create a new game room
    createRoom(maxPlayers = 4) {
        const roomData = {
            type: 'CREATE_ROOM',
            maxPlayers,
            settings: {
                itemsEnabled: true,
                startLevel: 1,
                gameMode: 'battle'
            }
        };
        
        this.send(roomData);
        return new Promise((resolve) => {
            this.once('ROOM_CREATED', (data) => {
                this.roomId = data.roomId;
                this.playerId = data.playerId;
                this.isHost = true;
                resolve(data);
            });
        });
    }
    
    // Join an existing room
    joinRoom(roomId) {
        const joinData = {
            type: 'JOIN_ROOM',
            roomId
        };
        
        this.send(joinData);
        return new Promise((resolve, reject) => {
            this.once('ROOM_JOINED', (data) => {
                this.roomId = data.roomId;
                this.playerId = data.playerId;
                this.updatePlayers(data.players);
                resolve(data);
            });
            
            this.once('ROOM_ERROR', (error) => {
                reject(error);
            });
        });
    }
    
    // Quick match - join any available room
    quickMatch() {
        this.send({ type: 'QUICK_MATCH' });
        return new Promise((resolve) => {
            this.once('MATCH_FOUND', (data) => {
                this.roomId = data.roomId;
                this.playerId = data.playerId;
                this.updatePlayers(data.players);
                resolve(data);
            });
        });
    }
    
    // Send game state update
    sendGameState(state) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const stateData = {
            type: 'GAME_STATE',
            playerId: this.playerId,
            roomId: this.roomId,
            state: {
                board: state.board,
                currentPiece: state.currentPiece,
                nextPiece: state.nextPiece,
                score: state.score,
                level: state.level,
                lines: state.lines,
                combo: state.combo,
                items: state.items
            }
        };
        
        this.send(stateData);
    }
    
    // Send attack to specific player or all opponents
    sendAttack(targetId, attackData) {
        const attack = {
            type: 'ATTACK',
            from: this.playerId,
            target: targetId || 'all',
            roomId: this.roomId,
            attack: attackData
        };
        
        this.send(attack);
    }
    
    // Send item usage
    sendItemUsage(itemType, targetId) {
        const itemData = {
            type: 'ITEM_USED',
            playerId: this.playerId,
            roomId: this.roomId,
            item: itemType,
            target: targetId
        };
        
        this.send(itemData);
    }
    
    // Start the game (host only)
    startGame() {
        if (!this.isHost) {
            console.error('Only host can start the game');
            return;
        }
        
        this.send({
            type: 'START_GAME',
            roomId: this.roomId
        });
    }
    
    // Setup message handlers
    setupMessageHandlers() {
        // Player updates
        this.on('PLAYER_JOINED', (data) => {
            this.players.set(data.playerId, data.playerInfo);
            this.onPlayerJoined?.(data);
        });
        
        this.on('PLAYER_LEFT', (data) => {
            this.players.delete(data.playerId);
            this.onPlayerLeft?.(data);
        });
        
        // Game state updates
        this.on('GAME_STATE_UPDATE', (data) => {
            if (data.playerId !== this.playerId) {
                this.players.set(data.playerId, data.state);
                this.onOpponentUpdate?.(data);
            }
        });
        
        // Attack received
        this.on('ATTACK_RECEIVED', (data) => {
            this.onAttackReceived?.(data);
        });
        
        // Item effects
        this.on('ITEM_EFFECT', (data) => {
            this.onItemEffect?.(data);
        });
        
        // Game events
        this.on('GAME_STARTED', (data) => {
            this.gameState = 'playing';
            this.onGameStarted?.(data);
        });
        
        this.on('GAME_OVER', (data) => {
            this.gameState = 'finished';
            this.onGameOver?.(data);
        });
        
        this.on('PLAYER_ELIMINATED', (data) => {
            this.onPlayerEliminated?.(data);
        });
    }
    
    // Handle incoming messages
    handleMessage(message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler.forEach(callback => callback(message.data));
        }
    }
    
    // Event system
    on(event, callback) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(callback);
    }
    
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
    
    off(event, callback) {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    // Send data to server
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else if (this.simulationMode) {
            this.handleSimulationMessage(data);
        }
    }
    
    // Update players list
    updatePlayers(playersData) {
        this.players.clear();
        playersData.forEach(player => {
            if (player.id !== this.playerId) {
                this.players.set(player.id, player);
            }
        });
    }
    
    // Handle disconnection
    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            
            setTimeout(() => {
                this.connect().then(() => {
                    if (this.roomId) {
                        this.rejoinRoom(this.roomId);
                    }
                });
            }, 2000 * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            this.onConnectionLost?.();
        }
    }
    
    // Rejoin room after disconnection
    rejoinRoom(roomId) {
        this.send({
            type: 'REJOIN_ROOM',
            roomId,
            playerId: this.playerId
        });
    }
    
    // Disconnect from server
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.roomId = null;
        this.playerId = null;
        this.players.clear();
    }
    
    // ===== Simulation Mode (for testing without server) =====
    
    startSimulationMode() {
        console.log('Starting simulation mode (no server connection)');
        this.simulationMode = true;
        this.simulatedPlayers = new Map();
        
        // Simulate server responses
        this.simulateServerResponses();
    }
    
    handleSimulationMessage(data) {
        // Simulate server processing
        setTimeout(() => {
            switch(data.type) {
                case 'CREATE_ROOM':
                    this.handleMessage({
                        type: 'ROOM_CREATED',
                        data: {
                            roomId: 'SIM-' + Math.random().toString(36).substr(2, 9),
                            playerId: 'P1',
                            maxPlayers: data.maxPlayers
                        }
                    });
                    // Add AI players
                    this.addSimulatedPlayers(data.maxPlayers - 1);
                    break;
                    
                case 'JOIN_ROOM':
                case 'QUICK_MATCH':
                    this.handleMessage({
                        type: 'ROOM_JOINED',
                        data: {
                            roomId: 'SIM-ROOM',
                            playerId: 'P' + (this.simulatedPlayers.size + 1),
                            players: Array.from(this.simulatedPlayers.values())
                        }
                    });
                    break;
                    
                case 'START_GAME':
                    this.handleMessage({
                        type: 'GAME_STARTED',
                        data: { seed: Date.now() }
                    });
                    this.startAIPlayers();
                    break;
                    
                case 'GAME_STATE':
                    // Broadcast to simulated players
                    this.updateAIPlayers(data.state);
                    break;
            }
        }, 100);
    }
    
    addSimulatedPlayers(count) {
        for (let i = 0; i < count; i++) {
            const playerId = 'AI' + (i + 1);
            const player = {
                id: playerId,
                name: `AI Player ${i + 1}`,
                isAI: true,
                board: Array(20).fill().map(() => Array(10).fill(0)),
                score: 0,
                level: 1,
                lines: 0
            };
            
            this.simulatedPlayers.set(playerId, player);
            
            setTimeout(() => {
                this.handleMessage({
                    type: 'PLAYER_JOINED',
                    data: { playerId, playerInfo: player }
                });
            }, 500 * (i + 1));
        }
    }
    
    startAIPlayers() {
        this.simulatedPlayers.forEach(player => {
            if (player.isAI) {
                this.simulateAIPlayer(player);
            }
        });
    }
    
    simulateAIPlayer(player) {
        const aiInterval = setInterval(() => {
            if (this.gameState !== 'playing') {
                clearInterval(aiInterval);
                return;
            }
            
            // Simulate AI gameplay
            player.score += Math.floor(Math.random() * 100);
            player.lines += Math.floor(Math.random() * 4);
            player.level = Math.floor(player.lines / 10) + 1;
            
            // Random board updates
            for (let i = 0; i < 3; i++) {
                const row = Math.floor(Math.random() * 20);
                const col = Math.floor(Math.random() * 10);
                player.board[row][col] = Math.random() > 0.3 ? Math.floor(Math.random() * 7) + 1 : 0;
            }
            
            // Send AI state update
            this.handleMessage({
                type: 'GAME_STATE_UPDATE',
                data: {
                    playerId: player.id,
                    state: {
                        board: player.board,
                        score: player.score,
                        level: player.level,
                        lines: player.lines
                    }
                }
            });
            
            // Random attacks
            if (Math.random() < 0.1) {
                this.handleMessage({
                    type: 'ATTACK_RECEIVED',
                    data: {
                        from: player.id,
                        lines: Math.floor(Math.random() * 3) + 1
                    }
                });
            }
        }, 2000);
    }
    
    updateAIPlayers(playerState) {
        // AI players react to player state
        this.simulatedPlayers.forEach(ai => {
            if (ai.isAI && Math.random() < 0.2) {
                // AI might attack back
                setTimeout(() => {
                    this.handleMessage({
                        type: 'ATTACK_RECEIVED',
                        data: {
                            from: ai.id,
                            lines: Math.floor(Math.random() * 2) + 1
                        }
                    });
                }, Math.random() * 2000);
            }
        });
    }
    
    simulateServerResponses() {
        // Simulate periodic server events
        setInterval(() => {
            if (this.gameState === 'playing' && Math.random() < 0.05) {
                // Random game events
                const events = ['POWER_UP_SPAWNED', 'SPEED_INCREASE', 'BONUS_ROUND'];
                const event = events[Math.floor(Math.random() * events.length)];
                
                this.handleMessage({
                    type: event,
                    data: { timestamp: Date.now() }
                });
            }
        }, 5000);
    }
}

export default NetworkMultiplayer;