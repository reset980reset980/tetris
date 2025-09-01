// ===== Enhanced Sound System =====
// Dynamic audio generation with Web Audio API

export class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;
        this.enabled = true;
        
        this.sounds = {};
        this.music = null;
        this.currentTheme = null;
        
        this.init();
    }
    
    init() {
        // Initialize Web Audio API
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            // Create separate gain nodes for SFX and music
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;
            
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.musicVolume;
            
            // Generate all sound effects
            this.generateSounds();
            
            // Start with main theme
            this.playMusic('main');
            
        } catch (error) {
            console.error('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }
    
    generateSounds() {
        // Generate various sound effects
        this.sounds = {
            // Movement sounds
            move: () => this.createTone(200, 0.05, 'square'),
            rotate: () => this.createTone(300, 0.05, 'triangle'),
            drop: () => this.createTone(150, 0.1, 'sawtooth'),
            hardDrop: () => this.createImpact(),
            
            // Line clear sounds
            lineClear: () => this.createLineClear(1),
            doubleClear: () => this.createLineClear(2),
            tripleClear: () => this.createLineClear(3),
            tetris: () => this.createTetrisSound(),
            
            // Special moves
            tSpin: () => this.createSpecialSound(600, 0.3),
            backToBack: () => this.createSpecialSound(800, 0.4),
            combo: (count) => this.createComboSound(count),
            perfectClear: () => this.createPerfectClearSound(),
            
            // Game events
            levelUp: () => this.createLevelUpSound(),
            gameOver: () => this.createGameOverSound(),
            pause: () => this.createTone(400, 0.2, 'sine'),
            
            // Item sounds
            itemGet: () => this.createItemSound(500, 0.2),
            itemUse: () => this.createItemSound(700, 0.15),
            shield: () => this.createShieldSound(),
            attack: () => this.createAttackSound(),
            bomb: () => this.createExplosionSound(),
            freeze: () => this.createFreezeSound(),
            
            // Multiplayer sounds
            playerJoin: () => this.createTone(440, 0.3, 'sine'),
            playerLeave: () => this.createTone(220, 0.3, 'sine'),
            attacked: () => this.createDamageSound(),
            victory: () => this.createVictorySound(),
            
            // UI sounds
            menuSelect: () => this.createTone(350, 0.05, 'square'),
            menuConfirm: () => this.createTone(440, 0.1, 'square'),
            menuCancel: () => this.createTone(200, 0.1, 'sawtooth')
        };
    }
    
    // Create a basic tone
    createTone(frequency, duration, waveform = 'sine') {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = waveform;
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // Create impact sound for hard drop
    createImpact() {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.value = 60;
        oscillator.type = 'sawtooth';
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    // Create line clear sound with increasing pitch
    createLineClear(lines) {
        if (!this.enabled) return;
        
        const baseFreq = 400;
        const freqStep = 100;
        
        for (let i = 0; i < lines; i++) {
            setTimeout(() => {
                this.createTone(baseFreq + (i * freqStep), 0.2, 'square');
            }, i * 50);
        }
    }
    
    // Create tetris (4-line clear) sound
    createTetrisSound() {
        if (!this.enabled) return;
        
        const notes = [523, 659, 784, 1047]; // C, E, G, C (octave higher)
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.sfxGain);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'triangle';
                
                gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.5);
            }, index * 100);
        });
    }
    
    // Create special move sound
    createSpecialSound(frequency, duration) {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        lfo.frequency.value = 10;
        lfoGain.gain.value = 50;
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        lfo.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        lfo.stop(this.audioContext.currentTime + duration);
    }
    
    // Create combo sound with increasing pitch
    createComboSound(comboCount) {
        if (!this.enabled) return;
        
        const baseFreq = 400 + (comboCount * 50);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 2, this.audioContext.currentTime + 0.2);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    // Create perfect clear sound
    createPerfectClearSound() {
        if (!this.enabled) return;
        
        const notes = [261, 329, 392, 523, 659, 784, 1047];
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.createTone(freq, 0.3, 'sine');
            }, index * 80);
        });
    }
    
    // Create level up sound
    createLevelUpSound() {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.4);
    }
    
    // Create game over sound
    createGameOverSound() {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 1);
    }
    
    // Create item sound
    createItemSound(frequency, duration) {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Create pulsing effect
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // Create shield sound
    createShieldSound() {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.value = 200;
        oscillator.type = 'triangle';
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    // Create attack sound
    createAttackSound() {
        if (!this.enabled) return;
        
        const noise = this.createNoise(0.1);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    // Create explosion sound
    createExplosionSound() {
        if (!this.enabled) return;
        
        // White noise for explosion
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        noise.buffer = buffer;
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        noise.start();
    }
    
    // Create freeze sound
    createFreezeSound() {
        if (!this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        
        filter.type = 'highpass';
        filter.frequency.value = 800;
        filter.Q.value = 10;
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 1);
    }
    
    // Create damage sound
    createDamageSound() {
        if (!this.enabled) return;
        
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createTone(100 - (i * 20), 0.1, 'square');
            }, i * 50);
        }
    }
    
    // Create victory sound
    createVictorySound() {
        if (!this.enabled) return;
        
        const notes = [523, 659, 784, 1047, 784, 1047];
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.createTone(freq, 0.3, 'triangle');
            }, index * 150);
        });
    }
    
    // Create noise helper
    createNoise(duration) {
        if (!this.enabled) return;
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noise.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        noise.start();
    }
    
    // Play background music
    playMusic(theme = 'main') {
        if (!this.enabled) return;
        
        // Stop current music
        this.stopMusic();
        
        this.currentTheme = theme;
        
        // Create music based on theme
        switch(theme) {
            case 'main':
                this.playMainTheme();
                break;
            case 'battle':
                this.playBattleTheme();
                break;
            case 'victory':
                this.playVictoryTheme();
                break;
        }
    }
    
    // Main theme music
    playMainTheme() {
        if (!this.enabled) return;
        
        const tempo = 120; // BPM
        const beatLength = 60 / tempo;
        
        // Simple tetris-inspired melody
        const melody = [
            { note: 659, duration: 1 },    // E
            { note: 494, duration: 0.5 },  // B
            { note: 523, duration: 0.5 },  // C
            { note: 587, duration: 1 },    // D
            { note: 523, duration: 0.5 },  // C
            { note: 494, duration: 0.5 },  // B
            { note: 440, duration: 1 },    // A
            { note: 440, duration: 0.5 },  // A
            { note: 523, duration: 0.5 },  // C
            { note: 659, duration: 1 },    // E
            { note: 587, duration: 0.5 },  // D
            { note: 523, duration: 0.5 },  // C
            { note: 494, duration: 1.5 },  // B
            { note: 523, duration: 0.5 },  // C
            { note: 587, duration: 1 },    // D
            { note: 659, duration: 1 },    // E
            { note: 523, duration: 1 },    // C
            { note: 440, duration: 1 },    // A
            { note: 440, duration: 2 }     // A
        ];
        
        let currentTime = 0;
        
        const playMelodyLoop = () => {
            melody.forEach(({ note, duration }) => {
                setTimeout(() => {
                    if (this.currentTheme === 'main') {
                        const oscillator = this.audioContext.createOscillator();
                        const gainNode = this.audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(this.musicGain);
                        
                        oscillator.frequency.value = note;
                        oscillator.type = 'triangle';
                        
                        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, 
                            this.audioContext.currentTime + (duration * beatLength * 0.9));
                        
                        oscillator.start();
                        oscillator.stop(this.audioContext.currentTime + (duration * beatLength));
                    }
                }, currentTime * 1000);
                
                currentTime += duration * beatLength;
            });
            
            // Loop the melody
            this.musicLoop = setTimeout(() => {
                currentTime = 0;
                if (this.currentTheme === 'main') {
                    playMelodyLoop();
                }
            }, currentTime * 1000);
        };
        
        playMelodyLoop();
    }
    
    // Battle theme music
    playBattleTheme() {
        if (!this.enabled) return;
        
        // More intense, faster theme for battle mode
        const tempo = 140;
        const beatLength = 60 / tempo;
        
        const playBeat = () => {
            if (this.currentTheme !== 'battle') return;
            
            // Bass drum
            this.createTone(60, 0.1, 'sine');
            
            // Hi-hat
            setTimeout(() => {
                this.createNoise(0.05);
            }, beatLength * 500);
            
            this.musicLoop = setTimeout(playBeat, beatLength * 1000);
        };
        
        playBeat();
    }
    
    // Victory theme music
    playVictoryTheme() {
        if (!this.enabled) return;
        
        const fanfare = [
            { note: 523, duration: 0.2 },  // C
            { note: 523, duration: 0.2 },  // C
            { note: 523, duration: 0.2 },  // C
            { note: 523, duration: 0.4 },  // C
            { note: 415, duration: 0.4 },  // G#
            { note: 466, duration: 0.4 },  // A#
            { note: 523, duration: 0.6 },  // C
            { note: 466, duration: 0.2 },  // A#
            { note: 523, duration: 1 }     // C
        ];
        
        let currentTime = 0;
        
        fanfare.forEach(({ note, duration }) => {
            setTimeout(() => {
                this.createTone(note, duration, 'square');
            }, currentTime * 1000);
            currentTime += duration;
        });
    }
    
    // Stop music
    stopMusic() {
        if (this.musicLoop) {
            clearTimeout(this.musicLoop);
            this.musicLoop = null;
        }
        this.currentTheme = null;
    }
    
    // Play sound effect
    play(soundName, ...args) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            this.sounds[soundName](...args);
        } catch (error) {
            console.error(`Error playing sound ${soundName}:`, error);
        }
    }
    
    // Volume controls
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }
    
    // Toggle sound
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopMusic();
        } else {
            this.playMusic(this.currentTheme || 'main');
        }
    }
    
    // Mute/unmute
    mute() {
        this.setMasterVolume(0);
    }
    
    unmute() {
        this.setMasterVolume(0.7);
    }
}

export default SoundSystem;