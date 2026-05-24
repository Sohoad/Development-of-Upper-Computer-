import { EventEmitter } from 'events';
import { S7Client } from './S7Client';
import { TagManager } from './TagManager';
import { TagConfig, TagValue, PollingStats } from '../../shared/types';

export class PollingEngine extends EventEmitter {
  private s7Client: S7Client;
  private tagManager: TagManager;
  private interval: number;
  private timer: NodeJS.Timeout | null = null;
  private paused = false;
  private stats: PollingStats = {
    totalRequests: 0,
    successCount: 0,
    failCount: 0,
    avgLatency: 0,
    lastPollTime: 0,
  };

  constructor(s7Client: S7Client, tagManager: TagManager, interval = 500) {
    super();
    this.s7Client = s7Client;
    this.tagManager = tagManager;
    this.interval = interval;
  }

  start(): void {
    if (this.timer) return;
    this.paused = false;
    this.poll();
    this.timer = setInterval(() => this.poll(), this.interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.paused = true;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  setInterval(ms: number): void {
    this.interval = ms;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  getStats(): PollingStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successCount: 0,
      failCount: 0,
      avgLatency: 0,
      lastPollTime: 0,
    };
  }

  private async poll(): Promise<void> {
    if (this.paused || !this.s7Client.isConnected()) return;

    const tags = this.tagManager.getTags();
    if (tags.length === 0) return;

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const values = await this.readAllTags(tags);
      const latency = Date.now() - startTime;

      this.stats.successCount++;
      this.stats.lastPollTime = Date.now();
      this.stats.avgLatency =
        (this.stats.avgLatency * (this.stats.successCount - 1) + latency) /
        this.stats.successCount;

      this.emit('data', {
        timestamp: Date.now(),
        latency,
        values,
      });
    } catch (err) {
      this.stats.failCount++;
      this.emit('error', err);
    }
  }

  private async readAllTags(tags: TagConfig[]): Promise<TagValue[]> {
    const areaGroups = this.groupTagsByArea(tags);
    const results: TagValue[] = [];

    for (const [key, groupTags] of areaGroups) {
      const [area, dbNumber] = key.split(':');
      const areaCode = S7Client.parseArea(area);
      const dbNum = parseInt(dbNumber, 10) || 0;

      const { minStart, maxEnd } = this.getReadRange(groupTags);

      let wordLen = 0x02;
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
            wordLen
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