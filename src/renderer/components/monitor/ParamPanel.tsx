import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import { AnimatedValue } from '../common';
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

interface ParamDef {
  tagName: string;
  labelKey: string;
  unit: string;
  fallback: number;
  precision: number;
  icon: React.ReactNode;
}

const PARAMS: ParamDef[] = [
  {
    tagName: 'furnace.temp_zone2',
    labelKey: 'monitor.temperature',
    unit: '°C',
    fallback: 950,
    precision: 0,
    icon: <FireOutlined />,
  },
  {
    tagName: 'furnace.pressure',
    labelKey: 'monitor.pressure',
    unit: ' Pa',
    fallback: 3.2,
    precision: 1,
    icon: <DashboardOutlined />,
  },
  {
    tagName: 'furnace.power',
    labelKey: 'monitor.power',
    unit: ' kW',
    fallback: 85,
    precision: 0,
    icon: <ThunderboltOutlined />,
  },
  {
    tagName: 'furnace.current',
    labelKey: 'monitor.current',
    unit: ' A',
    fallback: 128,
    precision: 1,
    icon: <LineChartOutlined />,
  },
  {
    tagName: 'furnace.voltage',
    labelKey: 'monitor.voltage',
    unit: ' V',
    fallback: 380,
    precision: 0,
    icon: <BulbOutlined />,
  },
  {
    tagName: 'furnace.flow_rate',
    labelKey: 'monitor.flowRate',
    unit: ' L/min',
    fallback: 12.5,
    precision: 1,
    icon: <ToolOutlined />,
  },
  {
    tagName: 'furnace.frequency',
    labelKey: 'monitor.frequency',
    unit: ' Hz',
    fallback: 50,
    precision: 0,
    icon: <SettingOutlined />,
  },
  {
    tagName: 'furnace.status_code',
    labelKey: 'monitor.statusCode',
    unit: '',
    fallback: 0,
    precision: 0,
    icon: <ExperimentOutlined />,
  },
];

function getNumericTagValue(
  tagValues: Map<string, { value: number | boolean }>,
  tagName: string,
  fallback: number
): number {
  const tv = tagValues.get(tagName);
  if (tv && typeof tv.value === 'number') return tv.value;
  return fallback;
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

  const values = useMemo(
    () =>
      PARAMS.map((p) => ({
        ...p,
        value: getNumericTagValue(tagValues, p.tagName, p.fallback),
      })),
    [tagValues]
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-md)',
        width: '100%',
      }}
    >
      {values.map((p) => (
        <div
          key={p.tagName}
          className="card-hover"
          style={{
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {p.icon}
            <span>{t(p.labelKey)}</span>
          </div>
          <AnimatedValue
            value={p.value}
            precision={p.precision}
            suffix={p.unit}
            style={{
              fontSize: 'var(--font-size-xxl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          />
          <SparkLine
            data={[
              p.value * 0.9,
              p.value * 0.92,
              p.value * 0.95,
              p.value * 0.93,
              p.value * 0.97,
              p.value * 0.98,
              p.value * 0.96,
              p.value * 0.99,
              p.value,
            ]}
          />
        </div>
      ))}
    </div>
  );
}

export default ParamPanel;