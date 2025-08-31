// ===== 네트워크 관리자 - 멀티플레이어 통신 =====

export class NetworkManager {
    constructor(app) {
        this.app = app;
        
        // WebSocket 연결
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // 1초
        
        // 플레이어 정보
        this.playerId = null;
        this.playerName = this.generatePlayerName();
        this.currentRoom = null;
        
        // 게임 상태 동기화
        this.gameStateQueue = [];
        this.lastSentState = null;
        this.syncInterval = null;
        this.syncRate = 60; // 60fps
        
        // 매칭 시스템
        this.isMatching = false;
        this.matchingStartTime = null;
        
        // 방 목록
        this.roomList = [];
        
        // 시뮬레이션 모드 (실제 서버가 없을 때)
        this.simulationMode = true;
        this.simulatedPlayers = [];
        this.simulationTimer = null;
        
        this.init();
    }
    
    init() {
        console.log('🌐 NetworkManager initialized');
        
        if (this.simulationMode) {
            this.initSimulation();
        } else {
            this.connect();
        }
    }
    
    // ===== WebSocket 연결 관리 =====
    connect(serverUrl = 'wss://tetris-server.example.com') {
        if (this.simulationMode) {
            this.simulateConnection();
            return;
        }
        
        try {
            this.socket = new WebSocket(serverUrl);
            this.setupSocketEvents();
            
            console.log('🔌 Connecting to server...');
            
        } catch (error) {
            console.error('❌ Failed to create WebSocket connection:', error);
            this.fallbackToSimulation();
        }
    }
    
    setupSocketEvents() {
        this.socket.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('✅ Connected to game server');
            
            // 플레이어 인증
            this.authenticate();
        };
        
