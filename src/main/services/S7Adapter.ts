import { ProtocolAdapter } from './ProtocolAdapter';
import { S7Client } from './S7Client';
import { TagManager } from './TagManager';
import { S7AdapterConfig } from '../../shared/protocol';
import { TagConfig, TagValue, AdapterType } from '../../shared/types';

export class S7Adapter extends ProtocolAdapter {
  readonly name = 's7';
  readonly type: AdapterType = 's7';

  private s7Client: S7Client;
  private tagManager: TagManager;

  constructor(tagManager?: TagManager) {
    super();
    this.s7Client = new S7Client();
    this.tagManager = tagManager ?? new TagManager();

    this.s7Client.on('connected', (info: unknown) => {
      this.emit('connected', info);
    });

    this.s7Client.on('disconnected', () => {
      this.emit('disconnected');
    });

    this.s7Client.on('error', (err: Error) => {
      this.emit('error', err);
    });
  }

  getRawClient(): S7Client {
    return this.s7Client;
  }

  getTagManager(): TagManager {
    return this.tagManager;
  }

  isSimulation(): boolean {
    return this.s7Client.isSimulation();
  }

  async connect(config: S7AdapterConfig): Promise<void> {
    await this.s7Client.connect(config.ip, config.rack, config.slot);
  }

  async disconnect(): Promise<void> {
    await this.s7Client.disconnect();
  }

  isConnected(): boolean {
    return this.s7Client.isConnected();
  }

  async readTags(tags: TagConfig[]): Promise<TagValue[]> {
    const areaGroups = this.groupTagsByArea(tags);
    const results: TagValue[] = [];

    for (const [key, groupTags] of areaGroups) {
      const [area, dbNumber] = key.split(':');
      const areaCode = S7Client.parseArea(area);
      const dbNum = parseInt(dbNumber, 10) || 0;

      const { minStart, maxEnd } = this.getReadRange(groupTags);

      if (area === 'DB') {
        try {
          const rawData = await this.s7Client.readDB(dbNum, minStart, maxEnd - minStart);
          for (const tag of groupTags) {
            const adjustedStart = tag.start - minStart;
            const slice = rawData.subarray(adjustedStart, adjustedStart + tag.size);
            const value = this.tagManager.parseTagValue(tag, slice);
            results.push({
              name: tag.name,
              value,
              rawValue: slice,
              timestamp: Date.now(),
              quality: true,
              tag,
            });
          }
        } catch {
          for (const tag of groupTags) {
            results.push({
              name: tag.name,
              value: tag.type === 'bool' ? false : 0,
              rawValue: Buffer.alloc(tag.size),
              timestamp: Date.now(),
              quality: false,
              tag,
            });
          }
        }
      } else {
        try {
          const rawData = await this.s7Client.readArea(
            areaCode,
            dbNum,
            minStart,
            maxEnd - minStart,
            0x02
          );
          for (const tag of groupTags) {
            const adjustedStart = tag.start - minStart;
            const slice = rawData.subarray(adjustedStart, adjustedStart + tag.size);
            const value = this.tagManager.parseTagValue(tag, slice);
            results.push({
              name: tag.name,
              value,
              rawValue: slice,
              timestamp: Date.now(),
              quality: true,
              tag,
            });
          }
        } catch {
          for (const tag of groupTags) {
            results.push({
              name: tag.name,
              value: tag.type === 'bool' ? false : 0,
              rawValue: Buffer.alloc(tag.size),
              timestamp: Date.now(),
              quality: false,
              tag,
            });
          }
        }
      }
    }

    return results;
  }

  async writeTag(tag: TagConfig, value: number | boolean): Promise<void> {
    const buffer = this.tagManager.encodeValue(tag, value);
    const area = S7Client.parseArea(tag.area);
    const wordLen = S7Client.parseWordLen(tag.type);
    const dbNumber = tag.dbNumber ?? 0;

    if (tag.area === 'DB') {
      await this.s7Client.writeDB(dbNumber, tag.start, tag.size, buffer);
    } else {
      await this.s7Client.writeArea(area, dbNumber, tag.start, tag.size, wordLen, buffer);
    }
  }

  private groupTagsByArea(tags: TagConfig[]): Map<string, TagConfig[]> {
    const groups = new Map<string, TagConfig[]>();
    for (const tag of tags) {
      const dbNum = tag.dbNumber ?? 0;
      const key = `${tag.area}:${dbNum}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tag);
    }
    return groups;
  }

  private getReadRange(tags: TagConfig[]): { minStart: number; maxEnd: number } {
    let minStart = Infinity;
    let maxEnd = 0;

    for (const tag of tags) {
      if (tag.start < minStart) {
        minStart = tag.start;
      }
      const end = tag.start + tag.size;
      if (end > maxEnd) {
        maxEnd = end;
      }
    }

    return { minStart: minStart === Infinity ? 0 : minStart, maxEnd };
  }
}