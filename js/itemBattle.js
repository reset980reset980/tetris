// ===== Enhanced Item Battle System =====
// Inspired by tetris-battle and multi-tetris

export class ItemBattleSystem {
    constructor(game) {
        this.game = game;
        this.items = {
            shield: { count: 0, max: 9, icon: '🛡️' },
            attack: { count: 0, max: 9, icon: '⚔️' },
            lineClear: { count: 0, max: 9, icon: '💥' },
            slowDown: { count: 0, max: 9, icon: '🐢' },
            speedUp: { count: 0, max: 9, icon: '⚡' },
            bomb: { count: 0, max: 9, icon: '💣' },
            freeze: { count: 0, max: 9, icon: '❄️' },
            gravity: { count: 0, max: 9, icon: '⬇️' },
            shuffle: { count: 0, max: 9, icon: '🔀' },
            invisible: { count: 0, max: 9, icon: '👻' }
        };
        
        this.itemEffects = {
            shield: {
                duration: 10000,
                description: 'Blocks incoming attacks for 10 seconds',
                activate: () => this.activateShield()
            },
            attack: {
                power: 3,
                description: 'Sends 3 garbage lines to opponent',
                activate: (target) => this.sendAttack(target, 3)
            },
            lineClear: {
                lines: 2,
                description: 'Clears bottom 2 lines instantly',
                activate: () => this.clearBottomLines(2)
            },
            slowDown: {
                duration: 8000,
                multiplier: 0.5,
                description: 'Slows opponent speed by 50% for 8 seconds',
                activate: (target) => this.applySlowDown(target)
            },
            speedUp: {
                duration: 8000,
                multiplier: 1.5,
                description: 'Increases your speed by 50% for 8 seconds',
                activate: () => this.applySpeedUp()
            },
            bomb: {
                radius: 3,
                description: 'Destroys blocks in 3x3 area',
                activate: () => this.deployBomb()
            },
            freeze: {
                duration: 5000,
                description: 'Freezes opponent controls for 5 seconds',
                activate: (target) => this.freezeOpponent(target)
            },
            gravity: {
                duration: 10000,
                description: 'Increases opponent gravity for 10 seconds',
                activate: (target) => this.applyGravity(target)
            },
            shuffle: {
                description: 'Shuffles opponent board layout',
                activate: (target) => this.shuffleBoard(target)
            },
            invisible: {
                duration: 7000,
                description: 'Makes opponent blocks invisible for 7 seconds',
                activate: (target) => this.makeInvisible(target)
            }
        };
        
        this.activeEffects = [];
        this.shieldActive = false;
        this.comboMultiplier = 1;
        this.setupUI();
    }
    
