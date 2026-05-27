import { TagConfig, TagFormData, AvailableTag } from './types';

export interface ElectronAPI {
  getAppInfo: () => Promise<import('./types').AppInfo>;
  platform: string;
  auth: {
    login: (username: string, password: string) => Promise<import('./types').User | { error: string }>;
    getUsers: () => Promise<import('./types').User[] | { error: string }>;
    createUser: (username: string, password: string, role: string) => Promise<import('./types').User | { error: string }>;
    deleteUser: (userId: string) => Promise<{ success: boolean } | { error: string }>;
    updateRole: (userId: string, role: string) => Promise<import('./types').User | { error: string }>;
  };
  plc: {
    connect: (config: import('./types').PLCConfig) => Promise<{ success: boolean; simulation: boolean }>;
    disconnect: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<import('./types').PLCStatus>;
    getTags: () => Promise<TagConfig[]>;
    writeTag: (tagName: string, value: number | boolean) => Promise<{ success: boolean }>;
    onData: (callback: (data: import('./types').PLCDataEvent) => void) => (...args: unknown[]) => void;
    onConnectionChange: (callback: (status: import('./types').PLCConnectionChangeEvent) => void) => (...args: unknown[]) => void;
    onAlarm: (callback: (event: import('./types').PLCAlarmEvent) => void) => (...args: unknown[]) => void;
    removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
  };
  recipe: {
    getAll: () => Promise<import('./types').Recipe[]>;
    add: (recipe: import('./types').Recipe) => Promise<import('./types').Recipe>;
    update: (id: string, updates: Partial<import('./types').Recipe>) => Promise<import('./types').Recipe>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  audit: {
    query: (filters: { startTime?: string; endTime?: string; userId?: string; action?: string }) => Promise<import('./types').AuditLog[]>;
    exportCSV: () => Promise<string>;
  };
  db: {
    insertHistory: (records: import('./types').HistoryRecord[]) => Promise<void>;
    queryHistory: (tagNames: string[], startTime: string, endTime: string) => Promise<import('./types').HistoryRecord[]>;
  };
  settings: {
    get: () => Promise<import('./types').AppSettings>;
    save: (settings: import('./types').AppSettings) => Promise<{ success: boolean }>;
  };
  protocol: {
    listAdapters: () => Promise<import('./types').AdapterStatus[]>;
    getAdapterStatus: (name: string) => Promise<import('./types').AdapterStatus | null>;
  };
  tags: {
    getAll: () => Promise<TagConfig[]>;
    add: (tag: TagConfig) => Promise<{ success: boolean }>;
    remove: (name: string) => Promise<{ success: boolean }>;
    update: (name: string, tag: Partial<TagConfig>) => Promise<{ success: boolean }>;
    getAvailable: () => Promise<AvailableTag[]>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}