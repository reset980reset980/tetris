// ===== UI 관리자 - 사용자 인터페이스 제어 =====

export class UIManager {
    constructor(app) {
        this.app = app;
        
        // 토스트 메시지 큐
        this.toastQueue = [];
        this.activeToast = null;
        
        // 모달 상태
        this.activeModal = null;
        
        // 로비 관련 상태
        this.currentLobbyTab = 'createRoom';
        this.roomList = [];
        
        this.init();
    }
    
    init() {
        this.setupLobbyTabs();
        this.setupSettingsPanel();
        this.setupVolumeSliders();
        this.setupItemSlots();
        
        console.log('🎨 UIManager initialized');
    }
    
    // ===== 로비 탭 시스템 =====
    setupLobbyTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.lobby-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.id.replace('Tab', '');
                this.switchLobbyTab(tabType);
            });
        });
        
        // 방 만들기 버튼
        document.getElementById('createRoomBtn')?.addEventListener('click', () => {
            this.createRoom();
        });
        
        // 빠른 매칭 버튼
        document.getElementById('startQuickMatchBtn')?.addEventListener('click', () => {
            this.startQuickMatch();
        });
        
        // 방 새로고침 버튼
        document.getElementById('refreshRoomsBtn')?.addEventListener('click', () => {
            this.refreshRoomList();
        });
    }
    
    switchLobbyTab(tabType) {
        this.currentLobbyTab = tabType;
        
        // 모든 탭 비활성화
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.lobby-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 선택된 탭 활성화
        document.getElementById(tabType + 'Tab')?.classList.add('active');
        document.getElementById(tabType + 'Panel')?.classList.add('active');
        
        // 탭별 초기화 작업
        switch (tabType) {
            case 'joinRoom':
                this.refreshRoomList();
                break;
            case 'quickMatch':
                this.resetQuickMatch();
                break;
        }
    }
    
    // ===== 설정 패널 =====
    setupSettingsPanel() {
        // 설정 저장 버튼
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // 설정 리셋 버튼
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
            this.resetSettings();
        });
        
        // 체크박스 설정
        const checkboxes = ['showGrid', 'showGhost'];
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.app.settingsManager.updateSetting(id, checkbox.checked);
                });
            }
        });
    }
    
    setupVolumeSliders() {
        const sliders = [
            { id: 'musicVolume', setting: 'musicVolume' },
            { id: 'effectVolume', setting: 'effectVolume' }
        ];
        
        sliders.forEach(({ id, setting }) => {
            const slider = document.getElementById(id);
            const valueDisplay = slider?.nextElementSibling;
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    const value = parseInt(slider.value);
                    valueDisplay.textContent = value + '%';
                    this.app.settingsManager.updateSetting(setting, value);
                    
                    // 실시간 볼륨 적용
                    if (this.app.audioManager) {
                        if (setting === 'musicVolume') {
                            this.app.audioManager.setMusicVolume(value / 100);
                        } else if (setting === 'effectVolume') {
                            this.app.audioManager.setEffectVolume(value / 100);
                        }
                    }
                });
            }
        });
    }
    
    // ===== 아이템 슬롯 시스템 =====
    setupItemSlots() {
        const itemSlots = document.querySelectorAll('.item-slot');
        
        itemSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const itemType = slot.dataset.item;
                this.useItem(itemType);
            });
        });
    }
    
    useItem(itemType) {
        const slot = document.querySelector(`[data-item="${itemType}"]`);
        const countElement = slot?.querySelector('.item-count');
        
        if (!countElement) return;
        
        const currentCount = parseInt(countElement.textContent) || 0;
        if (currentCount <= 0) return;
        
        // GameManager를 통해 아이템 사용
        if (this.app.gameManager && this.app.gameManager.useItem) {
            const success = this.app.gameManager.useItem(itemType);
            
            if (success) {
                // 아이템 수량 감소
                this.updateItemCount(itemType, currentCount - 1);
                this.showToast(`${this.getItemName(itemType)} 아이템을 사용했습니다!`, 'success');
                
                // 오디오 피드백
                if (this.app.audioManager) {
                    this.app.audioManager.playItemUseSound(itemType);
                }
            } else {
                this.showToast(`${this.getItemName(itemType)} 아이템을 사용할 수 없습니다.`, 'warning');
            }
        } else {
            this.showToast('게임이 진행 중이 아닙니다.', 'warning');
        }
    }
    
    updateItemCount(itemType, count) {
        const slot = document.querySelector(`[data-item="${itemType}"]`);
        const countElement = slot?.querySelector('.item-count');
        
        if (countElement) {
            countElement.textContent = count.toString();
            countElement.className = count > 0 ? 'item-count' : 'item-count zero';
            
            if (count > 0) {
                slot.classList.add('available');
            } else {
                slot.classList.remove('available');
            }
        }
    }
    
    getItemName(itemType) {
        const names = {
            shield: '방어막',
            attack: '공격',
            lineClear: '라인 클리어',
            slowDown: '속도 감소'
        };
        return names[itemType] || itemType;
    }
    
    // ===== 게임 정보 업데이트 =====
    updateGameInfo(score, level, lines, combo = 0, totalAttack = 0, backToBack = false, tSpinType = null, items = {}) {
        const scoreElement = document.getElementById('score');
        const levelElement = document.getElementById('level');
        const linesElement = document.getElementById('lines');
        const comboElement = document.getElementById('combo');
        const attackElement = document.getElementById('totalAttack');
        
        // 기본 게임 정보 업데이트
        if (scoreElement) {
            // 점수 애니메이션 효과
            const oldScore = parseInt(scoreElement.textContent.replace(/,/g, '')) || 0;
            if (score > oldScore) {
                this.animateNumber(scoreElement, oldScore, score);
            } else {
                scoreElement.textContent = score.toLocaleString();
            }
        }
        
        if (levelElement) {
            const oldLevel = parseInt(levelElement.textContent) || 1;
            if (level > oldLevel) {
                levelElement.textContent = level;
                levelElement.style.animation = 'levelUp 0.5s ease';
                setTimeout(() => {
                    levelElement.style.animation = '';
                }, 500);
            } else {
                levelElement.textContent = level;
            }
        }
        
        if (linesElement) {
            linesElement.textContent = lines;
        }
        
        // 콤보 업데이트
        if (comboElement) {
            const oldCombo = parseInt(comboElement.textContent) || 0;
            comboElement.textContent = combo;
            
            if (combo > oldCombo && combo > 0) {
                comboElement.classList.add('active');
                setTimeout(() => {
                    comboElement.classList.remove('active');
                }, 300);
            }
        }
        
        // 공격력 업데이트
        if (attackElement) {
            attackElement.textContent = totalAttack;
        }
        
        // 상태 인디케이터 업데이트
        this.updateStatusIndicators(backToBack, tSpinType);
        
        // 아이템 수량 업데이트
        this.updateItemCounts(items);
    }
    
    // ===== 상태 인디케이터 업데이트 =====
    updateStatusIndicators(backToBack = false, tSpinType = null) {
        const b2bIndicator = document.getElementById('backToBackIndicator');
        const tSpinIndicator = document.getElementById('tSpinIndicator');
        const shieldIndicator = document.getElementById('shieldIndicator');
        
        // Back-to-Back 인디케이터
        if (b2bIndicator) {
            if (backToBack) {
                b2bIndicator.classList.remove('hidden');
            } else {
                b2bIndicator.classList.add('hidden');
            }
        }
        
        // T-Spin 인디케이터
        if (tSpinIndicator) {
            if (tSpinType) {
                tSpinIndicator.classList.remove('hidden');
                const textElement = tSpinIndicator.querySelector('.tspin-text');
                if (textElement) {
                    textElement.textContent = tSpinType === 'full' ? 'T-SPIN!' : 'T-SPIN MINI!';
                }
                
                // 3초 후 자동 숨김
                setTimeout(() => {
                    tSpinIndicator.classList.add('hidden');
                }, 3000);
            } else {
                tSpinIndicator.classList.add('hidden');
            }
        }
    }
    
    // ===== 아이템 수량 업데이트 =====
    updateItemCounts(items = {}) {
        const itemTypes = ['shield', 'attack', 'lineClear', 'slowDown'];
        
        itemTypes.forEach(itemType => {
            const count = items[itemType] || 0;
            this.updateItemCount(itemType, count);
        });
    }
    
    // ===== 실드 상태 업데이트 =====
    updateShieldStatus(isActive = false) {
        const shieldIndicator = document.getElementById('shieldIndicator');
        const body = document.body;
        
        if (shieldIndicator) {
            if (isActive) {
                shieldIndicator.classList.remove('hidden');
                body.classList.add('shield-active');
            } else {
                shieldIndicator.classList.add('hidden');
                body.classList.remove('shield-active');
            }
        }
    }
    
    // ===== 클리어 알림 표시 =====
    showClearNotification(clearType, lines = 0) {
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) return;
        
        const notification = document.createElement('div');
        notification.className = 'clear-notification';
        
        let message = '';
        switch (clearType) {
            case 'single':
                message = 'SINGLE';
                break;
            case 'double':
                message = 'DOUBLE';
                break;
            case 'triple':
                message = 'TRIPLE';
                break;
            case 'tetris':
                message = 'TETRIS!';
                break;
            case 'tspin':
                message = 'T-SPIN!';
                break;
            case 'tspin-single':
                message = 'T-SPIN SINGLE!';
                break;
            case 'tspin-double':
                message = 'T-SPIN DOUBLE!';
                break;
            case 'tspin-triple':
                message = 'T-SPIN TRIPLE!';
                break;
            default:
                message = `${lines} LINES!`;
        }
        
        notification.textContent = message;
        gameBoard.parentElement.appendChild(notification);
        
        // 2초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 2000);
    }
    
    // 숫자 애니메이션
    animateNumber(element, from, to, duration = 500) {
        const startTime = performance.now();
        const difference = to - from;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(from + difference * easeOut);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // ===== 토스트 메시지 시스템 =====
    showToast(message, type = 'info', duration = 3000) {
        this.toastQueue.push({ message, type, duration });
        
        if (!this.activeToast) {
            this.showNextToast();
        }
    }
    
    showNextToast() {
        if (this.toastQueue.length === 0) {
            this.activeToast = null;
            return;
        }
        
        const { message, type, duration } = this.toastQueue.shift();
        
        // 기존 토스트 제거
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 새 토스트 생성
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        this.activeToast = toast;
        
        // 애니메이션
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
                this.showNextToast();
            }, 300);
        }, duration);
    }
    
    // ===== 모달 다이얼로그 =====
    showModal(title, message, buttons = []) {
        // 기존 모달 제거
        this.hideModal();
        
        // 모달 생성
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';
        
        // 버튼 생성
        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.className = `menu-btn ${buttonConfig.type || 'secondary'}`;
            button.textContent = buttonConfig.text;
            
            button.addEventListener('click', () => {
                this.hideModal();
                if (buttonConfig.callback) {
                    buttonConfig.callback();
                }
            });
            
            buttonContainer.appendChild(button);
        });
        
        // 기본 닫기 버튼이 없으면 추가
        if (buttons.length === 0) {
            const closeButton = document.createElement('button');
            closeButton.className = 'menu-btn primary';
            closeButton.textContent = '확인';
            closeButton.addEventListener('click', () => this.hideModal());
            buttonContainer.appendChild(closeButton);
        }
        
        modal.appendChild(titleElement);
        modal.appendChild(messageElement);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        
        document.body.appendChild(overlay);
        this.activeModal = overlay;
        
        // ESC 키로 닫기
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        
        document.addEventListener('keydown', escapeHandler);
    }
    
    hideModal() {
        if (this.activeModal) {
            this.activeModal.remove();
            this.activeModal = null;
        }
    }
    
    // ===== 로비 기능들 =====
    createRoom() {
        const roomName = document.getElementById('roomName')?.value.trim();
        const maxPlayers = parseInt(document.getElementById('maxPlayers')?.value) || 2;
        
        if (!roomName) {
            this.showToast('방 이름을 입력해주세요.', 'warning');
            return;
        }
        
        // 방 생성 요청
        if (this.app.networkManager) {
            this.app.networkManager.createRoom({
                name: roomName,
                maxPlayers: maxPlayers,
                gameMode: this.app.currentGameMode
            });
        } else {
            this.showToast('네트워크 연결이 필요합니다.', 'error');
        }
    }
    
    startQuickMatch() {
        const button = document.getElementById('startQuickMatchBtn');
        const status = document.getElementById('matchingStatus');
        
        if (button && status) {
            button.textContent = '매칭 취소';
            button.onclick = () => this.cancelQuickMatch();
            status.classList.remove('hidden');
            
            // 매칭 시작
            if (this.app.networkManager) {
                this.app.networkManager.startQuickMatch(this.app.currentGameMode);
            } else {
                this.showToast('네트워크 연결이 필요합니다.', 'error');
                this.resetQuickMatch();
            }
        }
    }
    
    cancelQuickMatch() {
        if (this.app.networkManager) {
            this.app.networkManager.cancelQuickMatch();
        }
        this.resetQuickMatch();
    }
    
    resetQuickMatch() {
        const button = document.getElementById('startQuickMatchBtn');
        const status = document.getElementById('matchingStatus');
        
        if (button) {
            button.textContent = '빠른 매칭 시작';
            button.onclick = () => this.startQuickMatch();
        }
        
        if (status) {
            status.classList.add('hidden');
        }
    }
    
    refreshRoomList() {
        if (this.app.networkManager) {
            this.app.networkManager.requestRoomList();
        } else {
            this.showToast('네트워크 연결이 필요합니다.', 'error');
        }
    }
    
    updateRoomList(rooms) {
        this.roomList = rooms;
        const roomListElement = document.getElementById('roomList');
        
        if (!roomListElement) return;
        
        roomListElement.innerHTML = '';
        
        if (rooms.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-room-list';
            emptyMessage.textContent = '현재 참여 가능한 방이 없습니다.';
            emptyMessage.style.padding = '2rem';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = '#666';
            roomListElement.appendChild(emptyMessage);
            return;
        }
        
        rooms.forEach(room => {
            const roomItem = this.createRoomListItem(room);
            roomListElement.appendChild(roomItem);
        });
    }
    
    createRoomListItem(room) {
        const item = document.createElement('div');
        item.className = 'room-item';
        
        const info = document.createElement('div');
        info.className = 'room-info';
        
        const name = document.createElement('div');
        name.className = 'room-name';
        name.textContent = room.name;
        
        const details = document.createElement('div');
        details.className = 'room-details';
        details.textContent = `${room.currentPlayers}/${room.maxPlayers}명 • ${room.gameMode}`;
        
        info.appendChild(name);
        info.appendChild(details);
        
        const joinButton = document.createElement('button');
        joinButton.className = 'room-join-btn';
        joinButton.textContent = room.currentPlayers >= room.maxPlayers ? '가득참' : '참여';
        joinButton.disabled = room.currentPlayers >= room.maxPlayers;
        
        if (!joinButton.disabled) {
            joinButton.addEventListener('click', () => {
                this.joinRoom(room.id);
            });
        }
        
        item.appendChild(info);
        item.appendChild(joinButton);
        
        return item;
    }
    
    joinRoom(roomId) {
        if (this.app.networkManager) {
            this.app.networkManager.joinRoom(roomId);
        }
    }
    
    // ===== 설정 관리 =====
    saveSettings() {
        this.app.settingsManager.saveSettings();
        this.showToast('설정이 저장되었습니다.', 'success');
    }
    
    resetSettings() {
        this.showModal(
            '설정 초기화',
            '모든 설정을 기본값으로 되돌리시겠습니까?',
            [
                {
                    text: '취소',
                    type: 'secondary',
                    callback: () => {}
                },
                {
                    text: '초기화',
                    type: 'primary',
                    callback: () => {
                        this.app.settingsManager.resetSettings();
                        this.loadSettingsToUI();
                        this.showToast('설정이 초기화되었습니다.', 'info');
                    }
                }
            ]
        );
    }
    
    loadSettingsToUI() {
        const settings = this.app.settings;
        
        // 볼륨 슬라이더
        const musicSlider = document.getElementById('musicVolume');
        const effectSlider = document.getElementById('effectVolume');
        
        if (musicSlider) {
            musicSlider.value = settings.musicVolume;
            musicSlider.nextElementSibling.textContent = settings.musicVolume + '%';
        }
        
        if (effectSlider) {
            effectSlider.value = settings.effectVolume;
            effectSlider.nextElementSibling.textContent = settings.effectVolume + '%';
        }
        
        // 체크박스
        const showGrid = document.getElementById('showGrid');
        const showGhost = document.getElementById('showGhost');
        
        if (showGrid) showGrid.checked = settings.showGrid;
        if (showGhost) showGhost.checked = settings.showGhost;
    }
    
    // ===== 키보드 아이템 사용 지원 =====
    handleItemKeyPress(key) {
        const itemMap = {
            '1': 'shield',
            '2': 'attack', 
            '3': 'lineClear',
            '4': 'slowDown'
        };
        
        const itemType = itemMap[key];
        if (itemType) {
            this.useItem(itemType);
        }
    }
    
    // ===== 게임 종료 시 최종 통계 표시 =====
    showGameOverStats(stats) {
        const finalStatsContainer = document.querySelector('.final-stats');
        if (!finalStatsContainer) return;
        
        finalStatsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">최대 콤보</div>
                <div class="stat-value">${stats.maxCombo || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">총 공격력</div>
                <div class="stat-value">${stats.totalAttack || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">T-Spin 수</div>
                <div class="stat-value">${stats.tSpinCount || 0}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">사용한 아이템</div>
                <div class="stat-value">${stats.itemsUsed || 0}</div>
            </div>
        `;
    }
    
    // ===== 정리 =====
    cleanup() {
        this.hideModal();
        
        // 토스트 제거
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        this.toastQueue = [];
        this.activeToast = null;
        
        console.log('🧹 UIManager cleanup completed');
    }
}