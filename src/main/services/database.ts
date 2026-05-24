import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';
import type {
  HistoryRecord,
  AlarmRecord,
  AuditLog,
  Recipe,
} from '../../shared/types';

const dbFile = path.join(os.tmpdir(), 'hmi-database.json');

function writeDBFile(data: string): void {
  const tmpFile = dbFile + '.tmp';
  fs.writeFileSync(tmpFile, data, 'utf-8');
  fs.renameSync(tmpFile, dbFile);
}

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

function readDB(): DBSchema {
  try {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(raw) as DBSchema;
  } catch {
    return { ...DEFAULT_SCHEMA, recipes: [...DEFAULT_SCHEMA.recipes] };
  }
}

function writeDB(data: DBSchema): void {
  writeDBFile(JSON.stringify(data, null, 2));
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

class DatabaseService {
  private data: DBSchema;

  constructor() {
    this.data = readDB();
    const needsWrite = this.initializeRecipes();
    if (needsWrite) {
      this.flush();
    }
  }

  private flush(): void {
    writeDB(this.data);
  }

  private initializeRecipes(): boolean {
    if (this.data.recipes.length === 0) {
      this.data.recipes = createSampleRecipes();
      return true;
    }
    return false;
  }

  insertHistory(records: HistoryRecord[]): void {
    for (const record of records) {
      this.data.history.push(record);
    }
    this.flush();
  }

  queryHistory(tagNames: string[], startTime: string, endTime: string): HistoryRecord[] {
    let filtered = this.data.history;
    if (tagNames.length > 0) {
      filtered = filtered.filter((r) => tagNames.includes(r.tagName));
    }
    if (startTime) {
      filtered = filtered.filter((r) => r.timestamp >= startTime);
    }
    if (endTime) {
      filtered = filtered.filter((r) => r.timestamp <= endTime);
    }
    return deepClone(filtered);
  }

  insertAlarm(alarm: AlarmRecord): void {
    this.data.alarms.push(alarm);
    this.flush();
  }

  getAlarms(limit?: number): AlarmRecord[] {
    const alarms = [...this.data.alarms];
    if (limit && limit > 0) {
      return deepClone(alarms.slice(-limit));
    }
    return deepClone(alarms);
  }

  acknowledgeAlarm(alarmId: string): void {
    const alarm = this.data.alarms.find((a) => a.id === alarmId);
    if (alarm) {
      alarm.acknowledged = true;
      this.flush();
    }
  }

  insertAuditLog(log: AuditLog): void {
    this.data.auditLogs.push(log);
    this.flush();
  }

  queryAuditLogs(filters: {
    startTime?: string;
    endTime?: string;
    userId?: string;
    action?: string;
  }): AuditLog[] {
    let filtered = [...this.data.auditLogs];
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
    return deepClone(filtered);
  }

  saveRecipes(recipes: Recipe[]): void {
    this.data.recipes = recipes;
    this.flush();
  }

  getRecipes(): Recipe[] {
    return deepClone(this.data.recipes);
  }

  addRecipe(recipe: Recipe): void {
    this.data.recipes.push(recipe);
    this.flush();
  }

  updateRecipe(recipeId: string, updates: Partial<Recipe>): void {
    const index = this.data.recipes.findIndex((r) => r.id === recipeId);
    if (index !== -1) {
      this.data.recipes[index] = {
        ...this.data.recipes[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.flush();
    }
  }

  deleteRecipe(recipeId: string): void {
    const index = this.data.recipes.findIndex((r) => r.id === recipeId);
    if (index !== -1) {
      this.data.recipes.splice(index, 1);
      this.flush();
    }
  }
}

export const database = new DatabaseService();