    setupUI() {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'item-battle-container';
        itemContainer.innerHTML = `
            <div class="item-inventory">
                <h3>Battle Items</h3>
                <div class="item-grid">
                    ${Object.entries(this.items).map(([key, item], index) => `
                        <div class="item-slot" data-item="${key}" data-key="${index + 1}">
                            <div class="item-icon">${item.icon}</div>
                            <div class="item-count">0</div>
                            <div class="item-key">[${index + 1}]</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="active-effects">
                <h4>Active Effects</h4>
                <div class="effects-list"></div>
            </div>
            <div class="combo-display hidden">
                <img class="combo-image" src="" alt="">
                <div class="combo-text"></div>
            </div>
        `;
        
        document.querySelector('.game-info-panel')?.appendChild(itemContainer);
        this.bindItemControls();
    }
    
    bindItemControls() {
        document.addEventListener('keydown', (e) => {
            const itemIndex = parseInt(e.key) - 1;
            const itemKeys = Object.keys(this.items);
            
            if (itemIndex >= 0 && itemIndex < itemKeys.length) {
                const itemType = itemKeys[itemIndex];
                if (this.items[itemType].count > 0) {
                    this.useItem(itemType);
                }
            }
        });
    }
    
    addItem(type, count = 1) {
        if (this.items[type]) {
            this.items[type].count = Math.min(
                this.items[type].count + count,
                this.items[type].max
            );
            this.updateItemUI(type);
            this.showItemNotification(type, count);
        }
    }
    
    useItem(type) {
        if (this.items[type].count > 0) {
            this.items[type].count--;
            this.updateItemUI(type);
            
            // Apply item effect
            if (this.itemEffects[type]) {
                this.itemEffects[type].activate(this.game.currentOpponent);
                this.showEffectAnimation(type);
            }
        }
    }
    
    activateShield() {
        this.shieldActive = true;
        this.addActiveEffect('shield', this.itemEffects.shield.duration);
        
        setTimeout(() => {
            this.shieldActive = false;
        }, this.itemEffects.shield.duration);
    }
    
    sendAttack(target, lines) {
        if (target && !this.shieldActive) {
            // Send garbage lines to opponent
            this.game.sendGarbageLines(target, lines * this.comboMultiplier);
            this.showAttackAnimation(lines);
        }
    }
    
    clearBottomLines(count) {
        for (let i = 0; i < count; i++) {
            this.game.clearBottomLine();
        }
        this.showLineClearEffect();
    }
    
    applySlowDown(target) {
        if (target) {
            const originalSpeed = target.dropSpeed;
            target.dropSpeed *= this.itemEffects.slowDown.multiplier;
            this.addActiveEffect('slowDown', this.itemEffects.slowDown.duration);
            
            setTimeout(() => {
                target.dropSpeed = originalSpeed;
            }, this.itemEffects.slowDown.duration);
        }
    }
    
    applySpeedUp() {
        const originalSpeed = this.game.dropSpeed;
        this.game.dropSpeed *= this.itemEffects.speedUp.multiplier;
        this.addActiveEffect('speedUp', this.itemEffects.speedUp.duration);
        
        setTimeout(() => {
            this.game.dropSpeed = originalSpeed;
        }, this.itemEffects.speedUp.duration);
    }
    
    deployBomb() {
        const radius = this.itemEffects.bomb.radius;
        const centerX = Math.floor(this.game.currentPiece.x);
        const centerY = Math.floor(this.game.currentPiece.y);
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (this.game.isValidPosition(x, y)) {
                    this.game.board[y][x] = 0;
                }
            }
        }
        
        this.showBombExplosion(centerX, centerY);
    }
    
    freezeOpponent(target) {
        if (target) {
            target.controlsEnabled = false;
            this.addActiveEffect('freeze', this.itemEffects.freeze.duration);
            
            setTimeout(() => {
                target.controlsEnabled = true;
            }, this.itemEffects.freeze.duration);
        }
    }
    
    applyGravity(target) {
        if (target) {
            const originalGravity = target.gravity;
            target.gravity *= 2;
            this.addActiveEffect('gravity', this.itemEffects.gravity.duration);
            
            setTimeout(() => {
                target.gravity = originalGravity;
            }, this.itemEffects.gravity.duration);
        }
    }
    
    shuffleBoard(target) {
        if (target && target.board) {
            // Shuffle non-empty cells
            const filledCells = [];
            for (let y = 0; y < target.board.length; y++) {
                for (let x = 0; x < target.board[0].length; x++) {
                    if (target.board[y][x] !== 0) {
                        filledCells.push(target.board[y][x]);
                        target.board[y][x] = 0;
                    }
                }
            }
            
            // Randomly redistribute
            filledCells.sort(() => Math.random() - 0.5);
            let cellIndex = 0;
            
            for (let y = target.board.length - 1; y >= 0 && cellIndex < filledCells.length; y--) {
                for (let x = 0; x < target.board[0].length && cellIndex < filledCells.length; x++) {
                    if (Math.random() > 0.3) {
                        target.board[y][x] = filledCells[cellIndex++];
                    }
                }
            }
            
            this.showShuffleEffect();
        }
    }
    
    makeInvisible(target) {
        if (target) {
            target.invisible = true;
            this.addActiveEffect('invisible', this.itemEffects.invisible.duration);
            
            setTimeout(() => {
                target.invisible = false;
            }, this.itemEffects.invisible.duration);
        }
    }
    
    updateItemUI(type) {
        const slot = document.querySelector(`[data-item="${type}"] .item-count`);
        if (slot) {
            slot.textContent = this.items[type].count;
            slot.parentElement.classList.toggle('has-items', this.items[type].count > 0);
        }
    }
    
    addActiveEffect(type, duration) {
        const effect = {
            type,
            endTime: Date.now() + duration
        };
        
        this.activeEffects.push(effect);
        this.updateEffectsUI();
        
        setTimeout(() => {
            this.activeEffects = this.activeEffects.filter(e => e !== effect);
            this.updateEffectsUI();
        }, duration);
    }
    
    updateEffectsUI() {
        const effectsList = document.querySelector('.effects-list');
        if (effectsList) {
            effectsList.innerHTML = this.activeEffects.map(effect => {
                const remaining = Math.ceil((effect.endTime - Date.now()) / 1000);
                return `
                    <div class="effect-item ${effect.type}">
                        ${this.items[effect.type]?.icon || ''} ${effect.type} (${remaining}s)
                    </div>
                `;
            }).join('');
        }
    }
    
    showCombo(comboCount) {
        const comboDisplay = document.querySelector('.combo-display');
        const comboImage = document.querySelector('.combo-image');
        const comboText = document.querySelector('.combo-text');
        
        if (comboDisplay && comboCount > 0) {
            // Use combo images from tetris-battle
            const imagePath = `assets/images/combo/${Math.min(comboCount, 10)}combo.png`;
            comboImage.src = imagePath;
            comboText.textContent = `${comboCount} COMBO!`;
            
            comboDisplay.classList.remove('hidden');
            this.comboMultiplier = 1 + (comboCount * 0.2);
            
            setTimeout(() => {
                comboDisplay.classList.add('hidden');
            }, 2000);
        }
    }
    
    showItemNotification(type, count) {
        const notification = document.createElement('div');
        notification.className = 'item-notification';
        notification.innerHTML = `
            <span class="item-icon">${this.items[type].icon}</span>
            <span class="item-text">+${count} ${type}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }
    
