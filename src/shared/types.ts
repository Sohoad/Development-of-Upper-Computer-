export type AdapterType = 's7' | 'opcua' | 'mqtt';

export interface AdapterStatus {
  name: string;
  type: AdapterType;
  connected: boolean;
  simulation: boolean;
  stats: PollingStats;
}

export interface DataBusData {
  adapterName: string;
  tags: TagValue[];
  timestamp: number;
  latency: number;
}

export interface AppInfo {
  version: string;
  platform: string;
  nodeVersion: string;
  electronVersion: string;
}

export interface PLCConfig {
  ip: string;
  rack: number;
  slot: number;
  pollingInterval?: number;
  simulationMode?: boolean;
  reconnectDelay?: number;
  maxRetries?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  latency: number;
  lastError: string;
  reconnectAttempt: number;
  simulation: boolean;
}

export interface TagConfig {
  name: string;
  address: string;
  area: string;
  dbNumber?: number;
  start: number;
  size: number;
  type: 'bool' | 'byte' | 'word' | 'dword' | 'real';
  unit?: string;
  group?: string;
  min?: number;
  max?: number;
  description?: string;
}

export interface TagValue {
  name: string;
  value: number | boolean;
  rawValue: Buffer;
  unit?: string;
  timestamp: number;
  quality: boolean;
  tag: TagConfig;
}

export interface AlarmRecord {
  id: string;
  time: number;
  level: 'warning' | 'fault' | 'emergency';
  tag: string;
  description: string;
  value: number | boolean;
  acknowledged: boolean;
}

export interface RecipeStep {
  stepNo: number;
  runTime: number;
  timeUnit: 'second' | 'minute';
  controlMode: 'temperature' | 'power';
  setTemp?: number;
  powerSet?: number;
  pressureSet?: number;
  pressureUnit?: 'Pa' | 'mBar';
}

export interface Recipe {
  id: string;
  name: string;
  number: number;
  steps: RecipeStep[];
  totalSteps: number;
  status: 'ready' | 'running' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  target: string;
  value: string;
  details: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  tagName: string;
  value: number | boolean;
  unit: string;
}

export interface PLCDataEvent {
  timestamp: number;
  latency: number;
  values: TagValue[];
}

export interface PLCConnectionChangeEvent {
  connected: boolean;
  latency: number;
  lastError: string;
  reconnectAttempt: number;
  simulation: boolean;
}

export interface PLCAlarmEvent {
  alarm: AlarmRecord;
}

export interface PollingStats {
  totalRequests: number;
  successCount: number;
  failCount: number;
  avgLatency: number;
  lastPollTime: number;
}

export interface PLCStatus {
  config: PLCConfig | null;
  connection: ConnectionStatus;
  stats: PollingStats;
}

export interface WriteTagRequest {
  tagName: string;
  value: number | boolean;
}

export type UserRole = 'operator' | 'engineer' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthAPI {
  login(username: string, password: string): Promise<User | { error: string }>;
  getUsers(): Promise<User[] | { error: string }>;
  createUser(username: string, password: string, role: UserRole): Promise<User | { error: string }>;
  deleteUser(userId: string): Promise<{ success: boolean } | { error: string }>;
  updateRole(userId: string, role: UserRole): Promise<{ success: boolean } | { error: string }>;
}

export const ROLE_PERMISSIONS = {
  operator: {
    canView: true,
    canOperateRecipes: false,
    canManualControl: false,
    canManageUsers: false,
  },
  engineer: {
    canView: true,
    canOperateRecipes: true,
    canManualControl: true,
    canManageUsers: false,
  },
  admin: {
    canView: true,
    canOperateRecipes: true,
    canManualControl: true,
    canManageUsers: true,
  },
} as const;

export interface AppSettings {
  pollInterval: number;
  historySaveInterval: number;
  alarmCheckEnabled: boolean;
  tagMappings?: TagMapping;
}

export interface TagMapping {
  monitorTemperature: string;
  monitorPressure: string;
  monitorPower: string;
  monitorCurrent: string;
  monitorVoltage: string;
  monitorFlowRate: string;
  monitorFrequency: string;
  monitorStatusCode: string;
}

export const DEFAULT_TAG_MAPPINGS: TagMapping = {
  monitorTemperature: 'furnace.temp_zone2',
  monitorPressure: 'furnace.pressure',
  monitorPower: 'furnace.power',
  monitorCurrent: 'furnace.current',
  monitorVoltage: 'furnace.voltage',
  monitorFlowRate: 'furnace.flow_rate',
  monitorFrequency: 'furnace.frequency',
  monitorStatusCode: 'furnace.status_code',
};

export interface AvailableTag {
  name: string;
  address: string;
  type: string;
}

export interface TagFormData {
  name: string;
  address: string;
  type: 'bool' | 'byte' | 'word' | 'dword' | 'real';
  unit: string;
  group: string;
  min: number;
  max: number;
  description: string;
}

export interface ElectronAPI {
  getAppInfo: () => Promise<AppInfo>;
  platform: string;
  auth: {
    login: (username: string, password: string) => Promise<User | { error: string }>;
    getUsers: () => Promise<User[] | { error: string }>;
    createUser: (username: string, password: string, role: string) => Promise<User | { error: string }>;
    deleteUser: (userId: string) => Promise<{ success: boolean } | { error: string }>;
    updateRole: (userId: string, role: string) => Promise<User | { error: string }>;
  };
  plc: {
    connect: (config: PLCConfig) => Promise<{ success: boolean; simulation: boolean }>;
    disconnect: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<PLCStatus>;
    getTags: () => Promise<TagConfig[]>;
    writeTag: (tagName: string, value: number | boolean) => Promise<{ success: boolean }>;
    onData: (callback: (data: PLCDataEvent) => void) => (...args: unknown[]) => void;
    onConnectionChange: (callback: (status: PLCConnectionChangeEvent) => void) => (...args: unknown[]) => void;
    onAlarm: (callback: (event: PLCAlarmEvent) => void) => (...args: unknown[]) => void;
    removeListener: (channel: string, callback: (...args: unknown[]) => void) => void;
  };
  recipe: {
    getAll: () => Promise<Recipe[]>;
    add: (recipe: Recipe) => Promise<Recipe>;
    update: (id: string, updates: Partial<Recipe>) => Promise<Recipe>;
    delete: (id: string) => Promise<{ success: boolean }>;
  };
  audit: {
    query: (filters: { startTime?: string; endTime?: string; userId?: string; action?: string }) => Promise<AuditLog[]>;
    exportCSV: () => Promise<string>;
  };
  db: {
    insertHistory: (records: HistoryRecord[]) => Promise<void>;
    queryHistory: (tagNames: string[], startTime: string, endTime: string) => Promise<HistoryRecord[]>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    save: (settings: AppSettings) => Promise<{ success: boolean }>;
  };
  protocol: {
    listAdapters: () => Promise<AdapterStatus[]>;
    getAdapterStatus: (name: string) => Promise<AdapterStatus | null>;
  };
  tags: {
    getAll: () => Promise<TagConfig[]>;
    add: (tag: TagConfig) => Promise<{ success: boolean }>;
    remove: (name: string) => Promise<{ success: boolean }>;
    update: (name: string, tag: Partial<TagConfig>) => Promise<{ success: boolean }>;
    getAvailable: () => Promise<AvailableTag[]>;
  };
}