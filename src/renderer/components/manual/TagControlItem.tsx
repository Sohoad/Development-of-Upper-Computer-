import { useState } from 'react';
import { Switch, InputNumber, Button, Space, Tag, Tooltip, Popconfirm } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  FieldNumberOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { TagConfig } from '../../../shared/types';
import { parseAddress } from '../../../shared/addressParser';
import { usePLCStore } from '../../stores/plcStore';

interface TagControlItemProps {
  tag: TagConfig;
  onEdit?: (tag: TagConfig) => void;
  onDelete?: (name: string) => void;
  showActions?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  bool: 'blue',
  byte: 'cyan',
  word: 'green',
  dword: 'orange',
  real: 'purple',
};

const GROUP_LABELS: Record<string, string> = {
  temperature: '温度',
  pressure: '压力',
  power: '功率',
  electrical: '电气',
  digital_input: '数字输入',
  digital_output: '数字输出',
  db_data: 'DB 数据',
};

export function TagControlItem({ tag, onEdit, onDelete, showActions = false }: TagControlItemProps) {
  const { t } = useTranslation();
  const writeTag = usePLCStore((s) => s.writeTag);
  const tagValues = usePLCStore((s) => s.tagValues);
  const tv = tagValues.get(tag.name);
  const displayValue = tv && typeof tv.value === 'number' ? tv.value : null;

  const [localBool, setLocalBool] = useState<boolean | null>(null);
  const [localNum, setLocalNum] = useState<number | null>(null);

  const parsed = parseAddress(tag.address);
  const areaLabel = parsed?.area ?? tag.area;

  const handleWriteBool = async (val: boolean) => {
    setLocalBool(val);
    await writeTag(tag.name, val);
  };

  const handleWriteNumber = async () => {
    if (localNum !== null) {
      await writeTag(tag.name, localNum);
    }
  };

  const isBool = tag.type === 'bool';
  const currentValue = isBool
    ? (localBool !== null ? localBool : (tv?.value === true || tv?.value === 1))
    : (localNum !== null ? localNum : displayValue);

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {tag.name}
            </span>
            <Tag color={TYPE_COLORS[tag.type] ?? 'default'} style={{ fontSize: 9, lineHeight: '14px', margin: 0 }}>
              {tag.type.toUpperCase()}
            </Tag>
            {tag.group && GROUP_LABELS[tag.group] && (
              <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>
                {GROUP_LABELS[tag.group]}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <code
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-base)',
                padding: '1px 4px',
                borderRadius: 3,
              }}
            >
              {tag.address}
            </code>
            <span style={{ fontSize: 9, color: 'var(--color-text-quaternary)' }}>
              {areaLabel}
              {tag.dbNumber ? ` DB${tag.dbNumber}` : ''}
              {parsed ? ` @${parsed.start}` : ''}
            </span>
          </div>

          {tag.description && (
            <span style={{ fontSize: 9, color: 'var(--color-text-quaternary)', lineHeight: '14px' }}>
              {tag.description}
            </span>
          )}
        </div>

        {showActions && (
          <Space size={2}>
            <Tooltip title={t('manual.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ fontSize: 11 }} />}
                onClick={() => onEdit?.(tag)}
              />
            </Tooltip>
            <Tooltip title={t('manual.delete')}>
              <Popconfirm
                title={t('manual.confirmDelete')}
                onConfirm={() => onDelete?.(tag.name)}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isBool ? (
          <>
            <Switch
              checked={currentValue as boolean}
              onChange={handleWriteBool}
              size="small"
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: currentValue ? '#52c41a' : 'var(--color-text-tertiary)',
              }}
            >
              {currentValue ? 'ON' : 'OFF'}
            </span>
          </>
        ) : (
          <>
            <InputNumber
              value={localNum !== null ? localNum : (displayValue as number)}
              onChange={(v) => setLocalNum(v ?? 0)}
              size="small"
              style={{ width: 100 }}
              min={tag.min ?? 0}
              max={tag.max ?? 9999}
              step={tag.type === 'real' ? 0.1 : 1}
              stringMode={false}
            />
            {tag.unit && (
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', minWidth: 20 }}>
                {tag.unit}
              </span>
            )}
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={handleWriteNumber}
              style={{ fontSize: 10, height: 22 }}
            >
              {t('manual.write')}
            </Button>
          </>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 10, color: 'var(--color-text-quaternary)', fontVariantNumeric: 'tabular-nums' }}>
          {tv?.value !== undefined ? tv.value : '--'}
        </span>
      </div>
    </div>
  );
}