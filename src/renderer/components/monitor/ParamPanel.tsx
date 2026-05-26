import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import AnimatedValue from '../common/AnimatedValue';
import {
  FireOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  BulbOutlined,
  ToolOutlined,
  SettingOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { TagMapping } from '@shared/types';

interface ParamDef {
  tagName: string;
  labelKey: string;
  unit: string;
  precision: number;
  icon: React.ReactNode;
  color: string;
  max: number;
}

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string; max: number }> = {
  monitorTemperature: { icon: <FireOutlined />, color: '#fa541c', max: 1200 },
  monitorPressure: { icon: <DashboardOutlined />, color: '#177ddc', max: 10 },
  monitorPower: { icon: <ThunderboltOutlined />, color: '#d89614', max: 150 },
  monitorCurrent: { icon: <LineChartOutlined />, color: '#49aa19', max: 300 },
  monitorVoltage: { icon: <BulbOutlined />, color: '#722ed1', max: 500 },
  monitorFlowRate: { icon: <ToolOutlined />, color: '#13c2c2', max: 100 },
  monitorFrequency: { icon: <SettingOutlined />, color: '#eb2f96', max: 60 },
  monitorStatusCode: { icon: <ExperimentOutlined />, color: '#8c8c8c', max: 10 },
};

const DEFAULT_MAPPINGS: TagMapping = {
  monitorTemperature: 'furnace.temp_zone2',
  monitorPressure: 'furnace.pressure',
  monitorPower: 'furnace.power',
  monitorCurrent: 'furnace.current',
  monitorVoltage: 'furnace.voltage',
  monitorFlowRate: 'furnace.flow_rate',
  monitorFrequency: 'furnace.frequency',
  monitorStatusCode: 'furnace.status_code',
};

const FIELD_META: { key: keyof TagMapping; labelKey: string; unit: string; precision: number }[] = [
  { key: 'monitorTemperature', labelKey: 'monitor.temperature', unit: '°C', precision: 0 },
  { key: 'monitorPressure', labelKey: 'monitor.pressure', unit: ' Pa', precision: 1 },
  { key: 'monitorPower', labelKey: 'monitor.power', unit: ' kW', precision: 0 },
  { key: 'monitorCurrent', labelKey: 'monitor.current', unit: ' A', precision: 1 },
  { key: 'monitorVoltage', labelKey: 'monitor.voltage', unit: ' V', precision: 0 },
  { key: 'monitorFlowRate', labelKey: 'monitor.flowRate', unit: ' L/min', precision: 1 },
  { key: 'monitorFrequency', labelKey: 'monitor.frequency', unit: ' Hz', precision: 0 },
  { key: 'monitorStatusCode', labelKey: 'monitor.statusCode', unit: '', precision: 0 },
];

function getNumericTagValue(
  tagValues: Map<string, { value: number | boolean }>,
  tagName: string
): number | undefined {
  const tv = tagValues.get(tagName);
  if (tv && typeof tv.value === 'number') return tv.value;
  return undefined;
}

function SquareCard({ def, value }: { def: ParamDef; value: number }) {
  const frac = def.max > 0 ? Math.min(value / def.max, 1) : 0;

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 2px',
        aspectRatio: '1 / 1',
        width: '100%',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${frac * 100}%`,
          background: def.color,
          opacity: 0.08,
          transition: 'height 0.4s ease',
        }}
      />
      <div style={{ fontSize: 10, color: def.color, marginBottom: 1, lineHeight: '14px' }}>
        {def.icon}
      </div>
      <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: def.color,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: '18px',
          }}
        >
          <AnimatedValue value={value} precision={def.precision} />
        </span>
        <span
          style={{
            fontSize: 8,
            color: 'var(--color-text-tertiary)',
            lineHeight: '12px',
          }}
        >
          {def.unit}
        </span>
    </div>
  );
}

function ParamPanel() {
  const { t } = useTranslation();
  const tagValues = usePLCStore((s) => s.tagValues);
  const [tagMappings, setTagMappings] = useState<TagMapping>(DEFAULT_MAPPINGS);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.settings.get().then((settings) => {
        if (settings.tagMappings) {
          setTagMappings(settings.tagMappings);
        }
      }).catch(() => {
        // use defaults
      });
    }
  }, []);

  const params: ParamDef[] = useMemo(
    () =>
      FIELD_META.map((field) => {
        const tagName = tagMappings[field.key] || DEFAULT_MAPPINGS[field.key];
        const meta = ICON_MAP[field.key] || { icon: <SettingOutlined />, color: '#8c8c8c', max: 100 };
        return {
          tagName,
          labelKey: field.labelKey,
          unit: field.unit,
          precision: field.precision,
          icon: meta.icon,
          color: meta.color,
          max: meta.max,
        };
      }),
    [tagMappings]
  );

  const values = useMemo(
    () =>
      params.map((p) => {
        const raw = getNumericTagValue(tagValues, p.tagName);
        return {
          ...p,
          value: raw !== undefined ? raw : 0,
          hasData: raw !== undefined,
        };
      }),
    [params, tagValues]
  );

return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 3,
        width: '100%',
      }}
    >
      {values.map((p) => (
        <div
          key={p.tagName}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: 'var(--color-text-tertiary)',
              textAlign: 'center',
              lineHeight: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t(p.labelKey)}
          </span>
          <SquareCard def={p} value={p.value} />
        </div>
      ))}
    </div>
  );
}

export default ParamPanel;