// ===== 오디오 관리자 - 동적 음악 및 효과음 시스템 =====

export class AudioManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        
        // Web Audio API 컨텍스트
        this.audioContext = null;
        this.masterGainNode = null;
        this.musicGainNode = null;
        this.effectGainNode = null;
        
        // 음악 관련
        this.backgroundMusic = null;
        this.currentMusicTrack = null;
        this.musicTracks = new Map();
        this.musicTempo = 1.0;
        this.baseTempos = new Map();
        
        // 효과음 관련
        this.soundEffects = new Map();
        this.soundBuffers = new Map();
        
        // 동적 음악 시스템
        this.musicLayers = new Map();
        this.currentIntensity = 0; // 0-1 사이 값
        this.targetIntensity = 0;
        this.intensityTransitionSpeed = 0.02;
        
        // 상태 관리
        this.isInitialized = false;
        this.isMuted = false;
        this.musicVolume = 0.7;
        this.effectVolume = 0.8;
        
        // 업데이트 루프
        this.updateInterval = null;
    }
    
    async init() {
        try {
            // Web Audio API 컨텍스트 생성
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 사용자 상호작용 후에 컨텍스트 재개
            if (this.audioContext.state === 'suspended') {
                document.addEventListener('click', () => {
                    this.audioContext.resume();
                }, { once: true });
            }
            
            // 오디오 노드 설정
            this.setupAudioNodes();
            
            // 설정에서 볼륨 로드
            this.loadVolumeSettings();
            
            // 오디오 파일들 로드 (시뮬레이션)
            await this.loadAudioAssets();
            
            // 동적 음악 업데이트 루프 시작
            this.startUpdateLoop();
            
            this.isInitialized = true;
            console.log('🎵 AudioManager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize AudioManager:', error);
            this.isInitialized = false;
        }
    }
    
    setupAudioNodes() {
        // 마스터 볼륨 노드
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);
        
        // 음악 볼륨 노드
        this.musicGainNode = this.audioContext.createGain();
        this.musicGainNode.connect(this.masterGainNode);
        
        // 효과음 볼륨 노드
        this.effectGainNode = this.audioContext.createGain();
        this.effectGainNode.connect(this.masterGainNode);
    }
    
    loadVolumeSettings() {
        const settings = this.settingsManager.settings;
        this.setMusicVolume(settings.musicVolume / 100);
        this.setEffectVolume(settings.effectVolume / 100);
    }
    
    async loadAudioAssets() {
        // 실제 구현에서는 오디오 파일들을 로드해야 합니다
        // 현재는 시뮬레이션을 위한 더미 데이터
        
        // 배경음악 트랙들
        this.musicTracks.set('menu', {
            url: 'assets/music/menu_theme.ogg',
            loop: true,
            intensity: 0.3
        });
        
        this.musicTracks.set('game', {
            url: 'assets/music/game_theme.ogg',
            loop: true,
            intensity: 0.5
        });
        
        this.musicTracks.set('intense', {
            url: 'assets/music/intense_theme.ogg',
            loop: true,
            intensity: 0.9
        });
        
        // 효과음들
        const soundEffects = {
            move: { url: 'assets/sounds/move.ogg', volume: 0.3 },
            rotate: { url: 'assets/sounds/rotate.ogg', volume: 0.4 },
            lock: { url: 'assets/sounds/lock.ogg', volume: 0.5 },
            lineClear: { url: 'assets/sounds/line_clear.ogg', volume: 0.7 },
            tetris: { url: 'assets/sounds/tetris.ogg', volume: 0.9 },
            levelUp: { url: 'assets/sounds/level_up.ogg', volume: 0.8 },
            gameOver: { url: 'assets/sounds/game_over.ogg', volume: 0.6 },
            hardDrop: { url: 'assets/sounds/hard_drop.ogg', volume: 0.6 },
            hold: { url: 'assets/sounds/hold.ogg', volume: 0.4 },
            warning: { url: 'assets/sounds/warning.ogg', volume: 0.7 },
            item: { url: 'assets/sounds/item.ogg', volume: 0.5 }
        };
        
        // 실제 구현에서는 여기서 파일들을 fetch하고 디코딩해야 합니다
        for (const [name, config] of Object.entries(soundEffects)) {
            this.soundEffects.set(name, {
                ...config,
                buffer: await this.createDummyBuffer(0.1 + Math.random() * 0.3) // 더미 버퍼
            });
        }
        
        console.log('🎵 Audio assets loaded (simulated)');
    }
    
    // 더미 오디오 버퍼 생성 (실제로는 파일에서 로드)
    async createDummyBuffer(duration = 0.2) {
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        // 간단한 사인파 생성 (실제로는 파일 데이터를 사용)
        for (let i = 0; i < channelData.length; i++) {
            channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
        }
        
        return buffer;
    }
    
    // ===== 배경음악 제어 =====
    async playBackgroundMusic(trackName) {
        if (!this.isInitialized) return;
        
        try {
            // 현재 음악 정지
            this.stopBackgroundMusic();
            
            // 새 음악 시작 (실제로는 오디오 파일을 로드하고 재생)
            this.currentMusicTrack = trackName;
            
            // 동적 음악 시스템 초기화
            this.initializeDynamicMusic(trackName);
            
            console.log(`🎵 Playing background music: ${trackName}`);
            
        } catch (error) {
            console.error('❌ Failed to play background music:', error);
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            try {
                this.backgroundMusic.stop();
            } catch (e) {
                // 이미 정지된 경우
            }
            this.backgroundMusic = null;
        }
        
        this.currentMusicTrack = null;
    }
    
    pauseBackgroundMusic() {
        if (this.backgroundMusic && this.audioContext) {
            this.musicGainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.3);
        }
    }
    
    resumeBackgroundMusic() {
        if (this.backgroundMusic && this.audioContext) {
            this.musicGainNode.gain.setTargetAtTime(this.musicVolume, this.audioContext.currentTime, 0.3);
        }
    }
    
    // ===== 동적 음악 시스템 =====
    initializeDynamicMusic(trackName) {
        // 기본 템포 저장
        this.baseTempos.set(trackName, 1.0);
        this.musicTempo = 1.0;
        
        // 강도 초기화
        this.currentIntensity = this.musicTracks.get(trackName)?.intensity || 0.5;
        this.targetIntensity = this.currentIntensity;
    }
    
    adjustMusicTempo(level) {
        if (!this.isInitialized || !this.currentMusicTrack) return;
        
        // 레벨에 따른 템포 조정 (1레벨: 1.0, 10레벨: 1.5)
        const targetTempo = Math.min(1.0 + (level - 1) * 0.05, 1.5);
        this.musicTempo = targetTempo;
        
        console.log(`🎵 Music tempo adjusted to ${targetTempo.toFixed(2)}x`);
    }
    
    setMusicIntensity(intensity) {
        this.targetIntensity = Math.max(0, Math.min(1, intensity));
    }
    
    onGameStateChange(gameState) {
        // 게임 상황에 따른 음악 강도 조정
        let intensity = 0.5;
        
        if (gameState.isNearGameOver) {
            intensity = 0.9; // 위험 상황
        } else if (gameState.level >= 5) {
            intensity = 0.7; // 높은 레벨
        } else if (gameState.recentLineClear) {
            intensity = 0.8; // 최근에 줄을 제거함
        }
        
        this.setMusicIntensity(intensity);
    }
    
    updateDynamicMusic() {
        if (!this.isInitialized || !this.currentMusicTrack) return;
        
        // 강도 전환
        if (Math.abs(this.currentIntensity - this.targetIntensity) > 0.01) {
            const diff = this.targetIntensity - this.currentIntensity;
            this.currentIntensity += diff * this.intensityTransitionSpeed;
            
            // 음악 파라미터 조정 (실제로는 필터나 볼륨 조정)
            this.applyIntensityEffects(this.currentIntensity);
        }
    }
    
    applyIntensityEffects(intensity) {
        // 강도에 따른 음악 효과 적용
        // 실제로는 필터, 리버브, 볼륨 등을 조정
        
        if (this.musicGainNode) {
            // 강도가 높을수록 음악이 더 두드러짐
            const gainValue = this.musicVolume * (0.7 + intensity * 0.3);
            this.musicGainNode.gain.setTargetAtTime(gainValue, this.audioContext.currentTime, 0.1);
        }
    }
    
    // ===== 효과음 재생 =====
    playSound(soundName, variation = 1) {
        if (!this.isInitialized) return;
        
        const soundData = this.soundEffects.get(soundName);
        if (!soundData) {
            console.warn(`⚠️ Sound not found: ${soundName}`);
            return;
        }
        
        try {
            // 버퍼 소스 생성
            const source = this.audioContext.createBufferSource();
            source.buffer = soundData.buffer;
            
            // 볼륨 조정
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = soundData.volume * this.effectVolume;
            
            // 라인 클리어 효과음은 라인 수에 따라 다르게
            if (soundName === 'lineClear') {
                if (variation === 4) {
                    // 테트리스 (4줄)
                    const tetrisSound = this.soundEffects.get('tetris');
                    if (tetrisSound) {
                        source.buffer = tetrisSound.buffer;
                        gainNode.gain.value = tetrisSound.volume * this.effectVolume;
                    }
                } else if (variation >= 2) {
                    // 멀티 라인의 경우 피치 조정
                    source.playbackRate.value = 1.0 + (variation - 1) * 0.1;
                }
            }
            
            // 연결 및 재생
            source.connect(gainNode);
            gainNode.connect(this.effectGainNode);
            source.start(0);
            
            // 자동 정리
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            
        } catch (error) {
            console.error(`❌ Failed to play sound ${soundName}:`, error);
        }
    }
    
    // ===== 특별 효과음들 =====
    playSequentialSounds(sounds, delay = 100) {
        sounds.forEach((sound, index) => {
            setTimeout(() => {
                this.playSound(sound);
            }, index * delay);
        });
    }
    
    playRandomVariation(soundName, variations = 3) {
        const variation = Math.floor(Math.random() * variations) + 1;
        this.playSound(soundName, variation);
    }
    
    // ===== 화면 전환 시 음악 변경 =====
    onScreenChange(screenName) {
        switch (screenName) {
            case 'mainMenu':
            case 'lobby':
            case 'settings':
                this.playBackgroundMusic('menu');
                break;
            case 'game':
                this.playBackgroundMusic('game');
                break;
        }
    }
    
    // ===== 볼륨 제어 =====
    setMasterVolume(volume) {
        if (this.masterGainNode) {
            this.masterGainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGainNode) {
            this.musicGainNode.gain.setTargetAtTime(this.musicVolume, this.audioContext.currentTime, 0.1);
        }
    }
    
    setEffectVolume(volume) {
        this.effectVolume = Math.max(0, Math.min(1, volume));
        if (this.effectGainNode) {
            this.effectGainNode.gain.setTargetAtTime(this.effectVolume, this.audioContext.currentTime, 0.1);
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.setMasterVolume(this.isMuted ? 0 : 1);
        return this.isMuted;
    }
    
    // ===== 업데이트 루프 =====
    startUpdateLoop() {
        this.updateInterval = setInterval(() => {
            this.updateDynamicMusic();
        }, 1000 / 30); // 30fps
    }
    
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // ===== 게임 이벤트 대응 =====
    onLineCleared(lines) {
        // 줄 수에 따른 다른 효과음
        this.playSound('lineClear', lines);
        
        // 연속적인 줄 제거 시 추가 효과
        if (lines >= 3) {
            setTimeout(() => {
                this.playSound('item'); // 보너스 효과음
            }, 200);
        }
    }
    
    onGameOver() {
        // 게임 오버 시 음악 페이드아웃 후 효과음
        this.pauseBackgroundMusic();
        
        setTimeout(() => {
            this.playSound('gameOver');
        }, 500);
    }
    
    onLevelUp() {
        this.playSound('levelUp');
        
        // 레벨업 시 음악 임시 속도 증가
        if (this.backgroundMusic) {
            // 실제로는 음악 재생 속도를 잠깐 높임
            setTimeout(() => {
                console.log('🎵 Temporary music speed boost');
            }, 100);
        }
    }
    
    // ===== 웹 오디오 컨텍스트 관리 =====
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            return this.audioContext.resume();
        }
        return Promise.resolve();
    }
    
    suspend() {
        if (this.audioContext && this.audioContext.state === 'running') {
            return this.audioContext.suspend();
        }
        return Promise.resolve();
    }
    
    // ===== 정리 =====
    cleanup() {
        this.stopUpdateLoop();
        this.stopBackgroundMusic();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.soundEffects.clear();
        this.musicTracks.clear();
        this.musicLayers.clear();
        
        console.log('🧹 AudioManager cleanup completed');
    }
}