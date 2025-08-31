// ===== 설정 관리자 - 게임 설정 저장/로드 =====

export class SettingsManager {
    constructor() {
        this.storageKey = 'tetris-settings';
        
        // 기본 설정값
        this.defaultSettings = {
            // 오디오 설정
            musicVolume: 70,
            effectVolume: 80,
            
            // 게임플레이 설정
            showGrid: true,
            showGhost: true,
            
            // 컨트롤 설정
            keyBindings: {
                moveLeft: 'ArrowLeft',
                moveRight: 'ArrowRight',
                softDrop: 'ArrowDown',
                hardDrop: 'Space',
                rotateClockwise: 'ArrowUp',
                rotateCounterClockwise: 'KeyZ',
                hold: 'KeyC',
                pause: 'Escape'
            },
            
            // DAS (Delayed Auto Shift) 설정
            dasDelay: 150,      // 초기 지연 (ms)
            dasRepeat: 50,      // 반복 간격 (ms)
            
            // 그래픽 설정
            enableAnimations: true,
            enableParticles: true,
            showFPS: false,
            
            // 접근성 설정
            highContrast: false,
            reducedMotion: false,
            
            // 언어 설정
            language: 'ko',
            
            // 통계 및 기록
            statistics: {
                gamesPlayed: 0,
                totalScore: 0,
                bestScore: 0,
                totalLines: 0,
                totalTime: 0,
                averageLevel: 1
            }
        };
        
        // 현재 설정
        this.settings = { ...this.defaultSettings };
        
        // 설정 변경 콜백들
        this.changeCallbacks = new Map();
    }
    
    // 설정 로드
    async loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            
            if (stored) {
                const parsedSettings = JSON.parse(stored);
                
                // 기본값과 병합 (새로운 설정 항목들을 위해)
                this.settings = this.mergeSettings(this.defaultSettings, parsedSettings);
                
                console.log('⚙️ Settings loaded from localStorage');
            } else {
                console.log('⚙️ Using default settings');
            }
            
