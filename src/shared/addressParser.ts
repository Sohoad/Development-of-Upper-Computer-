export const S7AreaCode = {
  PE: 0x81,
  PA: 0x82,
  MK: 0x83,
  DB: 0x84,
  CT: 0x1c,
  TM: 0x1d,
} as const;

export const S7WordLen = {
  BIT: 0x01,
  BYTE: 0x02,
  WORD: 0x04,
  DWORD: 0x06,
  REAL: 0x08,
  COUNTER: 0x1c,
  TIMER: 0x1d,
} as const;

export interface ParsedAddress {
  area: string;
  areaCode: number;
  dbNumber: number;
  start: number;
  bitOffset: number;
  type: string;
  size: number;
  wordLen: number;
  address: string;
}

const AREA_PATTERNS: { regex: RegExp; area: string; defaultType: string; defaultSize: number }[] = [
  { regex: /^DB(\d+)\.(DB[DBWX])(\d+)/i, area: 'DB', defaultType: 'real', defaultSize: 4 },
  { regex: /^I([XBWDL])(\d+)\.?(\d*)$/i, area: 'I', defaultType: 'word', defaultSize: 2 },
  { regex: /^Q([XBWDL])(\d+)\.?(\d*)$/i, area: 'Q', defaultType: 'word', defaultSize: 2 },
  { regex: /^M([XBWDL])(\d+)\.?(\d*)$/i, area: 'M', defaultType: 'word', defaultSize: 2 },
];

const SIZE_MAP: Record<string, Record<string, number>> = {
  I: { X: 1, B: 1, W: 2, D: 4, L: 4 },
  Q: { X: 1, B: 1, W: 2, D: 4, L: 4 },
  M: { X: 1, B: 1, W: 2, D: 4, L: 4 },
};

const TYPE_MAP: Record<string, Record<string, string>> = {
  I: { X: 'bool', B: 'byte', W: 'word', D: 'dword', L: 'dword' },
  Q: { X: 'bool', B: 'byte', W: 'word', D: 'dword', L: 'dword' },
  M: { X: 'bool', B: 'byte', W: 'word', D: 'dword', L: 'dword' },
};

const TYPE_SIZE: Record<string, number> = {
  bool: 1, byte: 1, word: 2, dword: 4, real: 4,
};

const TYPE_WORD_LEN: Record<string, number> = {
  bool: S7WordLen.BIT, byte: S7WordLen.BYTE, word: S7WordLen.WORD,
  dword: S7WordLen.DWORD, real: S7WordLen.REAL,
};

const AREA_CODE_MAP: Record<string, number> = {
  I: S7AreaCode.PE, INPUT: S7AreaCode.PE,
  Q: S7AreaCode.PA, O: S7AreaCode.PA, OUTPUT: S7AreaCode.PA,
  M: S7AreaCode.MK, MARKER: S7AreaCode.MK,
  DB: S7AreaCode.DB, DATABLOCK: S7AreaCode.DB,
  CT: S7AreaCode.CT, COUNTER: S7AreaCode.CT,
  TM: S7AreaCode.TM, TIMER: S7AreaCode.TM,
};

export function parseAddress(addr: string): ParsedAddress | null {
  const trimmed = addr.trim();
  for (const pattern of AREA_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (!match) continue;

    if (pattern.area === 'DB') {
      const dbNumber = parseInt(match[1], 10);
      const suffix = match[2].toUpperCase();
      const start = parseInt(match[3], 10);
      const bitOffset = match[4] ? parseInt(match[4], 10) : 0;

      let type = pattern.defaultType;
      let size = pattern.defaultSize;

      if (suffix === 'DBX') { type = 'bool'; size = 1; }
      else if (suffix === 'DBB') { type = 'byte'; size = 1; }
      else if (suffix === 'DBW') { type = 'word'; size = 2; }
      else if (suffix === 'DBD') { type = 'real'; size = 4; }

      return {
        area: 'DB', areaCode: S7AreaCode.DB, dbNumber, start, bitOffset,
        type, size, wordLen: TYPE_WORD_LEN[type] ?? S7WordLen.BYTE, address: trimmed,
      };
    }

    const area = pattern.area;
    const suffix = match[1].toUpperCase();
    const start = parseInt(match[2], 10);
    const bitOffset = match[3] ? parseInt(match[3], 10) : 0;
    const size = SIZE_MAP[area]?.[suffix] ?? 2;
    const type = TYPE_MAP[area]?.[suffix] ?? 'word';

    return {
      area, areaCode: AREA_CODE_MAP[area] ?? S7AreaCode.PE,
      dbNumber: 0, start, bitOffset, type, size,
      wordLen: TYPE_WORD_LEN[type] ?? S7WordLen.BYTE, address: trimmed,
    };
  }

  return null;
}

export function buildAddress(parsed: { area: string; start: number; dbNumber?: number; bitOffset?: number; type?: string }): string {
  const { area, dbNumber, start, bitOffset, type } = parsed;
  if (area === 'DB') {
    const suffix = type === 'bool' ? 'DBX' : type === 'byte' ? 'DBB' : type === 'word' ? 'DBW' : 'DBD';
    const bit = bitOffset !== undefined && type === 'bool' ? `.${bitOffset}` : '';
    return `DB${dbNumber ?? 1}.${suffix}${start}${bit}`;
  }
  const sizeChar = type === 'bool' ? 'X' : type === 'byte' ? 'B' : type === 'word' ? 'W' : 'D';
  const bit = bitOffset !== undefined && type === 'bool' ? `.${bitOffset}` : '';
  return `${area}${sizeChar}${start}${bit}`;
}

export function getSizeForType(type: string): number {
  return TYPE_SIZE[type] ?? 2;
}

export function getWordLenForType(type: string): number {
  return TYPE_WORD_LEN[type] ?? S7WordLen.BYTE;
}

export function getAreaCode(area: string): number {
  return AREA_CODE_MAP[area.toUpperCase()] ?? S7AreaCode.DB;
}

export { TYPE_SIZE, TYPE_WORD_LEN, AREA_CODE_MAP };