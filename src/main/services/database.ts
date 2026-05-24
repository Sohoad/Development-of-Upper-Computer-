import { app } from 'electron';
import * as path from 'path';
import * as crypto from 'crypto';
import { JSONFileSyncPreset } from 'lowdb/node';
import type {
  HistoryRecord,
  AlarmRecord,
  AuditLog,
  Recipe,
} from '../../shared/types';

interface DBSchema {
  history: HistoryRecord[];
  alarms: AlarmRecord[];
  auditLogs: AuditLog[];
  recipes: Recipe[];
}

const DEFAULT_SCHEMA: DBSchema = {
  history: [],
  alarms: [],
  auditLogs: [],
  recipes: [],
};

function generateId(): string {
  return crypto.randomUUID();
}

function createSampleRecipes(): Recipe[] {
  const now = new Date().toISOString();

  const standardAnnealing: Recipe = {
    id: generateId(),
    name: '标准退火',
    number: 1,
    steps: [
      { stepNo: 1, runTime: 30, timeUnit: 'minute', controlMode: 'temperature', setTemp: 200 },
      { stepNo: 2, runTime: 60, timeUnit: 'minute', controlMode: 'temperature', setTemp: 600 },
      { stepNo: 3, runTime: 120, timeUnit: 'minute', controlMode: 'temperature', setTemp: 850 },
      { stepNo: 4, runTime: 30, timeUnit: 'minute', controlMode: 'temperature', setTemp: 850, pressureSet: 10, pressureUnit: 'Pa' },
      { stepNo: 5, runTime: 180, timeUnit: 'minute', controlMode: 'temperature', setTemp: 300 },
      { stepNo: 6, runTime: 60, timeUnit: 'minute', controlMode: 'temperature', setTemp: 100 },
    ],
    totalSteps: 6,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };

  const fastQuenching: Recipe = {
    id: generateId(),
    name: '快速淬火',
    number: 2,
    steps: [
      { stepNo: 1, runTime: 15, timeUnit: 'minute', controlMode: 'temperature', setTemp: 400 },
      { stepNo: 2, runTime: 45, timeUnit: 'minute', controlMode: 'temperature', setTemp: 1100 },
      { stepNo: 3, runTime: 10, timeUnit: 'minute', controlMode: 'temperature', setTemp: 1150, pressureSet: 50, pressureUnit: 'mBar' },
      { stepNo: 4, runTime: 5, timeUnit: 'minute', controlMode: 'power', powerSet: 480 },
      { stepNo: 5, runTime: 2, timeUnit: 'minute', controlMode: 'temperature', setTemp: 60 },
    ],
    totalSteps: 5,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };

  const lowTempTempering: Recipe = {
    id: generateId(),
    name: '低温回火',
    number: 3,
    steps: [
      { stepNo: 1, runTime: 20, timeUnit: 'minute', controlMode: 'temperature', setTemp: 100 },
      { stepNo: 2, runTime: 40, timeUnit: 'minute', controlMode: 'temperature', setTemp: 250 },
      { stepNo: 3, runTime: 90, timeUnit: 'minute', controlMode: 'temperature', setTemp: 350 },
      { stepNo: 4, runTime: 120, timeUnit: 'minute', controlMode: 'temperature', setTemp: 200 },
      { stepNo: 5, runTime: 30, timeUnit: 'minute', controlMode: 'temperature', setTemp: 80 },
    ],
    totalSteps: 5,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
  };

  return [standardAnnealing, fastQuenching, lowTempTempering];
}

function getDBPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'hmi-database.json');
}

class DatabaseService {
  private db: ReturnType<typeof JSONFileSyncPreset<DBSchema>>;

  constructor() {
    const dbPath = getDBPath();
    this.db = JSONFileSyncPreset<DBSchema>(dbPath, DEFAULT_SCHEMA);
    this.initializeRecipes();
  }

  private initializeRecipes(): void {
    if (this.db.data.recipes.length === 0) {
      this.db.data.recipes = createSampleRecipes();
      this.db.write();
    }
  }

  insertHistory(records: HistoryRecord[]): void {
    for (const record of records) {
      this.db.data.history.push(record);
    }
    this.db.write();
  }

  queryHistory(tagNames: string[], startTime: string, endTime: string): HistoryRecord[] {
    let filtered = this.db.data.history;
    if (tagNames.length > 0) {
      filtered = filtered.filter((r) => tagNames.includes(r.tagName));
    }
    if (startTime) {
      filtered = filtered.filter((r) => r.timestamp >= startTime);
    }
    if (endTime) {
      filtered = filtered.filter((r) => r.timestamp <= endTime);
    }
    return filtered;
  }

  insertAlarm(alarm: AlarmRecord): void {
    this.db.data.alarms.push(alarm);
    this.db.write();
  }

  getAlarms(limit?: number): AlarmRecord[] {
    const alarms = [...this.db.data.alarms];
    if (limit && limit > 0) {
      return alarms.slice(-limit);
    }
    return alarms;
  }

  acknowledgeAlarm(alarmId: string): void {
    const alarm = this.db.data.alarms.find((a) => a.id === alarmId);
    if (alarm) {
      alarm.acknowledged = true;
      this.db.write();
    }
  }

  insertAuditLog(log: AuditLog): void {
    this.db.data.auditLogs.push(log);
    this.db.write();
  }

  queryAuditLogs(filters: {
    startTime?: string;
    endTime?: string;
    userId?: string;
    action?: string;
  }): AuditLog[] {
    let filtered = [...this.db.data.auditLogs];
    if (filters.startTime) {
      filtered = filtered.filter((l) => l.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      filtered = filtered.filter((l) => l.timestamp <= filters.endTime!);
    }
    if (filters.userId) {
      filtered = filtered.filter((l) => l.userId === filters.userId);
    }
    if (filters.action) {
      filtered = filtered.filter((l) => l.action === filters.action);
    }
    return filtered;
  }

  saveRecipes(recipes: Recipe[]): void {
    this.db.data.recipes = recipes;
    this.db.write();
  }

  getRecipes(): Recipe[] {
    return this.db.data.recipes;
  }

  addRecipe(recipe: Recipe): void {
    this.db.data.recipes.push(recipe);
    this.db.write();
  }

  updateRecipe(recipeId: string, updates: Partial<Recipe>): void {
    const index = this.db.data.recipes.findIndex((r) => r.id === recipeId);
    if (index !== -1) {
      this.db.data.recipes[index] = {
        ...this.db.data.recipes[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.db.write();
    }
  }

  deleteRecipe(recipeId: string): void {
    const index = this.db.data.recipes.findIndex((r) => r.id === recipeId);
    if (index !== -1) {
      this.db.data.recipes.splice(index, 1);
      this.db.write();
    }
  }
}

export const database = new DatabaseService();