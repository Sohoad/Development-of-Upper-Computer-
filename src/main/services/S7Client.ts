import { EventEmitter } from 'events';
import { parseAddress, getAreaCode, getWordLenForType, getSizeForType, S7AreaCode, S7WordLen } from '../../shared/addressParser';

let Snap7Client: any = null;
let isRealMode = false;

try {
  const snap7 = require('node-snap7');
  Snap7Client = snap7.S7Client;
  isRealMode = true;
} catch {
  isRealMode = false;
}

class SimulatedMemory {
  private memory: Map<string, Buffer> = new Map();
  private baseTime: number = Date.now();

  private getKey(area: number, dbNumber: number, start: number): string {
    return `${area}:${dbNumber}:${start}`;
  }

  private generateData(size: number, area: number, start: number, dbNumber: number): Buffer {
    const buf = Buffer.alloc(size);
    const elapsed = (Date.now() - this.baseTime) / 1000;

    for (let i = 0; i < size; i++) {
      const addr = start + i;
      let val: number;

      if (dbNumber === 100 && area === S7AreaCode.DB) {
        if (addr >= 0 && addr < 12) {
          const zoneIndex = Math.floor(addr / 4);
          const baseTemps = [780, 950, 620];
          const variance = Math.sin(elapsed * 0.1 + zoneIndex) * 15;
          const raw = (baseTemps[zoneIndex] ?? 600) + variance;
          buf.writeFloatBE(Math.max(0, raw), i * 4);
          i += 3;
          continue;
        }
        if (addr === 12) {
          const pressure = 3.2 + Math.sin(elapsed * 0.05) * 0.3;
          buf.writeFloatBE(Math.max(0, pressure), 0);
          i += 3;
          continue;
        }
        if (addr === 16) {
          const power = 85 + Math.sin(elapsed * 0.08) * 5;
          buf.writeFloatBE(Math.max(0, power), 0);
          i += 3;
          continue;
        }
        if (addr === 20) {
          const current = 128 + Math.sin(elapsed * 0.12) * 8;
          buf.writeFloatBE(Math.max(0, current), 0);
          i += 3;
          continue;
        }
        if (addr === 24) {
          const voltage = 380 + Math.sin(elapsed * 0.03) * 5;
          buf.writeFloatBE(Math.max(0, voltage), 0);
          i += 3;
          continue;
        }
      }

      if (area === S7AreaCode.PE) {
        if (addr >= 0 && addr < 8) {
          const baseTemps = [780, 950, 620, 800];
          const idx = Math.floor(addr / 2);
          const temp = (baseTemps[idx] ?? 600) + Math.sin(elapsed * 0.1 + idx) * 10;
          const rawVal = Math.round(Math.max(0, temp) * 10);
          buf[i] = (rawVal >> 8) & 0xff;
          buf[i + 1] = rawVal & 0xff;
          i += 1;
          continue;
        }
        val = ((addr * 7 + area * 13) + Math.floor(elapsed) % 256) % 256;
      } else if (area === S7AreaCode.PA) {
        val = Math.floor(Math.abs(Math.sin(elapsed * 0.05 + addr)) * 256);
      } else if (area === S7AreaCode.MK) {
        val = Math.floor(Math.abs(Math.cos(elapsed * 0.03 + addr)) * 256);
      } else {
        val = ((addr * 7 + area * 13) + Math.floor(elapsed) % 256) % 256;
      }

      buf[i] = val & 0xff;
    }
    return buf;
  }

  get(area: number, dbNumber: number, start: number, size: number): Buffer {
    const key = this.getKey(area, dbNumber, start);
    if (!this.memory.has(key)) {
      this.memory.set(key, this.generateData(size, area, start, dbNumber));
    }
    const existing = this.memory.get(key)!;
    if (existing.length >= size) {
      return Buffer.from(existing.subarray(0, size));
    }
    this.memory.set(key, this.generateData(size, area, start, dbNumber));
    return Buffer.from(this.memory.get(key)!.subarray(0, size));
  }

  set(area: number, dbNumber: number, start: number, buffer: Buffer): void {
    const key = this.getKey(area, dbNumber, start);
    this.memory.set(key, Buffer.from(buffer));
  }
}

export class S7Client extends EventEmitter {
  private client: any = null;
  private _connected = false;
  private simulationMode = false;
  private simMemory = new SimulatedMemory();
  private connectionInfo: { ip: string; rack: number; slot: number } | null = null;

  constructor() {
    super();
    this.simulationMode = !isRealMode;
    if (isRealMode) {
      try {
        this.client = new Snap7Client();
      } catch {
        this.simulationMode = true;
      }
    }
  }

