import { EventEmitter } from 'events';

const S7AreaPE = 0x81;
const S7AreaPA = 0x82;
const S7AreaMK = 0x83;
const S7AreaDB = 0x84;
const S7AreaCT = 0x1c;
const S7AreaTM = 0x1d;

const S7WLBit = 0x01;
const S7WLByte = 0x02;
const S7WLWord = 0x04;
const S7WLDWord = 0x06;
const S7WLReal = 0x08;

let Snap7Client: any = null;
let isRealMode = false;

try {
  const snap7 = require('node-snap7');
  Snap7Client = snap7.S7Client;
  isRealMode = true;
} catch {
  isRealMode = false;
}

function parseArea(area: string): number {
  switch (area.toUpperCase()) {
    case 'I':
    case 'INPUT':
      return S7AreaPE;
    case 'Q':
    case 'OUTPUT':
      return S7AreaPA;
    case 'M':
    case 'MARKER':
      return S7AreaMK;
    case 'DB':
    case 'DATABLOCK':
      return S7AreaDB;
    case 'CT':
    case 'COUNTER':
      return S7AreaCT;
    case 'TM':
    case 'TIMER':
      return S7AreaTM;
    default:
      return S7AreaDB;
  }
}

function parseWordLen(type: string): number {
  switch (type.toLowerCase()) {
    case 'bool':
      return S7WLBit;
    case 'byte':
      return S7WLByte;
    case 'word':
      return S7WLWord;
    case 'dword':
      return S7WLDWord;
    case 'real':
      return S7WLReal;
    default:
      return S7WLByte;
  }
}

class SimulatedMemory {
  private memory: Map<string, Buffer> = new Map();

  private getKey(area: number, dbNumber: number, start: number): string {
    return `${area}:${dbNumber}:${start}`;
  }

  private generateData(size: number, area: number, start: number): Buffer {
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buf[i] = ((start + i) * 7 + area * 13 + Math.floor(Date.now() / 1000) % 256) % 256;
    }
    return buf;
  }

  get(area: number, dbNumber: number, start: number, size: number): Buffer {
    const key = this.getKey(area, dbNumber, start);
    if (!this.memory.has(key)) {
      this.memory.set(key, this.generateData(size, area, start));
    }
    const existing = this.memory.get(key)!;
    if (existing.length >= size) {
      return Buffer.from(existing.subarray(0, size));
    }
    this.memory.set(key, this.generateData(size, area, start));
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
      this.emit('disconnected');
      return;
    }

    return new Promise<void>((resolve) => {
      if (this.client && this._connected) {
        this.client.Disconnect();
      }
      this._connected = false;
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
      return this.simMemory.get(S7AreaDB, dbNumber, start, size);
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
      this.simMemory.set(S7AreaDB, dbNumber, start, buffer);
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

  private calcReadSize(amount: number, wordLen: number): number {
    switch (wordLen) {
      case S7WLBit:
        return Math.ceil(amount / 8);
      case S7WLByte:
        return amount;
      case S7WLWord:
        return amount * 2;
      case S7WLDWord:
        return amount * 4;
      case S7WLReal:
        return amount * 4;
      default:
        return amount;
    }
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min) + min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static parseArea = parseArea;
  static parseWordLen = parseWordLen;
}