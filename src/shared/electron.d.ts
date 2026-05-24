import type { ElectronAPI, User, UserRole } from './types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { User, UserRole };