        this.socket.onclose = (event) => {
            this.isConnected = false;
            console.log('🔌 Connection closed:', event.code, event.reason);
            
            if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnection();
            }
        };
        
        this.socket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
        
        this.socket.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }
    
    attemptReconnection() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'User disconnected');
            this.socket = null;
        }
        
        this.stopGameStateSync();
        this.isConnected = false;
    }
    
    // ===== 인증 및 플레이어 관리 =====
    authenticate() {
        const authData = {
            type: 'auth',
            playerId: this.playerId,
            playerName: this.playerName,
            version: '1.0.0'
        };
        
        this.sendMessage(authData);
    }
    
    generatePlayerName() {
        const adjectives = ['빠른', '강한', '영리한', '날쌘', '멋진', '신속한'];
        const nouns = ['테트리스', '플레이어', '마스터', '챔피언', '전사', '닌자'];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 999) + 1;
        
        return `${adj}${noun}${num}`;
    }
    
    // ===== 메시지 처리 =====
    sendMessage(data) {
        if (this.simulationMode) {
            this.handleSimulatedMessage(data);
            return;
        }
        
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ Cannot send message: not connected');
        }
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'auth_success':
                    this.handleAuthSuccess(message);
                    break;
                    
                case 'room_list':
                    this.handleRoomList(message);
                    break;
                    
                case 'room_created':
                    this.handleRoomCreated(message);
                    break;
                    
                case 'room_joined':
                    this.handleRoomJoined(message);
                    break;
                    
                case 'player_joined':
                    this.handlePlayerJoined(message);
                    break;
                    
                case 'player_left':
                    this.handlePlayerLeft(message);
                    break;
                    
                case 'game_start':
                    this.handleGameStart(message);
                    break;
                    
                case 'game_state':
                    this.handleGameState(message);
                    break;
                    
                case 'match_found':
                    this.handleMatchFound(message);
                    break;
                    
                case 'attack':
                    this.handleAttack(message);
                    break;
                    
                case 'error':
                    this.handleError(message);
                    break;
                    
                default:
                    console.warn('⚠️ Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('❌ Error handling message:', error);
        }
    }
    
    // ===== 메시지 핸들러들 =====
    handleAuthSuccess(message) {
        this.playerId = message.playerId;
        console.log(`✅ Authenticated as player ${this.playerId}`);
    }
    
    handleRoomList(message) {
        this.roomList = message.rooms;
        this.app.uiManager.updateRoomList(this.roomList);
    }
    
    handleRoomCreated(message) {
        this.currentRoom = message.room;
        this.app.showScreen('game');
        this.app.showSuccessMessage(`방 "${message.room.name}"이 생성되었습니다.`);
    }
    
    handleRoomJoined(message) {
        this.currentRoom = message.room;
        this.app.showScreen('game');
        this.app.showSuccessMessage(`방 "${message.room.name}"에 참여했습니다.`);
    }
    
    handlePlayerJoined(message) {
        this.app.onPlayerJoined(message.playerId, message.playerInfo);
    }
    
    handlePlayerLeft(message) {
        this.app.onPlayerLeft(message.playerId, message.playerInfo);
    }
    
    handleGameStart(message) {
        console.log('🎮 Game starting...');
        // 게임 시작 시 동기화 시작
        this.startGameStateSync();
    }
    
    handleGameState(message) {
        // 다른 플레이어들의 게임 상태 업데이트
        this.app.onGameStateUpdate(message);
    }
    
    handleMatchFound(message) {
        this.isMatching = false;
        this.currentRoom = message.room;
        this.app.uiManager.resetQuickMatch();
        this.app.showScreen('game');
        this.app.showSuccessMessage('매칭이 완료되었습니다!');
    }
    
    handleAttack(message) {
        // 상대방으로부터 공격 받음
        console.log(`⚔️ Attacked by player ${message.from}:`, message.attack);
        // TODO: 실제 공격 효과 적용
    }
    
    handleError(message) {
        console.error('❌ Server error:', message.message);
        this.app.showErrorMessage(message.message);
    }
    
    // ===== 방 관리 =====
    createRoom(roomConfig) {
        const message = {
            type: 'create_room',
            name: roomConfig.name,
            maxPlayers: roomConfig.maxPlayers,
            gameMode: roomConfig.gameMode,
            isPrivate: roomConfig.isPrivate || false
        };
        
        this.sendMessage(message);
    }
    
    joinRoom(roomId) {
        const message = {
            type: 'join_room',
            roomId: roomId
        };
        
        this.sendMessage(message);
    }
    
    leaveRoom() {
        if (this.currentRoom) {
            const message = {
                type: 'leave_room',
                roomId: this.currentRoom.id
            };
            
            this.sendMessage(message);
            this.currentRoom = null;
        }
    }
    
    requestRoomList() {
        this.sendMessage({ type: 'get_rooms' });
    }
    
    // ===== 빠른 매칭 =====
    startQuickMatch(gameMode) {
        this.isMatching = true;
        this.matchingStartTime = Date.now();
        
        const message = {
            type: 'quick_match',
            gameMode: gameMode,
            skill: this.calculateSkillLevel()
        };
        
        this.sendMessage(message);
    }
    
    cancelQuickMatch() {
        if (this.isMatching) {
            this.sendMessage({ type: 'cancel_match' });
            this.isMatching = false;
            this.matchingStartTime = null;
        }
    }
    
    calculateSkillLevel() {
        const stats = this.app.settings?.statistics || {};
        const avgScore = stats.totalScore / (stats.gamesPlayed || 1);
        const avgLevel = stats.averageLevel || 1;
        
        // 간단한 스킬 레벨 계산
        return Math.min(Math.floor(avgScore / 10000) + avgLevel, 10);
    }
    
    // ===== 게임 상태 동기화 =====
    startGameStateSync() {
        this.stopGameStateSync();
        
        this.syncInterval = setInterval(() => {
            this.syncGameState();
        }, 1000 / this.syncRate);
    }
    
    stopGameStateSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    syncGameState() {
        if (!this.app.gameManager || !this.app.gameManager.isPlaying) return;
        
        const gameState = this.getGameState();
        
        // 상태가 변경된 경우만 전송
        if (!this.lastSentState || this.hasStateChanged(gameState, this.lastSentState)) {
            this.sendGameState(gameState);
            this.lastSentState = { ...gameState };
        }
    }
    
    getGameState() {
        const gm = this.app.gameManager;
        
        return {
            board: gm.board.serialize(),
            score: gm.score,
            level: gm.level,
            lines: gm.totalLines,
            currentPiece: gm.currentTetromino ? {
                type: gm.currentTetromino.type,
                x: gm.currentTetromino.x,
                y: gm.currentTetromino.y,
                rotation: gm.currentTetromino.rotation
            } : null,
            nextPiece: gm.nextTetromino ? gm.nextTetromino.type : null,
            isGameOver: gm.isGameOver,
            timestamp: Date.now()
        };
    }
    
    hasStateChanged(current, previous) {
        // 간단한 상태 변경 감지 (실제로는 더 정교한 비교 필요)
        return (
            current.score !== previous.score ||
            current.level !== previous.level ||
            current.lines !== previous.lines ||
            current.isGameOver !== previous.isGameOver ||
            JSON.stringify(current.currentPiece) !== JSON.stringify(previous.currentPiece)
        );
    }
    
    sendGameState(gameState) {
        const message = {
            type: 'game_state',
            roomId: this.currentRoom?.id,
            playerId: this.playerId,
            gameState: gameState
        };
        
        this.sendMessage(message);
    }
    
    // ===== 공격/방어 시스템 =====
    sendAttack(attackType, targetPlayerId = null) {
        const message = {
            type: 'attack',
            roomId: this.currentRoom?.id,
            from: this.playerId,
            to: targetPlayerId, // null이면 모든 상대방에게
            attack: {
                type: attackType,
                intensity: this.calculateAttackIntensity(),
                timestamp: Date.now()
            }
        };
        
        this.sendMessage(message);
    }
    
    calculateAttackIntensity() {
        // 현재 게임 상황에 따른 공격 강도 계산
        const gm = this.app.gameManager;
        if (!gm) return 1;
        
        const baseIntensity = Math.floor(gm.level / 2) + 1;
        const scoreMultiplier = Math.min(gm.score / 50000, 2);
        
        return Math.floor(baseIntensity * (1 + scoreMultiplier));
    }
    
    // ===== 시뮬레이션 모드 =====
    initSimulation() {
        console.log('🤖 Running in simulation mode (no server)');
        
        // 가상 플레이어들 생성
        this.simulatedPlayers = [
            { id: 'bot1', name: '빠른닌자123', skill: 3 },
            { id: 'bot2', name: '테트리스마스터', skill: 7 },
            { id: 'bot3', name: '강한전사999', skill: 5 }
        ];
        
        // 시뮬레이션 업데이트
        this.simulationTimer = setInterval(() => {
            this.updateSimulation();
        }, 2000);
    }
    
    simulateConnection() {
        setTimeout(() => {
            this.isConnected = true;
            this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            console.log('🤖 Simulated connection established');
            
            // 가상의 방 목록 생성
            this.generateSimulatedRooms();
        }, 500);
    }
    
    generateSimulatedRooms() {
        this.roomList = [
            {
                id: 'room1',
                name: '초보자 환영',
                currentPlayers: 2,
                maxPlayers: 4,
                gameMode: 'multiBattle',
                host: '빠른닌자123'
            },
            {
                id: 'room2',
                name: '고수만 와라',
                currentPlayers: 3,
                maxPlayers: 4,
                gameMode: 'multiBattle',
                host: '테트리스마스터'
            },
            {
                id: 'room3',
                name: '1vs1 대결',
                currentPlayers: 1,
                maxPlayers: 2,
                gameMode: 'oneVsOne',
                host: '강한전사999'
            }
        ];
    }
    
    updateSimulation() {
        // 방 목록 랜덤 업데이트
        if (Math.random() < 0.3) {
            this.generateSimulatedRooms();
            if (this.app.uiManager) {
                this.app.uiManager.updateRoomList(this.roomList);
            }
        }
    }
    
    handleSimulatedMessage(data) {
        // 시뮬레이션 메시지 처리
        setTimeout(() => {
            switch (data.type) {
                case 'create_room':
                    this.simulateRoomCreation(data);
                    break;
                    
                case 'join_room':
                    this.simulateRoomJoin(data);
                    break;
                    
                case 'get_rooms':
                    this.handleRoomList({ type: 'room_list', rooms: this.roomList });
                    break;
                    
                case 'quick_match':
                    this.simulateQuickMatch(data);
                    break;
            }
        }, 200 + Math.random() * 300); // 네트워크 지연 시뮬레이션
    }
    
    simulateRoomCreation(data) {
        const room = {
            id: 'room_' + Date.now(),
            name: data.name,
            currentPlayers: 1,
            maxPlayers: data.maxPlayers,
            gameMode: data.gameMode,
            host: this.playerName
        };
        
        this.handleRoomCreated({ type: 'room_created', room });
    }
    
    simulateRoomJoin(data) {
        const room = this.roomList.find(r => r.id === data.roomId);
        if (room && room.currentPlayers < room.maxPlayers) {
            room.currentPlayers++;
            this.handleRoomJoined({ type: 'room_joined', room });
            
            // 다른 플레이어 시뮬레이션
            setTimeout(() => {
                this.handlePlayerJoined({
                    type: 'player_joined',
                    playerId: 'sim_player',
                    playerInfo: { name: this.simulatedPlayers[0].name }
                });
            }, 1000);
        } else {
            this.handleError({ type: 'error', message: '방이 가득 찼거나 존재하지 않습니다.' });
        }
    }
    
    simulateQuickMatch(data) {
        // 1-3초 후 매칭 완료 시뮬레이션
        setTimeout(() => {
            const room = {
                id: 'quick_room_' + Date.now(),
                name: '빠른 매칭',
                currentPlayers: 2,
                maxPlayers: data.gameMode === 'oneVsOne' ? 2 : 4,
                gameMode: data.gameMode
            };
            
            this.handleMatchFound({ type: 'match_found', room });
        }, 1000 + Math.random() * 2000);
    }
    
    // ===== 대체 모드 설정 =====
    fallbackToSimulation() {
        console.log('🤖 Falling back to simulation mode');
        this.simulationMode = true;
        this.initSimulation();
    }
    
    // ===== 연결 상태 =====
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            playerId: this.playerId,
            playerName: this.playerName,
            currentRoom: this.currentRoom,
            isMatching: this.isMatching,
            simulationMode: this.simulationMode
        };
    }
    
    // ===== 정리 =====
    cleanup() {
        this.disconnect();
        this.stopGameStateSync();
        
        if (this.simulationTimer) {
            clearInterval(this.simulationTimer);
            this.simulationTimer = null;
        }
        
        this.roomList = [];
        this.gameStateQueue = [];
        
        console.log('🧹 NetworkManager cleanup completed');
    }
}