  async connect(ip: string, rack: number, slot: number): Promise<void> {
    this.connectionInfo = { ip, rack, slot };

    if (this.simulationMode) {
      await this.simulateDelay(30, 80);
      this._connected = true;
      this.emit('connected', { ip, rack, slot, simulation: true });
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.client.ConnectTo(ip, rack, slot, (err: any) => {
        if (err) {
          this._connected = false;
          this.emit('error', err);
          reject(new Error(typeof err === 'string' ? err : err.message || 'Connection failed'));
          return;
        }
        this._connected = true;
        this.emit('connected', { ip, rack, slot, simulation: false });
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.simulationMode) {
      this._connected = false;
      this.connectionInfo = null;
      this.emit('disconnected');
      return;
    }

    return new Promise<void>((resolve) => {
      if (this.client && this._connected) {
        this.client.Disconnect();
      }
      this._connected = false;
      this.connectionInfo = null;
      this.emit('disconnected');
      resolve();
    });
  }

  isConnected(): boolean {
    return this._connected;
  }

  isSimulation(): boolean {
    return this.simulationMode;
  }

  getConnectionInfo(): { ip: string; rack: number; slot: number } | null {
    return this.connectionInfo;
  }

  async readArea(
    area: number,
    dbNumber: number,
    start: number,
    amount: number,
    wordLen: number
  ): Promise<Buffer> {
    if (this.simulationMode) {
      await this.simulateDelay(5, 25);
      const size = this.calcReadSize(amount, wordLen);
      return this.simMemory.get(area, dbNumber, start, size);
    }

    return new Promise<Buffer>((resolve, reject) => {
      this.client.ReadArea(area, dbNumber, start, amount, wordLen, (err: any, data: Buffer) => {
        if (err) {
          reject(new Error(typeof err === 'string' ? err : err.message || 'ReadArea failed'));
          return;
        }
        resolve(data);
      });
    });
  }

  async writeArea(
    area: number,
    dbNumber: number,
    start: number,
    amount: number,
    wordLen: number,
    buffer: Buffer
  ): Promise<void> {
    if (this.simulationMode) {
      await this.simulateDelay(5, 25);
      this.simMemory.set(area, dbNumber, start, buffer);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.client.WriteArea(area, dbNumber, start, amount, wordLen, buffer, (err: any) => {
        if (err) {
          reject(new Error(typeof err === 'string' ? err : err.message || 'WriteArea failed'));
          return;
        }
        resolve();
      });
    });
  }

  async readDB(dbNumber: number, start: number, size: number): Promise<Buffer> {
    if (this.simulationMode) {
      await this.simulateDelay(5, 25);
      return this.simMemory.get(S7AreaCode.DB, dbNumber, start, size);
    }

    return new Promise<Buffer>((resolve, reject) => {
      this.client.DBRead(dbNumber, start, size, (err: any, data: Buffer) => {
        if (err) {
          reject(new Error(typeof err === 'string' ? err : err.message || 'DBRead failed'));
          return;
        }
        resolve(data);
      });
    });
  }

  async writeDB(dbNumber: number, start: number, size: number, buffer: Buffer): Promise<void> {
    if (this.simulationMode) {
      await this.simulateDelay(5, 25);
      this.simMemory.set(S7AreaCode.DB, dbNumber, start, buffer);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.client.DBWrite(dbNumber, start, size, buffer, (err: any) => {
        if (err) {
          reject(new Error(typeof err === 'string' ? err : err.message || 'DBWrite failed'));
          return;
        }
        resolve();
      });
    });
  }

  async readMulti(
    requests: { area: number; dbNumber: number; start: number; size: number }[]
  ): Promise<Buffer[]> {
    if (this.simulationMode) {
      await this.simulateDelay(10, 40);
      return requests.map((req) => this.simMemory.get(req.area, req.dbNumber, req.start, req.size));
    }

    return Promise.all(
      requests.map((req) => this.readArea(req.area, req.dbNumber, req.start, req.size, S7WordLen.BYTE))
    );
  }

  async readTagByAddress(addr: string): Promise<Buffer> {
    const parsed = parseAddress(addr);
    if (!parsed) {
      throw new Error(`Invalid S7 address: ${addr}`);
    }
    return this.readArea(parsed.areaCode, parsed.dbNumber, parsed.start, parsed.size, parsed.wordLen);
  }

  async writeTagByAddress(addr: string, value: number | boolean): Promise<void> {
    const parsed = parseAddress(addr);
    if (!parsed) {
      throw new Error(`Invalid S7 address: ${addr}`);
    }

    const buf = Buffer.alloc(parsed.size);
    if (parsed.type === 'bool') {
      buf[0] = value ? 1 : 0;
    } else if (parsed.type === 'byte') {
      buf[0] = typeof value === 'number' ? value & 0xff : 0;
    } else if (parsed.type === 'word') {
      const v = typeof value === 'number' ? value & 0xffff : 0;
      buf[0] = (v >> 8) & 0xff;
      buf[1] = v & 0xff;
    } else if (parsed.type === 'real' || parsed.type === 'dword') {
      if (typeof value === 'number') {
        buf.writeFloatBE(value, 0);
      }
    }

    if (parsed.area === 'DB') {
      await this.writeDB(parsed.dbNumber, parsed.start, parsed.size, buf);
    } else {
      await this.writeArea(parsed.areaCode, parsed.dbNumber, parsed.start, parsed.size, parsed.wordLen, buf);
    }
  }

  private calcReadSize(amount: number, wordLen: number): number {
    switch (wordLen) {
      case S7WordLen.BIT:
        return Math.ceil(amount / 8);
      case S7WordLen.BYTE:
        return amount;
      case S7WordLen.WORD:
        return amount * 2;
      case S7WordLen.DWORD:
        return amount * 4;
      case S7WordLen.REAL:
        return amount * 4;
      default:
        return amount;
    }
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min) + min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}