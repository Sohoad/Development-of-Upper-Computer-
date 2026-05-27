import { ProtocolAdapter } from './ProtocolAdapter';
import { S7Client } from './S7Client';
import { TagManager } from './TagManager';
import { TagValue, TagConfig, AdapterStatus } from '../../shared/types';
import { TagDefinition, S7AdapterConfig } from '../../shared/protocol';
import {
  parseAddress,
  ParsedAddress,
  S7AreaCode,
} from '../../shared/addressParser';

interface BatchGroup {
  areaCode: number;
  dbNumber: number;
  start: number;
  tags: { def: TagConfig; parsed: ParsedAddress }[];
}

function buildGroups(tags: TagConfig[]): BatchGroup[] {
  const parsedTags = tags
    .map((def) => {
      const parsed = parseAddress(def.address);
      return parsed ? { def, parsed } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const sorted = [...parsedTags].sort((a, b) => {
    if (a.parsed.areaCode !== b.parsed.areaCode) return a.parsed.areaCode - b.parsed.areaCode;
    if (a.parsed.dbNumber !== b.parsed.dbNumber) return a.parsed.dbNumber - b.parsed.dbNumber;
    return a.parsed.start - b.parsed.start;
  });

  const groups: BatchGroup[] = [];
  let current: BatchGroup | null = null;

  for (const item of sorted) {
    if (
      !current ||
      current.areaCode !== item.parsed.areaCode ||
      current.dbNumber !== item.parsed.dbNumber
    ) {
      current = {
        areaCode: item.parsed.areaCode,
        dbNumber: item.parsed.dbNumber,
        start: item.parsed.start,
        tags: [],
      };
      groups.push(current);
    }
    current.tags.push(item);
  }

  for (const group of groups) {
    group.tags.sort((a, b) => a.parsed.start - b.parsed.start);
  }
  return groups;
}

function readGroup(client: S7Client, group: BatchGroup): Promise<Buffer> {
  const groupEnd = group.tags.reduce((max, t) => {
    const end = t.parsed.start + t.parsed.size;
    return end > max ? end : max;
  }, 0);

  const readSize = groupEnd - group.start;

  if (group.areaCode === S7AreaCode.DB) {
    return client.readDB(group.dbNumber, group.start, readSize);
  }

  return client.readArea(group.areaCode, group.dbNumber, group.start, readSize, 0x02);
}

export class S7Adapter extends ProtocolAdapter {
  readonly name = 's7';
  readonly type = 's7' as const;
  private client: S7Client;
  private tagManager: TagManager;
  private _connected = false;
  private _config: S7AdapterConfig | null = null;

  constructor(client: S7Client, tagManager: TagManager) {
    super();
    this.client = client;
    this.tagManager = tagManager;
  }

  getClient(): S7Client {
    return this.client;
  }

  getTagManager(): TagManager {
    return this.tagManager;
  }

  async connect(config: S7AdapterConfig): Promise<void> {
    this._config = config;
    await this.client.connect(config.ip, config.rack, config.slot);
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this._connected = false;
  }

  isConnected(): boolean {
    return this._connected;
  }

  isSimulation(): boolean {
    return this.client.isSimulation();
  }

  async readTags(tags: TagDefinition[]): Promise<TagValue[]> {
    if (tags.length === 0) return [];

    const groups = buildGroups(tags);
    const results: TagValue[] = [];

    for (const group of groups) {
      try {
        const buffer = await readGroup(this.client, group);

        for (const { def, parsed } of group.tags) {
          try {
            const offset = parsed.start - group.start;
            const rawBuffer = parsed.size <= buffer.length
              ? buffer.subarray(offset, offset + parsed.size)
              : Buffer.alloc(parsed.size);

            const value = this.tagManager.parseValue(def, rawBuffer, 0);
            results.push({
              name: def.name,
              value,
              rawValue: rawBuffer,
              unit: def.unit,
              timestamp: Date.now(),
              quality: true,
              tag: def,
            });
          } catch {
            results.push({
              name: def.name,
              value: 0,
              rawValue: Buffer.alloc(parsed.size),
              timestamp: Date.now(),
              quality: false,
              tag: def,
            });
          }
        }
      } catch {
        for (const { def, parsed } of group.tags) {
          results.push({
            name: def.name,
            value: 0,
            rawValue: Buffer.alloc(parsed.size),
            timestamp: Date.now(),
            quality: false,
            tag: def,
          });
        }
      }
    }

    return results;
  }

  async writeTag(tag: TagDefinition, value: number | boolean): Promise<void> {
    const parsed = parseAddress(tag.address);
    if (!parsed) {
      throw new Error(`Invalid address: ${tag.address}`);
    }

    await this.client.writeTagByAddress(tag.address, value);
  }

  async readAllTags(): Promise<TagValue[]> {
    const allTags = this.tagManager.getAllTagDefs();
    return this.readTags(allTags);
  }

  getStatus(): AdapterStatus {
    return {
      name: this.name,
      type: this.type,
      connected: this._connected,
      simulation: this.client.isSimulation(),
      stats: {
        totalRequests: 0,
        successCount: 0,
        failCount: 0,
        avgLatency: 0,
        lastPollTime: 0,
      },
    };
  }
}