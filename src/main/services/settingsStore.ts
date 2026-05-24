import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { AppSettings, TagMapping, DEFAULT_TAG_MAPPINGS } from '../../shared/types';

const SETTINGS_FILENAME = 'settings.json';

const defaultSettings: AppSettings = {
  pollInterval: 500,
  historySaveInterval: 10,
  alarmCheckEnabled: true,
};

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, SETTINGS_FILENAME);
}

export function loadSettings(): AppSettings {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        pollInterval: parsed.pollInterval ?? defaultSettings.pollInterval,
        historySaveInterval: parsed.historySaveInterval ?? defaultSettings.historySaveInterval,
        alarmCheckEnabled: parsed.alarmCheckEnabled ?? defaultSettings.alarmCheckEnabled,
        tagMappings: parsed.tagMappings ? { ...DEFAULT_TAG_MAPPINGS, ...parsed.tagMappings } : { ...DEFAULT_TAG_MAPPINGS },
      };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return { ...defaultSettings, tagMappings: { ...DEFAULT_TAG_MAPPINGS } };
}

export function saveSettings(settings: AppSettings): void {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}