import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as http from 'http';
import { PLCService } from './services/PLCService';
import { database } from './services/database';
import { loadConfig, saveConfig } from './services/configStore';
import { loadSettings, saveSettings, AppSettings } from './services/settingsStore';
import {
  PLCConfig,
  PLCStatus,
  TagConfig,
  PLCDataEvent,
  PLCConnectionChangeEvent,
  PLCAlarmEvent,
  WriteTagRequest,
  HistoryRecord,
  Recipe,
  AuditLog,
  AdapterStatus,
} from '../shared/types';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let plcService: PLCService | null = null;

function waitForVite(url: string, retries = 30, interval = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (attempts >= retries) {
            reject(new Error(`Vite dev server not ready after ${retries} retries`));
          } else {
            setTimeout(check, interval);
          }
        });
    };
    check();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Industrial HMI',
    backgroundColor: '#141414',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
    waitForVite('http://localhost:5173')
      .then(() => {
        mainWindow?.loadURL('http://localhost:5173');
      })
      .catch((err) => {
        console.error('Failed to connect to Vite dev server:', err.message);
        app.quit();
      });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function initPLCService(): void {
  plcService = new PLCService();

  plcService.on('data', (data: PLCDataEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('plc:data', data);
    }
  });

  plcService.on('connection-change', (event: PLCConnectionChangeEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('plc:connection-change', event);
    }
  });

  plcService.on('alarm', (event: PLCAlarmEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('plc:alarm', event);
    }
  });

  plcService.on('error', (err: { message: string; timestamp: number }) => {
    console.error('[PLC Error]', err);
  });

  plcService.start();
}

function registerIPCHandlers(): void {
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
    };
  });

  ipcMain.handle('plc:connect', async (_event, config: PLCConfig) => {
    try {
      if (!plcService) return { success: false, simulation: false };
      const result = await plcService.connect(config.ip, config.rack, config.slot);
      saveConfig({ plc: config, pollingInterval: 500 });
      return result;
    } catch (err) {
      console.error('[PLC Connect Error]', err);
      return { success: false, simulation: false };
    }
  });

  ipcMain.handle('plc:disconnect', async () => {
    try {
      if (!plcService) return { success: false };
      await plcService.disconnect();
      return { success: true };
    } catch (err) {
      console.error('[PLC Disconnect Error]', err);
      return { success: false };
    }
  });

  ipcMain.handle('plc:get-status', (): PLCStatus => {
    if (!plcService) {
      return {
        config: null,
        connection: {
          connected: false,
          latency: 0,
          lastError: '',
          reconnectAttempt: 0,
          simulation: true,
        },
        stats: {
          totalRequests: 0,
          successCount: 0,
          failCount: 0,
          avgLatency: 0,
          lastPollTime: 0,
        },
      };
    }
    return plcService.getStatus();
  });

  ipcMain.handle('plc:get-tags', (): TagConfig[] => {
    if (!plcService) return [];
    return plcService.getTags();
  });

  ipcMain.handle('plc:write-tag', async (_event, request: WriteTagRequest) => {
    try {
      if (!plcService) return { success: false };
      return await plcService.writeTag(request.tagName, request.value);
    } catch (err) {
      console.error('[PLC WriteTag Error]', err);
      return { success: false };
    }
  });

  ipcMain.handle('db:insert-history', (_event, records: HistoryRecord[]) => {
    database.insertHistory(records);
  });

  ipcMain.handle('db:query-history', (_event, tagNames: string[], startTime: string, endTime: string): HistoryRecord[] => {
    return database.queryHistory(tagNames, startTime, endTime);
  });

  ipcMain.handle('audit:query', (_event, filters: { startTime?: string; endTime?: string; userId?: string; action?: string }) => {
    return database.queryAuditLogs(filters);
  });

  ipcMain.handle('audit:export', () => {
    const allLogs = database.queryAuditLogs({});
    const header = 'id,timestamp,userId,username,action,target,value,details';
    const rows = allLogs.map((log) =>
      [log.id, log.timestamp, log.userId, log.username, log.action, log.target, log.value, log.details]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header, ...rows].join('\n');
  });

  ipcMain.handle('db:insert-audit', (_event, log: AuditLog) => {
    database.insertAuditLog(log);
  });

  ipcMain.handle('recipe:get-all', (): Recipe[] => {
    return database.getRecipes();
  });

  ipcMain.handle('recipe:add', (_event, recipe: Recipe): Recipe => {
    database.addRecipe(recipe);
    return recipe;
  });

  ipcMain.handle('recipe:update', (_event, id: string, updates: Partial<Recipe>): Recipe | null => {
    const recipes = database.getRecipes();
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return null;
    const updated = { ...recipe, ...updates, updatedAt: new Date().toISOString() };
    database.updateRecipe(id, updates);
    return updated;
  });

  ipcMain.handle('recipe:delete', (_event, id: string): { success: boolean } => {
    database.deleteRecipe(id);
    return { success: true };
  });

  ipcMain.handle('settings:get', (): AppSettings => {
    return loadSettings();
  });

  ipcMain.handle('settings:save', (_event, settings: AppSettings): { success: boolean } => {
    saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle('protocol:list-adapters', (): AdapterStatus[] => {
    if (!plcService) return [];
    return plcService.getDataBus().getAllAdapterStatuses();
  });

  ipcMain.handle('protocol:get-adapter-status', (_event, name: string): AdapterStatus | null => {
    if (!plcService) return null;
    return plcService.getDataBus().getAdapterStatus(name);
  });
}

app.whenReady().then(() => {
  initPLCService();
  registerIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (plcService) {
    await plcService.stop();
  }
});