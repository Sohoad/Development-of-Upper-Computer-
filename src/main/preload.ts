import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  PLCConfig,
  PLCStatus,
  TagConfig,
  PLCDataEvent,
  PLCConnectionChangeEvent,
  PLCAlarmEvent,
  Recipe,
  HistoryRecord,
  AuditLog,
  AppSettings,
  AdapterStatus,
} from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  platform: process.platform,
  plc: {
    connect: (config: PLCConfig) =>
      ipcRenderer.invoke('plc:connect', config),
    disconnect: () =>
      ipcRenderer.invoke('plc:disconnect'),
    getStatus: (): Promise<PLCStatus> =>
      ipcRenderer.invoke('plc:get-status'),
    getTags: (): Promise<TagConfig[]> =>
      ipcRenderer.invoke('plc:get-tags'),
    writeTag: (tagName: string, value: number | boolean) =>
      ipcRenderer.invoke('plc:write-tag', { tagName, value }),
    onData: (callback: (data: PLCDataEvent) => void) => {
      const handler = (_event: IpcRendererEvent, data: PLCDataEvent) => callback(data);
      ipcRenderer.on('plc:data', handler);
      return handler;
    },
    onConnectionChange: (callback: (status: PLCConnectionChangeEvent) => void) => {
      const handler = (_event: IpcRendererEvent, status: PLCConnectionChangeEvent) => callback(status);
      ipcRenderer.on('plc:connection-change', handler);
      return handler;
    },
    onAlarm: (callback: (event: PLCAlarmEvent) => void) => {
      const handler = (_event: IpcRendererEvent, event: PLCAlarmEvent) => callback(event);
      ipcRenderer.on('plc:alarm', handler);
      return handler;
    },
    removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
      ipcRenderer.removeListener(channel, callback);
    },
  },
  recipe: {
    getAll: (): Promise<Recipe[]> =>
      ipcRenderer.invoke('recipe:get-all'),
    add: (recipe: Recipe): Promise<Recipe> =>
      ipcRenderer.invoke('recipe:add', recipe),
    update: (id: string, updates: Partial<Recipe>): Promise<Recipe> =>
      ipcRenderer.invoke('recipe:update', id, updates),
    delete: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('recipe:delete', id),
  },
  audit: {
    query: (filters: { startTime?: string; endTime?: string; userId?: string; action?: string }): Promise<AuditLog[]> =>
      ipcRenderer.invoke('audit:query', filters),
    exportCSV: (): Promise<string> =>
      ipcRenderer.invoke('audit:export'),
  },
  db: {
    insertHistory: (records: HistoryRecord[]): Promise<void> =>
      ipcRenderer.invoke('db:insert-history', records),
    queryHistory: (tagNames: string[], startTime: string, endTime: string): Promise<HistoryRecord[]> =>
      ipcRenderer.invoke('db:query-history', tagNames, startTime, endTime),
  },
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:get'),
    save: (settings: AppSettings): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settings:save', settings),
  },
  protocol: {
    listAdapters: (): Promise<AdapterStatus[]> =>
      ipcRenderer.invoke('protocol:list-adapters'),
    getAdapterStatus: (name: string): Promise<AdapterStatus | null> =>
      ipcRenderer.invoke('protocol:get-adapter-status', name),
  },
  auth: {
    login: (username: string, password: string): Promise<{ id: string; username: string; role: 'operator' | 'engineer' | 'admin'; createdAt: string } | { error: string }> =>
      ipcRenderer.invoke('auth:login', username, password),
    getUsers: (): Promise<{ id: string; username: string; role: string; createdAt: string }[]> =>
      ipcRenderer.invoke('auth:get-users'),
    createUser: (username: string, password: string, role: string): Promise<{ id: string; username: string; role: string; createdAt: string } | { error: string }> =>
      ipcRenderer.invoke('auth:create-user', username, password, role),
    deleteUser: (userId: string): Promise<{ success: boolean } | { error: string }> =>
      ipcRenderer.invoke('auth:delete-user', userId),
    updateRole: (userId: string, role: string): Promise<{ success: boolean } | { error: string }> =>
      ipcRenderer.invoke('auth:update-role', userId, role),
  },
});