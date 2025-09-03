export class Piece {
    constructor(type, x = 0, y = 0, rotation = 0) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        
        this.shapes = this.getShapeDefinitions();
    }
    
    getShapeDefinitions() {
        return {
            'I': [
                // Rotation 0
                [
                    [0, 0, 0, 0],
                    [1, 1, 1, 1],
                    [0, 0, 0, 0],
                    [0, 0, 0, 0]
                ],
                // Rotation 1
                [
                    [0, 0, 1, 0],
                    [0, 0, 1, 0],
                    [0, 0, 1, 0],
                    [0, 0, 1, 0]
                ],
                // Rotation 2 (same as 0)
                [
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [1, 1, 1, 1],
                    [0, 0, 0, 0]
                ],
                // Rotation 3 (same as 1)
                [
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                    [0, 1, 0, 0]
                ]
            ],
            'O': [
                // All rotations are the same for O piece
                [
                    [1, 1],
                    [1, 1]
                ],
                [
                    [1, 1],
                    [1, 1]
                ],
                [
                    [1, 1],
                    [1, 1]
                ],
                [
                    [1, 1],
                    [1, 1]
                ]
            ],
            'T': [
                // Rotation 0
                [
                    [0, 1, 0],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                // Rotation 1
                [
                    [0, 1, 0],
                    [0, 1, 1],
                    [0, 1, 0]
                ],
                // Rotation 2
                [
                    [0, 0, 0],
                    [1, 1, 1],
                    [0, 1, 0]
                ],
                // Rotation 3
                [
                    [0, 1, 0],
                    [1, 1, 0],
                    [0, 1, 0]
                ]
            ],
            'S': [
                // Rotation 0
                [
                    [0, 1, 1],
                    [1, 1, 0],
                    [0, 0, 0]
                ],
                // Rotation 1
                [
                    [0, 1, 0],
                    [0, 1, 1],
                    [0, 0, 1]
                ],
                // Rotation 2
                [
                    [0, 0, 0],
                    [0, 1, 1],
                    [1, 1, 0]
                ],
                // Rotation 3
                [
                    [1, 0, 0],
                    [1, 1, 0],
                    [0, 1, 0]
                ]
            ],
            'Z': [
                // Rotation 0
                [
                    [1, 1, 0],
                    [0, 1, 1],
                    [0, 0, 0]
                ],
                // Rotation 1
                [
                    [0, 0, 1],
                    [0, 1, 1],
                    [0, 1, 0]
                ],
                // Rotation 2
                [
                    [0, 0, 0],
                    [1, 1, 0],
                    [0, 1, 1]
                ],
                // Rotation 3
                [
                    [0, 1, 0],
                    [1, 1, 0],
                    [1, 0, 0]
                ]
            ],
            'J': [
                // Rotation 0
                [
                    [1, 0, 0],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                // Rotation 1
                [
                    [0, 1, 1],
                    [0, 1, 0],
                    [0, 1, 0]
                ],
                // Rotation 2
                [
                    [0, 0, 0],
                    [1, 1, 1],
                    [0, 0, 1]
                ],
                // Rotation 3
                [
                    [0, 1, 0],
                    [0, 1, 0],
                    [1, 1, 0]
                ]
            ],
            'L': [
                // Rotation 0
                [
                    [0, 0, 1],
                    [1, 1, 1],
                    [0, 0, 0]
                ],
                // Rotation 1
                [
                    [0, 1, 0],
                    [0, 1, 0],
                    [0, 1, 1]
                ],
                // Rotation 2
                [
                    [0, 0, 0],
                    [1, 1, 1],
                    [1, 0, 0]
                ],
                // Rotation 3
                [
                    [1, 1, 0],
                    [0, 1, 0],
                    [0, 1, 0]
                ]
            ]
        };
    }
    
    getShape(rotation = this.rotation) {
        return this.shapes[this.type][rotation % 4];
    }
    
    rotate(direction = 1) {
        // direction: 1 for clockwise, -1 for counter-clockwise
        this.rotation = (this.rotation + direction + 4) % 4;
    }
    
    move(deltaX, deltaY) {
        this.x += deltaX;
        this.y += deltaY;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    getColor() {
        const colors = {
            'I': '#00FFFF', // Cyan
            'O': '#FFFF00', // Yellow
            'T': '#800080', // Purple
            'S': '#00FF00', // Green
            'Z': '#FF0000', // Red
            'J': '#0000FF', // Blue
            'L': '#FFA500'  // Orange
        };
        return colors[this.type] || '#FFFFFF';
    }
    
    render(ctx, cellSize = 30) {
        const shape = this.getShape();
        const color = this.getColor();
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const x = (this.x + px) * cellSize;
                    const y = (this.y + py) * cellSize;
                    
                    this.drawCell(ctx, x, y, color, cellSize);
                }
            }
        }
    }
    
    drawCell(ctx, x, y, color, cellSize) {
        // Fill main color
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        
        // Add highlight for 3D effect
        const highlightColor = this.lightenColor(color, 0.3);
        const shadowColor = this.darkenColor(color, 0.3);
        
        // Top highlight
        ctx.fillStyle = highlightColor;
        ctx.fillRect(x + 1, y + 1, cellSize - 2, 2);
        
        // Left highlight
        ctx.fillRect(x + 1, y + 1, 2, cellSize - 2);
        
        // Bottom shadow
        ctx.fillStyle = shadowColor;
        ctx.fillRect(x + 1, y + cellSize - 3, cellSize - 2, 2);
        
        // Right shadow
        ctx.fillRect(x + cellSize - 3, y + 1, 2, cellSize - 2);
        
        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
    
    lightenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(255 * amount);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R : 255) * 0x10000 +
            (G < 255 ? G : 255) * 0x100 + (B < 255 ? B : 255))
            .toString(16).slice(1);
    }
    
    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(255 * amount);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
            (G > 0 ? G : 0) * 0x100 + (B > 0 ? B : 0))
            .toString(16).slice(1);
    }
    
    getBoundingBox() {
        const shape = this.getShape();
        let minX = shape[0].length, maxX = -1;
        let minY = shape.length, maxY = -1;
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    minX = Math.min(minX, px);
                    maxX = Math.max(maxX, px);
                    minY = Math.min(minY, py);
                    maxY = Math.max(maxY, py);
                }
            }
        }
        
        return {
            x: this.x + minX,
            y: this.y + minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }
    
    getGhostPosition(board) {
        // Find the lowest valid position for this piece (ghost piece)
        let ghostY = this.y;
        
        while (board.isValidPosition(this, this.x, ghostY + 1, this.rotation)) {
            ghostY++;
        }
        
        return ghostY;
    }
    
    renderGhost(ctx, board, cellSize = 30) {
        const ghostY = this.getGhostPosition(board);
        if (ghostY === this.y) return; // Don't draw ghost if it's at current position
        
        const shape = this.getShape();
        const color = this.getColor();
        
        // Draw semi-transparent ghost piece
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const x = (this.x + px) * cellSize;
                    const y = (ghostY + py) * cellSize;
                    
                    // Simple outline for ghost
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                }
            }
        }
        
        ctx.restore();
    }
    
    clone() {
        return new Piece(this.type, this.x, this.y, this.rotation);
    }
    
    serialize() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            rotation: this.rotation
        };
    }
    
    deserialize(data) {
        this.type = data.type;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
    }
    
    // Static method to create piece from type
    static create(type, x = 4, y = 0) {
        return new Piece(type, x, y);
    }
    
    // Get all possible piece types
    static getTypes() {
        return ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    }
    
    // Generate random piece type
    static randomType() {
        const types = Piece.getTypes();
        return types[Math.floor(Math.random() * types.length)];
    }
}