import { EventEmitter } from 'events';
import { S7Client } from './S7Client';

export interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  ip: string;
  rack: number;
  slot: number;
}

export class ReconnectionManager extends EventEmitter {
  private s7Client: S7Client;
  private config: ReconnectionConfig | null = null;
  private retryCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private active = false;

  constructor(s7Client: S7Client) {
    super();
    this.s7Client = s7Client;
  }

  start(config: ReconnectionConfig): void {
    this.config = { ...config };
    this.retryCount = 0;
    this.active = true;

    this.s7Client.on('disconnected', () => {
      if (this.active) {
        this.scheduleReconnect();
      }
    });
  }

  stop(): void {
    this.active = false;
    this.clearTimer();
    this.config = null;
    this.retryCount = 0;
  }

  reset(): void {
    this.retryCount = 0;
    this.clearTimer();
  }

  async forceReconnect(): Promise<void> {
    if (!this.config) return;
    this.clearTimer();
    await this.attemptReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.active || !this.config) return;

    const delay = Math.min(
      this.config.baseDelay * Math.pow(2, this.retryCount),
      this.config.maxDelay
    );

    this.clearTimer();

    this.emit('reconnecting', {
      attempt: this.retryCount + 1,
      maxRetries: this.config.maxRetries,
      delay,
      nextAttemptTime: Date.now() + delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  private async attemptReconnect(): Promise<void> {
    if (!this.config || !this.active) return;

    this.retryCount++;

    if (this.config.maxRetries > 0 && this.retryCount > this.config.maxRetries) {
      this.emit('reconnect-failed', {
        attempts: this.retryCount,
        reason: 'Max retries exceeded',
      });
      return;
    }

    try {
      await this.s7Client.connect(this.config.ip, this.config.rack, this.config.slot);
      this.emit('reconnected', {
        attempts: this.retryCount,
        ip: this.config.ip,
      });
      this.reset();
    } catch (err) {
      this.emit('reconnect-error', {
        attempt: this.retryCount,
        error: err instanceof Error ? err.message : String(err),
      });
      this.scheduleReconnect();
    }
  }

  private clearTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}