import { TagConfig, TagValue } from '../../shared/types';
import { S7Client } from './S7Client';

const DEFAULT_FURNACE_TAGS: TagConfig[] = [
  {
    name: 'Temp_Zone1',
    address: 'IW0',
    area: 'I',
    start: 0,
    size: 2,
    type: 'word',
    unit: '°C',
    group: 'temperature',
    min: 0,
    max: 1200,
    description: 'Furnace Zone 1 Temperature',
  },
  {
    name: 'Temp_Zone2',
    address: 'IW2',
    area: 'I',
    start: 2,
    size: 2,
    type: 'word',
    unit: '°C',
    group: 'temperature',
    min: 0,
    max: 1200,
    description: 'Furnace Zone 2 Temperature',
  },
  {
    name: 'Temp_Zone3',
    address: 'IW4',
    area: 'I',
    start: 4,
    size: 2,
    type: 'word',
    unit: '°C',
    group: 'temperature',
    min: 0,
    max: 1200,
    description: 'Furnace Zone 3 Temperature',
  },
  {
    name: 'Temp_Setpoint',
    address: 'IW6',
    area: 'I',
    start: 6,
    size: 2,
    type: 'word',
    unit: '°C',
    group: 'temperature',
    min: 0,
    max: 1300,
    description: 'Temperature Setpoint',
  },
  {
    name: 'Pressure_Furnace',
    address: 'ID0',
    area: 'I',
    start: 8,
    size: 4,
    type: 'real',
    unit: 'Pa',
    group: 'pressure',
    min: 0,
    max: 5000,
    description: 'Furnace Internal Pressure',
  },
  {
    name: 'Pressure_Gas',
    address: 'ID4',
    area: 'I',
    start: 12,
    size: 4,
    type: 'real',
    unit: 'MPa',
    group: 'pressure',
    min: 0,
    max: 25,
    description: 'Gas Supply Pressure',
  },
  {
    name: 'Power_Active',
    address: 'ID8',
    area: 'I',
    start: 16,
    size: 4,
    type: 'real',
    unit: 'kW',
    group: 'power',
    min: 0,
    max: 500,
    description: 'Active Power Consumption',
  },
  {
    name: 'Current_Phase1',
    address: 'ID12',
    area: 'I',
    start: 20,
    size: 4,
    type: 'real',
    unit: 'A',
    group: 'electrical',
    min: 0,
    max: 100,
    description: 'Phase 1 Current',
  },
  {
    name: 'Current_Phase2',
    address: 'ID16',
    area: 'I',
    start: 24,
    size: 4,
    type: 'real',
    unit: 'A',
    group: 'electrical',
    min: 0,
    max: 100,
    description: 'Phase 2 Current',
  },
  {
    name: 'Current_Phase3',
    address: 'ID20',
    area: 'I',
    start: 28,
    size: 4,
    type: 'real',
    unit: 'A',
    group: 'electrical',
    min: 0,
    max: 100,
    description: 'Phase 3 Current',
  },
  {
    name: 'Voltage_Phase1',
    address: 'ID24',
    area: 'I',
    start: 32,
    size: 4,
    type: 'real',
    unit: 'V',
    group: 'electrical',
    min: 0,
    max: 500,
    description: 'Phase 1 Voltage',
  },
  {
    name: 'Voltage_Phase2',
    address: 'ID28',
    area: 'I',
    start: 36,
    size: 4,
    type: 'real',
    unit: 'V',
    group: 'electrical',
    min: 0,
    max: 500,
    description: 'Phase 2 Voltage',
  },
  {
    name: 'Voltage_Phase3',
    address: 'ID32',
    area: 'I',
    start: 40,
    size: 4,
    type: 'real',
    unit: 'V',
    group: 'electrical',
    min: 0,
    max: 500,
    description: 'Phase 3 Voltage',
  },
  {
    name: 'DI_Burner_Running',
    address: 'IX0.0',
    area: 'I',
    start: 44,
    size: 1,
    type: 'bool',
    group: 'digital_input',
    description: 'Burner Running Status',
  },
  {
    name: 'DI_Alarm_OverTemp',
    address: 'IX0.1',
    area: 'I',
    start: 44,
    size: 1,
    type: 'bool',
    group: 'digital_input',
    description: 'Over Temperature Alarm',
  },
  {
    name: 'DI_Emergency_Stop',
    address: 'IX0.2',
    area: 'I',
    start: 44,
    size: 1,
    type: 'bool',
    group: 'digital_input',
    description: 'Emergency Stop Active',
  },
  {
    name: 'DO_Heater_Enable',
    address: 'QX0.0',
    area: 'Q',
    start: 0,
    size: 1,
    type: 'bool',
    group: 'digital_output',
    description: 'Heater Enable Command',
  },
  {
    name: 'DO_Gas_Valve',
    address: 'QX0.1',
    area: 'Q',
    start: 0,
    size: 1,
    type: 'bool',
    group: 'digital_output',
    description: 'Gas Valve Command',
  },
  {
    name: 'DO_Cooling_Fan',
    address: 'QX0.2',
    area: 'Q',
    start: 0,
    size: 1,
    type: 'bool',
    group: 'digital_output',
    description: 'Cooling Fan Command',
  },
  {
    name: 'DO_Alarm_Buzzer',
    address: 'QX0.3',
    area: 'Q',
    start: 0,
    size: 1,
    type: 'bool',
    group: 'digital_output',
    description: 'Alarm Buzzer Command',
  },
  {
    name: 'DB1_RPM_Fan',
    address: 'DB1.DBD0',
    area: 'DB',
    dbNumber: 1,
    start: 0,
    size: 4,
    type: 'real',
    unit: 'RPM',
    group: 'db_data',
    min: 0,
    max: 3000,
    description: 'Fan Speed (DB1)',
  },
  {
    name: 'DB1_FlowRate_Gas',
    address: 'DB1.DBD4',
    area: 'DB',
    dbNumber: 1,
    start: 4,
    size: 4,
    type: 'real',
    unit: 'm³/h',
    group: 'db_data',
    min: 0,
    max: 100,
    description: 'Gas Flow Rate (DB1)',
  },
  {
    name: 'DB1_DutyCycle',
    address: 'DB1.DBW8',
    area: 'DB',
    dbNumber: 1,
    start: 8,
    size: 2,
    type: 'word',
    unit: '%',
    group: 'db_data',
    min: 0,
    max: 100,
    description: 'Heater Duty Cycle (DB1)',
  },
  {
    name: 'DB1_RunHours',
    address: 'DB1.DBD10',
    area: 'DB',
    dbNumber: 1,
    start: 10,
    size: 4,
    type: 'dword',
    unit: 'h',
    group: 'db_data',
    description: 'Total Run Hours (DB1)',
  },
];

