import { EventEmitter } from 'events';
import { TagDefinition, AdapterConfig, AdapterType } from '../../shared/protocol';
import { TagValue } from '../../shared/types';

export abstract class ProtocolAdapter extends EventEmitter {
  abstract readonly name: string;
  abstract readonly type: AdapterType;

  abstract connect(config: AdapterConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  abstract readTags(tags: TagDefinition[]): Promise<TagValue[]>;
  abstract writeTag(tag: TagDefinition, value: number | boolean): Promise<void>;
}

export default ProtocolAdapter;