    showEffectAnimation(type) {
        // Add visual effect animations
        const canvas = document.querySelector('#gameBoard');
        if (canvas) {
            canvas.classList.add(`effect-${type}`);
            setTimeout(() => {
                canvas.classList.remove(`effect-${type}`);
            }, 1000);
        }
    }
    
    showAttackAnimation(lines) {
        // Attack animation
        console.log(`Attacking with ${lines} lines!`);
    }
    
    showLineClearEffect() {
        // Line clear effect
        console.log('Lines cleared!');
    }
    
    showBombExplosion(x, y) {
        // Bomb explosion animation
        console.log(`Bomb exploded at ${x}, ${y}!`);
    }
    
    showShuffleEffect() {
        // Shuffle effect
        console.log('Board shuffled!');
    }
    
    // Calculate items earned based on game actions
    calculateItemReward(action, value) {
        let itemsEarned = [];
        
        switch(action) {
            case 'tetris':
                itemsEarned.push({ type: 'attack', count: 2 });
                itemsEarned.push({ type: 'lineClear', count: 1 });
                break;
            case 'tspin':
                itemsEarned.push({ type: 'bomb', count: 1 });
                itemsEarned.push({ type: 'speedUp', count: 1 });
                break;
            case 'combo':
                if (value >= 5) {
                    itemsEarned.push({ type: 'freeze', count: 1 });
                }
                if (value >= 10) {
                    itemsEarned.push({ type: 'shuffle', count: 1 });
                }
                break;
            case 'backToBack':
                itemsEarned.push({ type: 'shield', count: 1 });
                break;
            case 'perfect_clear':
                itemsEarned.push({ type: 'attack', count: 3 });
                itemsEarned.push({ type: 'invisible', count: 1 });
                break;
        }
        
        // Add random item chance
        if (Math.random() < 0.1) {
            const randomItems = Object.keys(this.items);
            const randomType = randomItems[Math.floor(Math.random() * randomItems.length)];
            itemsEarned.push({ type: randomType, count: 1 });
        }
        
        // Apply items
        itemsEarned.forEach(item => {
            this.addItem(item.type, item.count);
        });
        
        return itemsEarned;
    }
}

// CSS Styles for Item Battle System
const itemBattleStyles = `
<style>
.item-battle-container {
    margin-top: 2rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.item-inventory h3 {
    font-size: 1rem;
    color: #4ecdc4;
    margin-bottom: 1rem;
    text-align: center;
    text-transform: uppercase;
}

.item-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
}

.item-slot {
    position: relative;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    padding: 0.5rem;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;
}

.item-slot:hover {
    background: rgba(78, 205, 196, 0.2);
    border-color: #4ecdc4;
    transform: scale(1.05);
}

.item-slot.has-items {
    background: rgba(78, 205, 196, 0.1);
    border-color: #4ecdc4;
}

.item-icon {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
}

.item-count {
    font-size: 0.9rem;
    font-weight: bold;
    color: #4ecdc4;
}

.item-key {
    font-size: 0.7rem;
    color: #666;
    margin-top: 0.25rem;
}

.active-effects {
    margin-top: 1rem;
}

.active-effects h4 {
    font-size: 0.9rem;
    color: #b0b0b0;
    margin-bottom: 0.5rem;
}

.effects-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.effect-item {
    padding: 0.25rem 0.5rem;
    background: rgba(78, 205, 196, 0.1);
    border-left: 3px solid #4ecdc4;
    border-radius: 3px;
    font-size: 0.8rem;
    color: #4ecdc4;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.combo-display {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    text-align: center;
    animation: comboAnimation 0.5s ease-out;
}

.combo-display.hidden {
    display: none;
}

.combo-image {
    max-width: 200px;
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8));
}

.combo-text {
    font-size: 2rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
    margin-top: 1rem;
}

@keyframes comboAnimation {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.2);
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}

.item-notification {
    position: fixed;
    top: 20%;
    right: 2rem;
    background: rgba(0, 0, 0, 0.8);
    padding: 1rem;
    border-radius: 10px;
    border: 2px solid #4ecdc4;
    color: #4ecdc4;
    font-weight: bold;
    animation: slideIn 0.5s ease-out;
    z-index: 999;
}

.item-notification.fade-out {
    animation: fadeOut 0.5s ease-out forwards;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeOut {
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

/* Effect animations for canvas */
.effect-shield {
    box-shadow: 0 0 30px rgba(78, 205, 196, 0.8) !important;
}

.effect-attack {
    animation: shake 0.5s !important;
}

.effect-bomb {
    animation: explode 0.5s !important;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

@keyframes explode {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); filter: brightness(2); }
    100% { transform: scale(1); }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', itemBattleStyles);

export default ItemBattleSystem;