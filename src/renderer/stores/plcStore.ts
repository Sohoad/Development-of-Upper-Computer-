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

let simTimer: ReturnType<typeof setInterval> | null = null;
let alarmTimer: ReturnType<typeof setTimeout> | null = null;
let alarmIdCounter = 0;

function startSimulation(set: (fn: (state: PLCState) => Partial<PLCState>) => void, get: () => PLCState) {
  const baseValues: Record<string, { value: number; base: number; variance: number }> = {
    'furnace.temp_zone1': { value: 780, base: 780, variance: 15 },
    'furnace.temp_zone2': { value: 950, base: 950, variance: 10 },
    'furnace.temp_zone3': { value: 620, base: 620, variance: 20 },
    'furnace.pressure': { value: 3.2, base: 3.2, variance: 0.3 },
    'furnace.power': { value: 85, base: 85, variance: 5 },
    'furnace.current': { value: 128, base: 128, variance: 8 },
    'furnace.voltage': { value: 380, base: 380, variance: 5 },
    'furnace.flow_rate': { value: 45, base: 45, variance: 3 },
    'furnace.frequency': { value: 50, base: 50, variance: 1 },
    'furnace.status_code': { value: 0, base: 0, variance: 0 },
  };

  set((state) => ({
    connectionStatus: { ...state.connectionStatus, connected: true, simulation: true },
  }));

  const initialValues: TagValue[] = Object.entries(baseValues).map(([name, cfg]) => ({
    name,
    value: cfg.base,
    quality: 'good',
    timestamp: Date.now(),
  }));
  set((state) => {
    const newMap = new Map(state.tagValues);
    for (const tv of initialValues) {
      newMap.set(tv.name, tv);
    }
    return { tagValues: newMap };
  });

  if (simTimer) clearInterval(simTimer);
  simTimer = setInterval(() => {
    const updates: TagValue[] = Object.entries(baseValues).map(([name, cfg]) => {
      const drift = (Math.random() - 0.5) * 2 * cfg.variance;
      const val = Math.max(0, Number((cfg.base + drift).toFixed(1)));
      cfg.value = val;
      return {
        name,
        value: val,
        quality: 'good',
        timestamp: Date.now(),
      };
    });

    get().updateTagValues(updates);
  }, 1000);

  function scheduleAlarm() {
    alarmTimer = setTimeout(() => {
      alarmIdCounter++;
      const levels: Array<'warning' | 'fault' | 'emergency'> = ['warning', 'fault', 'emergency'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const descriptions: Record<string, string> = {
        warning: '温度波动超出正常范围',
        fault: '传感器通讯异常',
        emergency: '炉压超过安全阈值',
      };
      const alarm: AlarmRecord = {
        id: `sim-${alarmIdCounter}`,
        time: Date.now(),
        level,
        description: descriptions[level] || '未知告警',
        tag: 'furnace.temp_zone2',
        value: baseValues['furnace.temp_zone2'].value,
        acknowledged: false,
      };
      get().addAlarm(alarm);
      scheduleAlarm();
    }, 8000 + Math.random() * 12000);
  }
  scheduleAlarm();
}

function stopSimulation() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  if (alarmTimer) {
    clearTimeout(alarmTimer);
    alarmTimer = null;
  }
}

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
    set((state) => {
      const exists = state.alarms.some((a) => a.tag === alarm.tag && a.level === alarm.level && !a.acknowledged);
      if (exists) return state;
      return { alarms: [alarm, ...state.alarms] };
    });
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
    if (!window.electronAPI) {
      startSimulation(set, get);
      return;
    }
    handlers.dataHandler = window.electronAPI.plc.onData((data) => {
      get().updateTagValues(data.values);
    });

    handlers.connectionHandler = window.electronAPI.plc.onConnectionChange((status) => {
      if (!status.connected) {
        set({ alarms: [], tagValues: new Map() });
      }
      set({ connectionStatus: status });
    });

    handlers.alarmHandler = window.electronAPI.plc.onAlarm((event) => {
      get().addAlarm(event.alarm);
    });
  },

  destroyListeners: () => {
    if (!window.electronAPI) {
      stopSimulation();
      return;
    }
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