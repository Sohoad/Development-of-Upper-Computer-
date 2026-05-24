import { create } from 'zustand';
import type { AuditLog } from '@shared/types';

interface AuditFilters {
  startTime?: string;
  endTime?: string;
  userId?: string;
  action?: string;
}

interface AuditState {
  logs: AuditLog[];
  isLoading: boolean;
  filters: AuditFilters;
  queryLogs: (filters?: AuditFilters) => Promise<void>;
  setFilters: (partialFilters: Partial<AuditFilters>) => void;
  exportCSV: () => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  isLoading: false,
  filters: {},

  queryLogs: async (filters?: AuditFilters) => {
    const appliedFilters = filters ?? get().filters;
    if (filters) {
      set({ filters: appliedFilters });
    }
    set({ isLoading: true });
    try {
      const result = await window.electronAPI.audit.query(appliedFilters);
      set({ logs: result, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setFilters: (partialFilters: Partial<AuditFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...partialFilters },
    }));
  },

  exportCSV: async () => {
    try {
      const csv = await window.electronAPI.audit.exportCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      console.error('Failed to export CSV');
    }
  },
}));