export class TagManager {
  private tags: Map<string, TagConfig> = new Map();

  constructor() {
    this.loadDefaults();
  }

  private loadDefaults(): void {
    for (const tag of DEFAULT_FURNACE_TAGS) {
      this.tags.set(tag.name, { ...tag });
    }
  }

  addTag(tag: TagConfig): void {
    this.tags.set(tag.name, { ...tag });
  }

  removeTag(name: string): boolean {
    return this.tags.delete(name);
  }

  getTags(): TagConfig[] {
    return Array.from(this.tags.values());
  }

  getTag(name: string): TagConfig | undefined {
    return this.tags.get(name);
  }

  getTagsByGroup(group: string): TagConfig[] {
    return this.getTags().filter((t) => t.group === group);
  }

  getGroups(): string[] {
    const groups = new Set<string>();
    for (const tag of this.tags.values()) {
      if (tag.group) {
        groups.add(tag.group);
      }
    }
    return Array.from(groups);
  }

  parseTagValue(tag: TagConfig, rawValue: Buffer): number | boolean {
    const { type, start } = tag;

    switch (type) {
      case 'bool': {
        const byteIndex = Math.floor(start / 8);
        const bitIndex = start % 8;
        if (rawValue.length > byteIndex) {
          return ((rawValue[byteIndex] >> bitIndex) & 1) === 1;
        }
        return false;
      }
      case 'byte':
        return rawValue.length > 0 ? rawValue[0] : 0;
      case 'word':
        if (rawValue.length >= 2) {
          return (rawValue[0] << 8) | rawValue[1];
        }
        return 0;
      case 'dword':
        if (rawValue.length >= 4) {
          return ((rawValue[0] << 24) | (rawValue[1] << 16) | (rawValue[2] << 8) | rawValue[3]) >>> 0;
        }
        return 0;
      case 'real':
        if (rawValue.length >= 4) {
          return rawValue.readFloatBE(0);
        }
        return 0;
      default:
        return 0;
    }
  }

  encodeValue(tag: TagConfig, value: number | boolean): Buffer {
    const { type } = tag;

    switch (type) {
      case 'bool': {
        const buf = Buffer.alloc(1);
        buf[0] = value ? 1 : 0;
        return buf;
      }
      case 'byte': {
        const buf = Buffer.alloc(1);
        buf[0] = typeof value === 'number' ? value & 0xff : 0;
        return buf;
      }
      case 'word': {
        const buf = Buffer.alloc(2);
        const v = typeof value === 'number' ? value & 0xffff : 0;
        buf[0] = (v >> 8) & 0xff;
        buf[1] = v & 0xff;
        return buf;
      }
      case 'dword': {
        const buf = Buffer.alloc(4);
        const v = typeof value === 'number' ? value >>> 0 : 0;
        buf[0] = (v >> 24) & 0xff;
        buf[1] = (v >> 16) & 0xff;
        buf[2] = (v >> 8) & 0xff;
        buf[3] = v & 0xff;
        return buf;
      }
      case 'real': {
        const buf = Buffer.alloc(4);
        if (typeof value === 'number') {
          buf.writeFloatBE(value, 0);
        }
        return buf;
      }
      default:
        return Buffer.alloc(1);
    }
  }
}