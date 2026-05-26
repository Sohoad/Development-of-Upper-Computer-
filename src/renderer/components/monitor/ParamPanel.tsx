import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useBreakpoint from 'antd/es/grid/hooks/useBreakpoint';
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
}

const ICON_MAP: Record<string, React.ReactNode> = {
  monitorTemperature: <FireOutlined />,
  monitorPressure: <DashboardOutlined />,
  monitorPower: <ThunderboltOutlined />,
  monitorCurrent: <LineChartOutlined />,
  monitorVoltage: <BulbOutlined />,
  monitorFlowRate: <ToolOutlined />,
  monitorFrequency: <SettingOutlined />,
  monitorStatusCode: <ExperimentOutlined />,
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

function SparkLine({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const width = 80;
  const height = 20;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
    )
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ParamPanel() {
  const { t } = useTranslation();
  const tagValues = usePLCStore((s) => s.tagValues);
  const [tagMappings, setTagMappings] = useState<TagMapping>(DEFAULT_MAPPINGS);
  const bp = useBreakpoint();

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
        return {
          tagName,
          labelKey: field.labelKey,
          unit: field.unit,
          precision: field.precision,
          icon: ICON_MAP[field.key] || <SettingOutlined />,
        };
      }),
    [tagMappings]
  );

  const values = useMemo(
    () =>
      params.map((p) => {
        const raw = getNumericTagValue(tagValues, p.tagName);
        const fallback = raw ?? 0;
        return {
          ...p,
          value: raw,
          displayValue: raw !== undefined ? raw : 0,
          hasData: raw !== undefined,
        };
      }),
    [params, tagValues]
  );

  const colCount = bp.xs ? 2 : bp.sm ? 4 : 8;

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gap: 4,
          width: '100%',
        }}
      >
      {values.map((p) => (
        <div
          key={p.tagName}
          className="card-hover"
          style={{
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            padding: '3px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: 'var(--color-text-secondary)',
              fontSize: 9,
            }}
          >
            {p.icon}
            <span>{t(p.labelKey)}</span>
          </div>
          <AnimatedValue
            value={p.displayValue}
            precision={p.precision}
            suffix={p.unit}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: '16px',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default ParamPanel;