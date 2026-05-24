import { create } from 'zustand';
import type {
  PLCConfig,
  ConnectionStatus,
  TagValue,
  TagConfig,
  AlarmRecord,
} from '@shared/types';

interface PLCState {
  connectionStatus: ConnectionStatus;
  tagValues: Map<string, TagValue>;
  alarms: AlarmRecord[];
  tags: TagConfig[];

  connect: (config: PLCConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  setConnectionStatus: (status: ConnectionStatus) => void;
  updateTagValues: (values: TagValue[]) => void;
  addAlarm: (alarm: AlarmRecord) => void;
  acknowledgeAlarm: (alarmId: string) => void;
  writeTag: (tagName: string, value: number | boolean) => Promise<void>;
  initListeners: () => void;
  destroyListeners: () => void;
}

const defaultConnectionStatus: ConnectionStatus = {
  connected: false,
  latency: 0,
  lastError: '',
  reconnectAttempt: 0,
  simulation: true,
};

const handlers: {
  dataHandler?: (...args: unknown[]) => void;
  connectionHandler?: (...args: unknown[]) => void;
  alarmHandler?: (...args: unknown[]) => void;
} = {};

export const usePLCStore = create<PLCState>((set, get) => ({
  connectionStatus: { ...defaultConnectionStatus },
  tagValues: new Map(),
  alarms: [],
  tags: [],

  connect: async (config: PLCConfig) => {
    try {
      await window.electronAPI.plc.connect(config);
    } catch (err) {
      console.error('[PLCStore] connect error:', err);
    }
  },

  disconnect: async () => {
    try {
      await window.electronAPI.plc.disconnect();
    } catch (err) {
      console.error('[PLCStore] disconnect error:', err);
    }
  },

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  updateTagValues: (values: TagValue[]) => {
    const newMap = new Map(get().tagValues);
    for (const tv of values) {
      newMap.set(tv.name, tv);
    }
    set({ tagValues: newMap });
  },

  addAlarm: (alarm: AlarmRecord) => {
    set((state) => ({ alarms: [alarm, ...state.alarms] }));
  },

  acknowledgeAlarm: (alarmId: string) => {
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === alarmId ? { ...a, acknowledged: true } : a
      ),
    }));
  },

  writeTag: async (tagName: string, value: number | boolean) => {
    try {
      await window.electronAPI.plc.writeTag(tagName, value);
    } catch (err) {
      console.error('[PLCStore] writeTag error:', err);
    }
  },

  initListeners: () => {
    handlers.dataHandler = window.electronAPI.plc.onData((data) => {
      get().updateTagValues(data.values);
    });

    handlers.connectionHandler = window.electronAPI.plc.onConnectionChange((status) => {
      set({ connectionStatus: status });
    });

    handlers.alarmHandler = window.electronAPI.plc.onAlarm((event) => {
      get().addAlarm(event.alarm);
    });
  },

  destroyListeners: () => {
    if (handlers.dataHandler) {
      window.electronAPI.plc.removeListener('plc:data', handlers.dataHandler);
    }
    if (handlers.connectionHandler) {
      window.electronAPI.plc.removeListener('plc:connection-change', handlers.connectionHandler);
    }
    if (handlers.alarmHandler) {
      window.electronAPI.plc.removeListener('plc:alarm', handlers.alarmHandler);
    }
  },
}));