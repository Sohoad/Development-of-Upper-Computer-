import { TagConfig, AdapterType } from './types';

export type { AdapterType };

export interface AdapterConfig {
  name: string;
  type: AdapterType;
}

export interface S7AdapterConfig extends AdapterConfig {
  type: 's7';
  ip: string;
  rack: number;
  slot: number;
}

export type TagDefinition = TagConfig;