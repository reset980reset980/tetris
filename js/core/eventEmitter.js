export class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
                
                // Clean up empty event arrays
                if (callbacks.length === 0) {
                    this.listeners.delete(event);
                }
            }
        }
    }
    
    emit(event, ...args) {
        if (this.listeners.has(event)) {
            const callbacks = [...this.listeners.get(event)]; // Copy to avoid mutation during iteration
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            });
            return true;
        }
        return false;
    }
    
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };
        return this.on(event, onceWrapper);
    }
    
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
    
    listenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }
    
    eventNames() {
        return Array.from(this.listeners.keys());
    }
}