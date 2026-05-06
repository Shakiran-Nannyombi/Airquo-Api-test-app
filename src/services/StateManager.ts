type Listener<T> = (data: T) => void;

class StateManager {
  private state: Record<string, any> = {};
  private listeners: Record<string, Listener<any>[]> = {};

  set<T>(key: string, value: T) {
    this.state[key] = value;
    this.notify(key, value);
  }

  get<T>(key: string): T {
    return this.state[key];
  }

  subscribe<T>(key: string, listener: Listener<T>) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(listener);
    
    // Immediately notify with current value if exists
    if (this.state[key] !== undefined) {
      listener(this.state[key]);
    }

    return () => {
      this.listeners[key] = this.listeners[key].filter(l => l !== listener);
    };
  }

  private notify<T>(key: string, value: T) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(listener => listener(value));
    }
  }
}

export const stateManager = new StateManager();
