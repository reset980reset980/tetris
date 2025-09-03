export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.7;
        
        this.initializeAudioContext();
        this.createSounds();
    }
    
    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }
    
    createSounds() {
        if (!this.enabled) return;
        
        // Create sound effects using Web Audio API
        this.createSound('move', {
            type: 'square',
            frequency: 220,
            duration: 0.1,
            volume: 0.3
        });
        
        this.createSound('rotate', {
            type: 'square',
            frequency: 330,
            duration: 0.1,
            volume: 0.3
        });
        
        this.createSound('drop', {
            type: 'square',
            frequency: 165,
            duration: 0.2,
            volume: 0.4
        });
        
        this.createSound('lineClear', {
            type: 'square',
            frequency: [264, 297, 330, 352],
            duration: 0.3,
            volume: 0.5
        });
        
        this.createSound('gameOver', {
            type: 'square',
            frequency: [165, 147, 131, 110],
            duration: 0.8,
            volume: 0.6
        });
        
        this.createSound('levelUp', {
            type: 'square',
            frequency: [264, 297, 330, 396, 440],
            duration: 0.5,
            volume: 0.5
        });
        
        this.createSound('attack', {
            type: 'sawtooth',
            frequency: 110,
            duration: 0.4,
            volume: 0.6
        });
        
        this.createSound('warning', {
            type: 'square',
            frequency: [440, 220, 440, 220],
            duration: 0.6,
            volume: 0.7
        });
    }
    
    createSound(name, config) {
        this.sounds.set(name, config);
    }
    
    async play(soundName) {
        if (!this.enabled || !this.sounds.has(soundName)) {
            return;
        }
        
        // Resume audio context if suspended (Chrome policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        const config = this.sounds.get(soundName);
        this.playTone(config);
    }
    
    playTone(config) {
        const { type, frequency, duration, volume } = config;
        
        if (Array.isArray(frequency)) {
            // Play sequence of notes
            frequency.forEach((freq, index) => {
                setTimeout(() => {
                    this.playSimpleTone(type, freq, duration / frequency.length, volume);
                }, index * (duration / frequency.length) * 1000);
            });
        } else {
            // Play single note
            this.playSimpleTone(type, frequency, duration, volume);
        }
    }
    
    playSimpleTone(type, frequency, duration, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume * this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    getVolume() {
        return this.volume;
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    // Background music using simple patterns
    playBackgroundMusic() {
        if (!this.enabled) return;
        
        // Simple Tetris-like melody pattern
        const melody = [
            { freq: 659, dur: 0.5 },
            { freq: 587, dur: 0.25 },
            { freq: 622, dur: 0.25 },
            { freq: 659, dur: 0.25 },
            { freq: 622, dur: 0.25 },
            { freq: 587, dur: 0.25 },
            { freq: 523, dur: 0.5 },
            { freq: 523, dur: 0.25 },
            { freq: 587, dur: 0.25 },
            { freq: 622, dur: 0.5 },
            { freq: 587, dur: 0.25 },
            { freq: 523, dur: 0.25 },
            { freq: 466, dur: 1.0 }
        ];
        
        let time = 0;
        melody.forEach(note => {
            setTimeout(() => {
                this.playSimpleTone('square', note.freq, note.dur, 0.2);
            }, time * 1000);
            time += note.dur;
        });
        
        // Loop the melody
        setTimeout(() => {
            if (this.enabled) {
                this.playBackgroundMusic();
            }
        }, time * 1000 + 2000);
    }
    
    stopBackgroundMusic() {
        // In a full implementation, we'd track and stop ongoing sounds
        // For now, we just disable sounds temporarily
        const wasEnabled = this.enabled;
        this.enabled = false;
        setTimeout(() => {
            this.enabled = wasEnabled;
        }, 100);
    }
}