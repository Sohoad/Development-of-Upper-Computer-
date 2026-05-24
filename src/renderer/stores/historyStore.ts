import { create } from 'zustand';
import type { HistoryRecord } from '@shared/types';

interface HistoryState {
  queryResult: HistoryRecord[];
  isLoading: boolean;
  timeRange: { startTime: string; endTime: string };
  selectedTags: string[];

  queryHistory: (tagNames: string[], startTime: string, endTime: string) => Promise<void>;
  exportData: (format: 'json' | 'csv') => void;
}

function generateHistoryCSV(records: HistoryRecord[]): string {
  const headers = ['id', 'timestamp', 'tagName', 'value', 'unit'];
  const rows = records.map((r) =>
    [r.id, r.timestamp, r.tagName, String(r.value), r.unit].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  queryResult: [],
  isLoading: false,
  timeRange: { startTime: '', endTime: '' },
  selectedTags: [],

  queryHistory: async (tagNames: string[], startTime: string, endTime: string) => {
    set({ isLoading: true, selectedTags: tagNames, timeRange: { startTime, endTime } });
    try {
      const result = await window.electronAPI.db.queryHistory(tagNames, startTime, endTime);
      set({ queryResult: result, isLoading: false });
    } catch (err) {
      console.error('[HistoryStore] queryHistory error:', err);
      set({ isLoading: false });
    }
  },

  exportData: (format: 'json' | 'csv') => {
    const { queryResult } = get();
    try {
      let content: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (format === 'json') {
        content = JSON.stringify(queryResult, null, 2);
        filename = `history_${timestamp}.json`;
      } else {
        content = generateHistoryCSV(queryResult);
        filename = `history_${timestamp}.csv`;
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
      console.error('[HistoryStore] exportData error:', err);
    }
  },
}));