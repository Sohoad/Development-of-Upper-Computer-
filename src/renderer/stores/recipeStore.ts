import { create } from 'zustand';
import type { Recipe } from '@shared/types';

interface RecipeState {
  recipes: Recipe[];
  selectedRecipe: Recipe | null;
  isRunning: boolean;

  loadRecipes: () => Promise<void>;
  selectRecipe: (id: string) => void;
  addRecipe: (recipe: Recipe) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  importRecipes: (filePath: string) => Promise<void>;
  exportRecipes: (id: string, format: 'json' | 'csv') => Promise<void>;
  startRecipe: () => void;
  pauseRecipe: () => void;
  stopRecipe: () => void;
  jumpToStep: (stepNo: number) => void;
  singleStep: () => void;
}

function parseImportContent(content: string): Partial<Recipe>[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    const nameIdx = headers.findIndex((h) => h.toLowerCase() === 'name');
    const numberIdx = headers.findIndex((h) => h.toLowerCase() === 'number');
    const stepsIdx = headers.findIndex((h) => h.toLowerCase() === 'steps');
    const results: Partial<Recipe>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const entry: Partial<Recipe> = {};
      if (nameIdx >= 0) entry.name = values[nameIdx];
      if (numberIdx >= 0) entry.number = parseInt(values[numberIdx], 10) || 0;
      if (stepsIdx >= 0 && values[stepsIdx]) {
        try {
          entry.steps = JSON.parse(values[stepsIdx]);
          entry.totalSteps = entry.steps?.length || 0;
        } catch {
          entry.steps = [];
          entry.totalSteps = 0;
        }
      }
      results.push(entry);
    }
    return results;
  }
}