            // 브라우저 환경 기반 설정 조정
            this.detectEnvironmentSettings();
            
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
            this.settings = { ...this.defaultSettings };
        }
        
        return this.settings;
    }
    
    // 설정 저장
    async saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            console.log('💾 Settings saved to localStorage');
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
        }
    }
    
    // 설정값 가져오기
    getSetting(key) {
        const keys = key.split('.');
        let value = this.settings;
        
        for (const k of keys) {
            value = value[k];
            if (value === undefined) {
                // 기본값에서 찾기
                value = this.defaultSettings;
                for (const k2 of keys) {
                    value = value[k2];
                    if (value === undefined) break;
                }
                break;
            }
        }
        
        return value;
    }
    
    // 설정값 업데이트
    updateSetting(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        
        let target = this.settings;
        for (const k of keys) {
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // 변경 콜백 실행
        this.notifyChange(key, value, oldValue);
        
        console.log(`⚙️ Setting updated: ${key} = ${value}`);
    }
    
    // 여러 설정 한번에 업데이트
    updateSettings(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this.updateSetting(key, value);
        }
    }
    
    // 설정 초기화
    resetSettings() {
        const oldStats = { ...this.settings.statistics };
        this.settings = { ...this.defaultSettings };
        
        // 통계는 유지
        this.settings.statistics = oldStats;
        
        console.log('🔄 Settings reset to defaults');
    }
    
    // 특정 카테고리만 초기화
    resetCategory(category) {
        if (this.defaultSettings[category]) {
            this.settings[category] = { ...this.defaultSettings[category] };
            console.log(`🔄 ${category} settings reset to defaults`);
        }
    }
    
    // 설정 병합 (재귀적으로 객체 병합)
    mergeSettings(defaults, stored) {
        const result = { ...defaults };
        
        for (const [key, value] of Object.entries(stored)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                if (typeof defaults[key] === 'object' && defaults[key] !== null) {
                    result[key] = this.mergeSettings(defaults[key], value);
                } else {
                    result[key] = value;
                }
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    // 환경 감지 및 자동 설정
    detectEnvironmentSettings() {
        // 모바일 감지
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.updateSetting('enableParticles', false);
            this.updateSetting('enableAnimations', true); // 모바일에서도 기본 애니메이션은 유지
        }
        
        // 접근성 설정 감지
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.updateSetting('reducedMotion', true);
            this.updateSetting('enableAnimations', false);
        }
        
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            this.updateSetting('highContrast', true);
        }
        
        // 언어 감지
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('en')) {
            this.updateSetting('language', 'en');
        } else if (browserLang.startsWith('ja')) {
            this.updateSetting('language', 'ja');
        }
        // 기본값은 'ko'
    }
    
    // 키 바인딩 관련
    updateKeyBinding(action, key) {
        this.updateSetting(`keyBindings.${action}`, key);
    }
    
    getKeyBinding(action) {
        return this.getSetting(`keyBindings.${action}`);
    }
    
    // 키 바인딩 충돌 검사
    hasKeyConflict(action, key) {
        const bindings = this.getSetting('keyBindings');
        
        for (const [existingAction, existingKey] of Object.entries(bindings)) {
            if (existingAction !== action && existingKey === key) {
                return existingAction;
            }
        }
        
        return null;
    }
    
    // 통계 업데이트
    updateStatistics(stats) {
        const currentStats = this.getSetting('statistics');
        
        for (const [key, value] of Object.entries(stats)) {
            if (typeof value === 'number') {
                if (key === 'bestScore') {
                    currentStats[key] = Math.max(currentStats[key] || 0, value);
                } else {
                    currentStats[key] = (currentStats[key] || 0) + value;
                }
            }
        }
        
        // 평균 레벨 계산
        if (stats.gamesPlayed && stats.totalLevel) {
            currentStats.averageLevel = stats.totalLevel / currentStats.gamesPlayed;
        }
        
        this.updateSetting('statistics', currentStats);
    }
    
    // 설정 변경 콜백 등록
    onChange(key, callback) {
        if (!this.changeCallbacks.has(key)) {
            this.changeCallbacks.set(key, []);
        }
        this.changeCallbacks.get(key).push(callback);
    }
    
    // 설정 변경 콜백 제거
    offChange(key, callback) {
        const callbacks = this.changeCallbacks.get(key);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    // 설정 변경 알림
    notifyChange(key, newValue, oldValue) {
        const callbacks = this.changeCallbacks.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error('❌ Error in settings change callback:', error);
                }
            });
        }
        
        // 전체 변경 콜백도 실행
        const globalCallbacks = this.changeCallbacks.get('*');
        if (globalCallbacks) {
            globalCallbacks.forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                } catch (error) {
                    console.error('❌ Error in global settings change callback:', error);
                }
            });
        }
    }
    
    // 설정 내보내기 (JSON 파일로)
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'tetris-settings.json';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📤 Settings exported');
    }
    
    // 설정 가져오기 (JSON 파일에서)
    importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    this.settings = this.mergeSettings(this.defaultSettings, importedSettings);
                    
                    console.log('📥 Settings imported');
                    resolve(this.settings);
                } catch (error) {
                    console.error('❌ Failed to import settings:', error);
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // 설정 유효성 검사
    validateSettings() {
        const issues = [];
        
        // 볼륨 범위 체크
        if (this.settings.musicVolume < 0 || this.settings.musicVolume > 100) {
            issues.push('Invalid music volume');
            this.settings.musicVolume = Math.max(0, Math.min(100, this.settings.musicVolume));
        }
        
        if (this.settings.effectVolume < 0 || this.settings.effectVolume > 100) {
            issues.push('Invalid effect volume');
            this.settings.effectVolume = Math.max(0, Math.min(100, this.settings.effectVolume));
        }
        
        // DAS 설정 체크
        if (this.settings.dasDelay < 0) {
            issues.push('Invalid DAS delay');
            this.settings.dasDelay = this.defaultSettings.dasDelay;
        }
        
        if (this.settings.dasRepeat < 10) {
            issues.push('Invalid DAS repeat');
            this.settings.dasRepeat = this.defaultSettings.dasRepeat;
        }
        
        // 키 바인딩 중복 체크
        const bindings = this.settings.keyBindings;
        const usedKeys = new Set();
        const duplicates = [];
        
        for (const [action, key] of Object.entries(bindings)) {
            if (usedKeys.has(key)) {
                duplicates.push(`${action}: ${key}`);
            }
            usedKeys.add(key);
        }
        
        if (duplicates.length > 0) {
            issues.push(`Duplicate key bindings: ${duplicates.join(', ')}`);
            // 중복 키를 기본값으로 복원
            this.settings.keyBindings = { ...this.defaultSettings.keyBindings };
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ Settings validation issues:', issues);
        }
        
        return issues;
    }
    
    // 디버그 정보
    getDebugInfo() {
        return {
            settingsSize: JSON.stringify(this.settings).length,
            totalCallbacks: Array.from(this.changeCallbacks.values()).reduce((sum, arr) => sum + arr.length, 0),
            hasLocalStorage: typeof Storage !== 'undefined',
            currentVersion: '1.0.0'
        };
    }
    
    // 정리
    cleanup() {
        this.changeCallbacks.clear();
        console.log('🧹 SettingsManager cleanup completed');
    }
}