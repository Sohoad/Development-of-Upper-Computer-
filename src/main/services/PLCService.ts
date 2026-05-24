import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { S7Adapter } from './S7Adapter';
import { TagManager } from './TagManager';
import { DataBus } from './DataBus';
import { ReconnectionManager, ReconnectionConfig } from './ReconnectionManager';
import { database } from './database';
import {
  PLCConfig,
  PLCStatus,
  AlarmRecord,
  TagValue,
  ConnectionStatus,
  TagConfig,
  AuditLog,
  HistoryRecord,
  DataBusData,
} from '../../shared/types';

export class PLCService extends EventEmitter {
  private s7Adapter: S7Adapter;
  private tagManager: TagManager;
  private dataBus: DataBus;
  private reconnectionManager: ReconnectionManager;
  private config: PLCConfig | null = null;
  private alarmHistory: AlarmRecord[] = [];
  private startTime = Date.now();
  private currentUserId = 'system';
  private currentUsername = 'system';

  constructor() {
    super();

    this.tagManager = new TagManager();
    this.s7Adapter = new S7Adapter(this.tagManager);
    this.dataBus = new DataBus();
    this.reconnectionManager = new ReconnectionManager(this.s7Adapter.getRawClient());

    this.dataBus.registerAdapter(this.s7Adapter);

    this.setupEventForwarding();
  }

  setCurrentUser(userId: string, username: string): void {
    this.currentUserId = userId;
    this.currentUsername = username;
  }

  private setupEventForwarding(): void {
    this.dataBus.on('data', (data: DataBusData) => {
      this.emit('data', {
        timestamp: data.timestamp,
        latency: data.latency,
        values: data.tags,
      });
      this.saveHistory(data.tags, data.timestamp);
      this.checkAlarms(data.tags);
    });

    this.dataBus.on('error', (err: { adapterName: string; error: Error }) => {
      this.emit('error', { message: err.error.message, timestamp: Date.now() });
    });

    this.s7Adapter.on('connected', () => {
      this.emitConnectionChange(true);
    });

    this.s7Adapter.on('disconnected', () => {
      this.emitConnectionChange(false);
    });

    this.reconnectionManager.on('reconnecting', (info: unknown) => {
      this.emit('reconnecting', info);
    });

    this.reconnectionManager.on('reconnected', (info: unknown) => {
      this.emitConnectionChange(true);
      this.emit('reconnected', info);
    });

    this.reconnectionManager.on('reconnect-failed', (info: unknown) => {
      this.emit('reconnect-failed', info);
    });
  }

  async start(): Promise<void> {
    this.startTime = Date.now();
  }

  async stop(): Promise<void> {
    this.dataBus.stopPolling('s7');
    this.reconnectionManager.stop();
    await this.s7Adapter.disconnect();
  }

  async connect(ip: string, rack: number, slot: number): Promise<{ success: boolean; simulation: boolean }> {
    this.config = { ip, rack, slot };

    try {
      await this.s7Adapter.connect({ name: 's7', type: 's7', ip, rack, slot });
      this.dataBus.startPolling('s7', 500, this.tagManager);

      const reconnectConfig: ReconnectionConfig = {
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 30000,
        ip,
        rack,
        slot,
      };
      this.reconnectionManager.start(reconnectConfig);

      this.emitConnectionChange(true);

      return {
        success: true,
        simulation: this.s7Adapter.isSimulation(),
      };
    } catch (err) {
      this.emit('error', {
        message: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.dataBus.stopPolling('s7');
    this.reconnectionManager.stop();

    if (this.s7Adapter.isConnected()) {
      await this.s7Adapter.disconnect();
    }

    this.config = null;
    this.emitConnectionChange(false);
  }

  getStatus(): PLCStatus {
    return {
      config: this.config ? { ...this.config } : null,
      connection: this.getConnectionStatus(),
      stats: this.dataBus.getPollingStats('s7'),
    };
  }

  getTags(): TagConfig[] {
    return this.tagManager.getTags();
  }

  async writeTag(tagName: string, value: number | boolean): Promise<{ success: boolean }> {
    const tag = this.tagManager.getTag(tagName);
    if (!tag) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    try {
      await this.s7Adapter.writeTag(tag, value);
      this.writeAuditLog(tagName, String(value));
      return { success: true };
    } catch (err) {
      throw err;
    }
  }

  getAlarmHistory(): AlarmRecord[] {
    return [...this.alarmHistory];
  }

  acknowledgeAlarm(index: number): boolean {
    if (index >= 0 && index < this.alarmHistory.length) {
      this.alarmHistory[index].acknowledged = true;
      return true;
    }
    return false;
  }

  clearAlarms(): void {
    this.alarmHistory = [];
  }

  getDataBus(): DataBus {
    return this.dataBus;
  }

  private getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.s7Adapter.isConnected(),
      latency: this.dataBus.getPollingStats('s7').avgLatency,
      lastError: '',
      reconnectAttempt: 0,
      simulation: this.s7Adapter.isSimulation(),
    };
  }

  private emitConnectionChange(connected: boolean): void {
    this.emit('connection-change', {
      connected,
      latency: this.dataBus.getPollingStats('s7').avgLatency,
      lastError: '',
      reconnectAttempt: 0,
      simulation: this.s7Adapter.isSimulation(),
    });
  }

  private checkAlarms(values: TagValue[]): void {
    for (const tv of values) {
      const tag = tv.tag;
      if (tag.min !== undefined && tag.max !== undefined) {
        const value = typeof tv.value === 'number' ? tv.value : 0;
        if (value > tag.max) {
          const alarm: AlarmRecord = {
            id: crypto.randomUUID(),
            time: Date.now(),
            level: tag.name.includes('Temp') || tag.name.includes('Pressure') ? 'emergency' : 'fault',
            description: `${tag.name} high alarm: ${value} ${tag.unit || ''} (max: ${tag.max})`,
            tag: tag.name,
            value,
            acknowledged: false,
          };
          this.alarmHistory.unshift(alarm);
          database.insertAlarm(alarm);
          this.emit('alarm', { alarm });
        } else if (value < tag.min) {
          const alarm: AlarmRecord = {
            id: crypto.randomUUID(),
            time: Date.now(),
            level: 'warning',
            description: `${tag.name} low alarm: ${value} ${tag.unit || ''} (min: ${tag.min})`,
            tag: tag.name,
            value,
            acknowledged: false,
          };
          this.alarmHistory.unshift(alarm);
          database.insertAlarm(alarm);
          this.emit('alarm', { alarm });
        }
      }
    }
  }

  private saveHistory(values: TagValue[], pollTimestamp: number): void {
    const records: HistoryRecord[] = values.map((tv) => ({
      id: crypto.randomUUID(),
      timestamp: new Date(pollTimestamp).toISOString(),
      tagName: tv.name,
      value: tv.value,
      unit: tv.unit || tv.tag.unit || '',
    }));
    database.insertHistory(records);
  }

  private writeAuditLog(tagName: string, writeValue: string): void {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: this.currentUserId,
      username: this.currentUsername,
      action: 'WRITE_TAG',
      target: tagName,
      value: writeValue,
      details: `Tag ${tagName} written with value ${writeValue}`,
    };
    database.insertAuditLog(log);
  }
}