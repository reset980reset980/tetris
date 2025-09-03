export class NetworkManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.playerId = null;
        this.listeners = new Map();
        
        this.serverUrl = `ws://${window.location.hostname}:9003`;
        
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event callback:', error);
                }
            });
        }
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('Connecting to server:', this.serverUrl);
                
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.onopen = () => {
                    console.log('Connected to server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event);
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from server');
                    this.isConnected = false;
                    this.emit('disconnected');
                    
                    // Auto-reconnect if not manually disconnected
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        setTimeout(() => {
                            this.attemptReconnect();
                        }, this.reconnectDelay);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                // Connection timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    disconnect() {
        if (this.ws) {
            this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.currentRoom = null;
        this.playerId = null;
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }
    }
    
    send(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        console.warn('Cannot send message: not connected');
        return false;
    }
    
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);
            
            switch (message.type) {
                case 'ROOM_CREATED':
                    this.currentRoom = message.data;
                    this.playerId = message.data.playerId;
                    this.emit('roomCreated', message.data);
                    break;
                    
                case 'ROOM_JOINED':
                    this.currentRoom = message.data;
                    this.playerId = message.data.playerId;
                    this.emit('roomJoined', message.data);
                    break;
                    
                case 'PLAYER_JOINED':
                    this.emit('playerJoined', message.data);
                    break;
                    
                case 'PLAYER_LEFT':
                    this.emit('playerLeft', message.data);
                    break;
                    
                case 'MATCH_FOUND':
                    this.currentRoom = message.data;
                    this.playerId = message.data.playerId;
                    this.emit('matchFound', message.data);
                    break;
                    
                case 'GAME_START':
                case 'GAME_STARTED':
                    this.emit('gameStart', message.data);
                    break;
                    
                case 'GAME_STATE':
                    this.emit('gameState', message.data);
                    break;
                    
                case 'ATTACK':
                    this.emit('attack', message.data);
                    break;
                    
                case 'ITEM_USED':
                    this.emit('itemUsed', message.data);
                    break;
                    
                case 'GAME_OVER':
                    this.emit('gameOver', message.data);
                    break;
                    
                case 'ERROR':
                    console.error('Server error:', message.data);
                    this.emit('error', message.data);
                    break;
                    
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
    
    async createRoom(roomName, maxPlayers) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            
            const message = {
                type: 'CREATE_ROOM',
                maxPlayers: maxPlayers,
                settings: {
                    name: roomName
                }
            };
            
            // Set up one-time listener for room creation response
            const onRoomCreated = (roomData) => {
                this.off('roomCreated', onRoomCreated);
                this.off('error', onError);
                resolve(roomData);
            };
            
            const onError = (error) => {
                this.off('roomCreated', onRoomCreated);
                this.off('error', onError);
                reject(new Error(error.message || 'Failed to create room'));
            };
            
            this.on('roomCreated', onRoomCreated);
            this.on('error', onError);
            
            if (!this.send(message)) {
                this.off('roomCreated', onRoomCreated);
                this.off('error', onError);
                reject(new Error('Failed to send create room message'));
            }
            
            // Timeout after 10 seconds
            setTimeout(() => {
                this.off('roomCreated', onRoomCreated);
                this.off('error', onError);
                reject(new Error('Room creation timeout'));
            }, 10000);
        });
    }
    
    async joinRoom(roomId, playerName = null) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            
            const message = {
                type: 'JOIN_ROOM',
                roomId: roomId,
                playerName: playerName || `Player_${Date.now() % 10000}`
            };
            
            // Set up one-time listener for room join response
            const onRoomJoined = (joinData) => {
                this.off('roomJoined', onRoomJoined);
                this.off('error', onError);
                resolve(joinData);
            };
            
            const onError = (error) => {
                this.off('roomJoined', onRoomJoined);
                this.off('error', onError);
                reject(new Error(error.message || 'Failed to join room'));
            };
            
            this.on('roomJoined', onRoomJoined);
            this.on('error', onError);
            
            if (!this.send(message)) {
                this.off('roomJoined', onRoomJoined);
                this.off('error', onError);
                reject(new Error('Failed to send join room message'));
            }
            
            // Timeout after 10 seconds
            setTimeout(() => {
                this.off('roomJoined', onRoomJoined);
                this.off('error', onError);
                reject(new Error('Room join timeout'));
            }, 10000);
        });
    }
    
    sendGameState(gameState) {
        return this.send({
            type: 'GAME_STATE',
            data: {
                playerId: this.playerId,
                roomId: this.currentRoom?.id,
                gameState: gameState
            }
        });
    }
    
    sendAttack(attackData) {
        return this.send({
            type: 'ATTACK',
            data: {
                playerId: this.playerId,
                roomId: this.currentRoom?.id,
                attack: attackData
            }
        });
    }
    
    sendItemUsed(itemData) {
        return this.send({
            type: 'ITEM_USED',
            data: {
                playerId: this.playerId,
                roomId: this.currentRoom?.id,
                item: itemData
            }
        });
    }
    
    sendGameOver(gameOverData) {
        return this.send({
            type: 'GAME_OVER',
            data: {
                playerId: this.playerId,
                roomId: this.currentRoom?.id,
                gameOver: gameOverData
            }
        });
    }
    
    // Quick match functionality
    async quickMatch() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            
            const message = {
                type: 'QUICK_MATCH',
                playerName: `Player_${Date.now() % 10000}`
            };
            
            // Set up listeners for quick match response  
            const onMatchFound = (matchData) => {
                this.off('matchFound', onMatchFound);
                this.off('gameStart', onGameStart);
                this.off('error', onError);
                resolve(matchData);
            };
            
            const onGameStart = (gameData) => {
                this.off('matchFound', onMatchFound);
                this.off('gameStart', onGameStart);
                this.off('error', onError);
                resolve(gameData);
            };
            
            const onError = (error) => {
                this.off('gameStart', onGameStart);
                this.off('error', onError);
                reject(new Error(error.message || 'Quick match failed'));
            };
            
            this.on('matchFound', onMatchFound);
            this.on('gameStart', onGameStart);
            this.on('error', onError);
            
            if (!this.send(message)) {
                this.off('gameStart', onGameStart);
                this.off('error', onError);
                reject(new Error('Failed to send quick match message'));
            }
            
            // Timeout after 30 seconds
            setTimeout(() => {
                this.off('gameStart', onGameStart);
                this.off('error', onError);
                reject(new Error('Quick match timeout'));
            }, 30000);
        });
    }
    
    // Getters
    get connected() {
        return this.isConnected;
    }
    
    get room() {
        return this.currentRoom;
    }
    
    get player() {
        return this.playerId;
    }
}