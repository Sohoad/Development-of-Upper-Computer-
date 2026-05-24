import { EventEmitter } from 'events';
import { ProtocolAdapter } from './ProtocolAdapter';
import { TagManager } from './TagManager';
import { DataBusData, AdapterStatus, TagValue } from '../../shared/types';

interface PollingState {
  timer: NodeJS.Timeout | null;
  interval: number;
  stats: {
    totalRequests: number;
    successCount: number;
    failCount: number;
    avgLatency: number;
    lastPollTime: number;
  };
}

export class DataBus extends EventEmitter {
  private adapters: Map<string, ProtocolAdapter> = new Map();
  private pollingStates: Map<string, PollingState> = new Map();

  registerAdapter(adapter: ProtocolAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter "${adapter.name}" is already registered`);
    }
    this.adapters.set(adapter.name, adapter);
    this.emit('adapter-added', { name: adapter.name, type: adapter.type });
  }

  unregisterAdapter(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Adapter "${name}" not found`);
    }
    this.stopPolling(name);
    this.adapters.delete(name);
    this.emit('adapter-removed', { name });
  }

  getAdapter(name: string): ProtocolAdapter | undefined {
    return this.adapters.get(name);
  }

  getAllAdapters(): ProtocolAdapter[] {
    return Array.from(this.adapters.values());
  }

  startPolling(adapterName: string, interval: number, tagManager: TagManager): void {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter "${adapterName}" not found`);
    }

    if (this.pollingStates.has(adapterName)) {
      return;
    }

    const state: PollingState = {
      timer: null,
      interval,
      stats: {
        totalRequests: 0,
        successCount: 0,
        failCount: 0,
        avgLatency: 0,
        lastPollTime: 0,
      },
    };

    const poll = async () => {
      if (!adapter.isConnected()) return;

      const tags = tagManager.getTags();
      if (tags.length === 0) return;

      const startTime = Date.now();
      state.stats.totalRequests++;

      try {
        const values = await adapter.readTags(tags);
        const latency = Date.now() - startTime;

        state.stats.successCount++;
        state.stats.lastPollTime = Date.now();
        state.stats.avgLatency =
          (state.stats.avgLatency * (state.stats.successCount - 1) + latency) /
          state.stats.successCount;

        const data: DataBusData = {
          adapterName,
          tags: values,
          timestamp: Date.now(),
          latency,
        };

        this.emit('data', data);
      } catch (err) {
        state.stats.failCount++;
        this.emit('error', { adapterName, error: err });
      }
    };

    poll();
    state.timer = setInterval(poll, interval);
    this.pollingStates.set(adapterName, state);
  }

  stopPolling(adapterName: string): void {
    const state = this.pollingStates.get(adapterName);
    if (state) {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
      this.pollingStates.delete(adapterName);
    }
  }

  getPollingStats(adapterName: string) {
    const state = this.pollingStates.get(adapterName);
    if (!state) {
      return {
        totalRequests: 0,
        successCount: 0,
        failCount: 0,
        avgLatency: 0,
        lastPollTime: 0,
      };
    }
    return { ...state.stats };
  }

  getAdapterStatus(name: string): AdapterStatus | null {
    const adapter = this.adapters.get(name);
    if (!adapter) return null;

    const stats = this.getPollingStats(name);
    let simulation = false;
    if ('isSimulation' in adapter && typeof (adapter as any).isSimulation === 'function') {
      simulation = (adapter as any).isSimulation();
    }

    return {
      name: adapter.name,
      type: adapter.type,
      connected: adapter.isConnected(),
      simulation,
      stats,
    };
  }

  getAllAdapterStatuses(): AdapterStatus[] {
    return this.getAllAdapters()
      .map((adapter) => this.getAdapterStatus(adapter.name)!)
      .filter(Boolean);
  }
}