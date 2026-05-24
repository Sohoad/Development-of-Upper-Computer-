import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import { FireOutlined, DashboardOutlined, ThunderboltOutlined, LineChartOutlined } from '@ant-design/icons';

interface GaugeDef {
  tagName: string;
  labelKey: string;
  unit: string;
  fallback: number;
  min: number;
  max: number;
  icon: React.ReactNode;
  color: string;
}

const GAUGES: GaugeDef[] = [
  {
    tagName: 'furnace.temp_zone2',
    labelKey: 'monitor.temperature',
    unit: '°C',
    fallback: 950,
    min: 0,
    max: 1200,
    icon: <FireOutlined />,
    color: '#fa541c',
  },
  {
    tagName: 'furnace.pressure',
    labelKey: 'monitor.pressure',
    unit: ' Pa',
    fallback: 3.2,
    min: 0,
    max: 10,
    icon: <DashboardOutlined />,
    color: 'var(--color-primary)',
  },
  {
    tagName: 'furnace.power',
    labelKey: 'monitor.power',
    unit: ' kW',
    fallback: 85,
    min: 0,
    max: 120,
    icon: <ThunderboltOutlined />,
    color: 'var(--color-warning)',
  },
  {
    tagName: 'furnace.current',
    labelKey: 'monitor.current',
    unit: ' A',
    fallback: 128,
    min: 0,
    max: 200,
    icon: <LineChartOutlined />,
    color: 'var(--color-success)',
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

const ARC_R = 52;
const ARC_SWEEP = 240;
const ARC_START = 150;
const CENTER = 70;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function CircularGauge({ gauge, value }: { gauge: GaugeDef; value: number }) {
  const ratio = Math.max(0, Math.min(1, (value - gauge.min) / (gauge.max - gauge.min)));
  const needleAngle = ARC_START + ratio * ARC_SWEEP;

  const backArc = describeArc(CENTER, CENTER, ARC_R, ARC_START, ARC_START + ARC_SWEEP);
  const filledArc =
    ratio > 0
      ? describeArc(CENTER, CENTER, ARC_R, ARC_START, ARC_START + ratio * ARC_SWEEP)
      : '';

  const needleTip = polarToCartesian(CENTER, CENTER, ARC_R - 8, needleAngle);
  const needleBase1 = polarToCartesian(CENTER, CENTER, 5, needleAngle - 90);
  const needleBase2 = polarToCartesian(CENTER, CENTER, 5, needleAngle + 90);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-xs)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        {gauge.icon}
        <span>{gauge.labelKey}</span>
      </div>
      <svg viewBox="0 0 140 110" width="140" height="110">
        <path d={backArc} fill="none" stroke="var(--color-border)" strokeWidth="8" strokeLinecap="round" />
        {filledArc && (
          <path
            d={filledArc}
            fill="none"
            stroke={gauge.color}
            strokeWidth="8"
            strokeLinecap="round"
            style={{ transition: 'd 0.5s var(--ease-out)' }}
          />
        )}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill="var(--color-text-primary)"
          style={{ transition: 'transform 0.5s var(--ease-out)', transformOrigin: `${CENTER}px ${CENTER}px` }}
        />
        <circle cx={CENTER} cy={CENTER} r="5" fill="var(--color-text-primary)" />
        <text
          x={CENTER}
          y={CENTER + 24}
          textAnchor="middle"
          fill="var(--color-text-primary)"
          fontSize="14"
          fontWeight="700"
        >
          {value.toFixed(1)}
        </text>
        <text
          x={CENTER}
          y={CENTER + 38}
          textAnchor="middle"
          fill="var(--color-text-tertiary)"
          fontSize="10"
        >
          {gauge.unit}
        </text>
      </svg>
    </div>
  );
}

function GaugePanel() {
  const { t } = useTranslation();
  const tagValues = usePLCStore((s) => s.tagValues);

  const values = useMemo(
    () =>
      GAUGES.map((g) => ({
        gauge: g,
        value: getNumericTagValue(tagValues, g.tagName, g.fallback),
        label: t(g.labelKey),
      })),
    [tagValues, t]
  );

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-lg)',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        {values.map((v) => (
          <CircularGauge key={v.gauge.tagName} gauge={v.gauge} value={v.value} />
        ))}
      </div>
    </div>
  );
}

export default GaugePanel;