export class Board {
    constructor(width = 10, height = 20) {
        this.width = width;
        this.height = height;
        this.grid = this.createEmptyGrid();
        this.cellSize = 30; // Default cell size for rendering
    }
    
    createEmptyGrid() {
        return Array(this.height).fill(null).map(() => Array(this.width).fill(0));
    }
    
    clear() {
        this.grid = this.createEmptyGrid();
    }
    
    isValidPosition(piece, x = piece.x, y = piece.y, rotation = piece.rotation) {
        const shape = piece.getShape(rotation);
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const boardX = x + px;
                    const boardY = y + py;
                    
                    // Check bounds
                    if (boardX < 0 || boardX >= this.width || boardY >= this.height) {
                        return false;
                    }
                    
                    // Check if position is occupied (but allow negative Y for spawn area)
                    if (boardY >= 0 && this.grid[boardY][boardX] !== 0) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    placePiece(piece) {
        const shape = piece.getShape();
        const colorIndex = this.getPieceColorIndex(piece.type);
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const boardX = piece.x + px;
                    const boardY = piece.y + py;
                    
                    if (boardY >= 0 && boardY < this.height && boardX >= 0 && boardX < this.width) {
                        this.grid[boardY][boardX] = colorIndex;
                    }
                }
            }
        }
    }
    
    getPieceColorIndex(pieceType) {
        const colorMap = {
            'I': 1, // Cyan
            'O': 2, // Yellow
            'T': 3, // Purple
            'S': 4, // Green
            'Z': 5, // Red
            'J': 6, // Blue
            'L': 7  // Orange
        };
        return colorMap[pieceType] || 1;
    }
    
    clearLines() {
        const clearedLines = [];
        
        // Check each row from bottom to top
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.isLineFull(y)) {
                clearedLines.push(y);
                this.clearLine(y);
                y++; // Check the same line again since lines above moved down
            }
        }
        
        return clearedLines.reverse(); // Return in top-to-bottom order
    }
    
    isLineFull(y) {
        return this.grid[y].every(cell => cell !== 0);
    }
    
    clearLine(y) {
        // Remove the line and add empty line at top
        this.grid.splice(y, 1);
        this.grid.unshift(Array(this.width).fill(0));
    }
    
    addGarbageLines(count, removeInstead = false) {
        if (removeInstead) {
            // Remove lines from bottom
            for (let i = 0; i < count && this.grid.length > 0; i++) {
                // Only remove if the bottom line has blocks
                if (this.grid[this.height - 1].some(cell => cell !== 0)) {
                    this.grid.splice(this.height - 1, 1);
                    this.grid.unshift(Array(this.width).fill(0));
                }
            }
        } else {
            // Add garbage lines at bottom
            for (let i = 0; i < count; i++) {
                // Create garbage line with random hole
                const garbageLine = Array(this.width).fill(8); // 8 = garbage color
                const holePosition = Math.floor(Math.random() * this.width);
                garbageLine[holePosition] = 0;
                
                // Remove top lines and add garbage at bottom
                this.grid.splice(0, 1);
                this.grid.push(garbageLine);
            }
        }
    }
    
    clearArea(centerX, centerY, size) {
        const radius = Math.floor(size / 2);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.grid[y][x] = 0;
                }
            }
        }
    }
    
    render(ctx) {
        const cellSize = this.cellSize;
        
        // Draw board background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.width * cellSize, this.height * cellSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, this.height * cellSize);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.width * cellSize, y * cellSize);
            ctx.stroke();
        }
        
        // Draw placed pieces
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] !== 0) {
                    const color = this.getColorFromIndex(this.grid[y][x]);
                    this.drawCell(ctx, x, y, color, cellSize);
                }
            }
        }
    }
    
    getColorFromIndex(index) {
        const colors = [
            '#000000', // 0: Empty
            '#00FFFF', // 1: I - Cyan
            '#FFFF00', // 2: O - Yellow
            '#800080', // 3: T - Purple
            '#00FF00', // 4: S - Green
            '#FF0000', // 5: Z - Red
            '#0000FF', // 6: J - Blue
            '#FFA500', // 7: L - Orange
            '#808080'  // 8: Garbage - Gray
        ];
        return colors[index] || colors[0];
    }
    
    drawCell(ctx, x, y, color, cellSize) {
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        // Fill main color
        ctx.fillStyle = color;
        ctx.fillRect(pixelX + 1, pixelY + 1, cellSize - 2, cellSize - 2);
        
        // Add highlight for 3D effect
        const highlightColor = this.lightenColor(color, 0.3);
        const shadowColor = this.darkenColor(color, 0.3);
        
        // Top highlight
        ctx.fillStyle = highlightColor;
        ctx.fillRect(pixelX + 1, pixelY + 1, cellSize - 2, 2);
        
        // Left highlight
        ctx.fillRect(pixelX + 1, pixelY + 1, 2, cellSize - 2);
        
        // Bottom shadow
        ctx.fillStyle = shadowColor;
        ctx.fillRect(pixelX + 1, pixelY + cellSize - 3, cellSize - 2, 2);
        
        // Right shadow
        ctx.fillRect(pixelX + cellSize - 3, pixelY + 1, 2, cellSize - 2);
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
    
    getHeight() {
        // Calculate the height of the stack (for AI or game mechanics)
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y].some(cell => cell !== 0)) {
                return this.height - y;
            }
        }
        return 0;
    }
    
    serialize() {
        return {
            width: this.width,
            height: this.height,
            grid: this.grid.map(row => [...row]) // Deep copy
        };
    }
    
    deserialize(data) {
        this.width = data.width;
        this.height = data.height;
        this.grid = data.grid.map(row => [...row]); // Deep copy
    }
}