import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { PLCConfig } from '../../shared/types';

const CONFIG_FILENAME = 'plc-config.json';

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, CONFIG_FILENAME);
}

export interface StoredConfig {
  plc: PLCConfig;
  pollingInterval: number;
}

const defaultConfig: StoredConfig = {
  plc: {
    ip: '192.168.1.100',
    rack: 0,
    slot: 1,
  },
  pollingInterval: 500,
};

export function loadConfig(): StoredConfig {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoredConfig>;
      return {
        plc: { ...defaultConfig.plc, ...parsed.plc },
        pollingInterval: parsed.pollingInterval ?? defaultConfig.pollingInterval,
      };
    }
  } catch (err) {
    console.error('Failed to load PLC config:', err);
  }
  return { ...defaultConfig, plc: { ...defaultConfig.plc } };
}

export function saveConfig(config: StoredConfig): void {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save PLC config:', err);
  }
}