function generateRecipeCSV(recipe: Recipe): string {
  const headers = ['id', 'name', 'number', 'totalSteps', 'status', 'steps'];
  const row = [
    recipe.id,
    recipe.name,
    String(recipe.number),
    String(recipe.totalSteps),
    recipe.status,
    JSON.stringify(recipe.steps),
  ];
  return [headers.join(','), row.join(',')].join('\n');
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  selectedRecipe: null,
  isRunning: false,

  loadRecipes: async () => {
    try {
      if (!window.electronAPI) {
        const demoRecipes: Recipe[] = [
          {
            id: 'demo-1', name: '标准退火工艺', number: 1, totalSteps: 4, status: 'ready',
            steps: [
              { stepNo: 1, name: '升温', description: '以 5°C/min 升温至 800°C', targetTemp: 800, holdTime: 30, rampRate: 5, pressure: 1.0, gasValves: [] },
              { stepNo: 2, name: '保温', description: '800°C 恒温', targetTemp: 800, holdTime: 120, rampRate: 0, pressure: 0.5, gasValves: [] },
              { stepNo: 3, name: '降温', description: '自然冷却至 200°C', targetTemp: 200, holdTime: 0, rampRate: 0, pressure: 0.0, gasValves: [] },
              { stepNo: 4, name: '出炉', description: '冷却至室温', targetTemp: 25, holdTime: 0, rampRate: 0, pressure: 0.0, gasValves: [] },
            ],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo-2', name: '高温烧结工艺', number: 2, totalSteps: 3, status: 'ready',
            steps: [
              { stepNo: 1, name: '预热', description: '以 3°C/min 升温至 400°C', targetTemp: 400, holdTime: 20, rampRate: 3, pressure: 1.0, gasValves: [] },
              { stepNo: 2, name: '高温烧结', description: '1100°C 高温烧结', targetTemp: 1100, holdTime: 180, rampRate: 8, pressure: 0.3, gasValves: [] },
              { stepNo: 3, name: '缓冷', description: '控制降温至 100°C', targetTemp: 100, holdTime: 0, rampRate: 0, pressure: 0.0, gasValves: [] },
            ],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          },
        ];
        set({ recipes: demoRecipes });
        return;
      }
      const recipes = await window.electronAPI.recipe.getAll();
      set({ recipes });
    } catch (err) {
      console.error('[RecipeStore] loadRecipes error:', err);
    }
  },

  selectRecipe: (id: string) => {
    const recipe = get().recipes.find((r) => r.id === id) || null;
    set({ selectedRecipe: recipe });
  },

  addRecipe: async (recipe: Recipe) => {
    try {
      const result = await window.electronAPI.recipe.add(recipe);
      set((state) => ({ recipes: [...state.recipes, result] }));
    } catch (err) {
      console.error('[RecipeStore] addRecipe error:', err);
    }
  },

  updateRecipe: async (id: string, updates: Partial<Recipe>) => {
    try {
      const result = await window.electronAPI.recipe.update(id, updates);
      set((state) => ({
        recipes: state.recipes.map((r) => (r.id === id ? result : r)),
        selectedRecipe: state.selectedRecipe?.id === id ? result : state.selectedRecipe,
      }));
    } catch (err) {
      console.error('[RecipeStore] updateRecipe error:', err);
    }
  },

  deleteRecipe: async (id: string) => {
    try {
      await window.electronAPI.recipe.delete(id);
      set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== id),
        selectedRecipe: state.selectedRecipe?.id === id ? null : state.selectedRecipe,
      }));
    } catch (err) {
      console.error('[RecipeStore] deleteRecipe error:', err);
    }
  },

  importRecipes: async (filePath: string) => {
    try {
      const response = await fetch(filePath);
      const content = await response.text();
      const parsed = parseImportContent(content);
      for (const entry of parsed) {
        if (entry.name && entry.steps) {
          const now = new Date().toISOString();
          const recipe: Recipe = {
            id: crypto.randomUUID(),
            name: entry.name,
            number: entry.number || 0,
            steps: entry.steps || [],
            totalSteps: entry.totalSteps || entry.steps?.length || 0,
            status: 'ready',
            createdAt: now,
            updatedAt: now,
          };
          await window.electronAPI.recipe.add(recipe);
        }
      }
      await get().loadRecipes();
    } catch (err) {
      console.error('[RecipeStore] importRecipes error:', err);
    }
  },

  exportRecipes: async (id: string, format: 'json' | 'csv') => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) {
      console.error('[RecipeStore] exportRecipes: recipe not found');
      return;
    }
    try {
      let content: string;
      let filename: string;
      if (format === 'json') {
        content = JSON.stringify(recipe, null, 2);
        filename = `${recipe.name.replace(/\s+/g, '_')}.json`;
      } else {
        content = generateRecipeCSV(recipe);
        filename = `${recipe.name.replace(/\s+/g, '_')}.csv`;
      }
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[RecipeStore] exportRecipes error:', err);
    }
  },

  startRecipe: () => {
    const { selectedRecipe } = get();
    if (selectedRecipe) {
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === selectedRecipe.id ? { ...r, status: 'running' as const } : r
        ),
        selectedRecipe: { ...selectedRecipe, status: 'running' as const },
        isRunning: true,
      }));
    }
  },

  pauseRecipe: () => {
    const { selectedRecipe } = get();
    if (selectedRecipe) {
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === selectedRecipe.id ? { ...r, status: 'paused' as const } : r
        ),
        selectedRecipe: { ...selectedRecipe, status: 'paused' as const },
        isRunning: false,
      }));
    }
  },

  stopRecipe: () => {
    const { selectedRecipe } = get();
    if (selectedRecipe) {
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === selectedRecipe.id ? { ...r, status: 'completed' as const } : r
        ),
        selectedRecipe: { ...selectedRecipe, status: 'completed' as const },
        isRunning: false,
      }));
    }
  },

  jumpToStep: (_stepNo: number) => {
    const { selectedRecipe, isRunning } = get();
    if (!selectedRecipe || !isRunning) return;
    console.log('[RecipeStore] jumpToStep:', _stepNo);
  },

  singleStep: () => {
    const { selectedRecipe, isRunning } = get();
    if (!selectedRecipe || !isRunning) return;
    console.log('[RecipeStore] singleStep');
  },
}));