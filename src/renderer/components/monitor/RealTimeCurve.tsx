import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import { FireOutlined, DashboardOutlined, ThunderboltOutlined } from '@ant-design/icons';

interface SeriesDef {
  tagName: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  fallback: number;
}

const SERIES: SeriesDef[] = [
  {
    tagName: 'furnace.temp_zone2',
    label: 'Temp',
    color: '#fa541c',
    icon: <FireOutlined />,
    fallback: 950,
  },
  {
    tagName: 'furnace.pressure',
    label: 'Press',
    color: 'var(--color-primary)',
    icon: <DashboardOutlined />,
    fallback: 3.2,
  },
  {
    tagName: 'furnace.power',
    label: 'Power',
    color: 'var(--color-warning)',
    icon: <ThunderboltOutlined />,
    fallback: 85,
  },
];

const MAX_POINTS = 60;
const SVG_W = 600;
const SVG_H = 160;
const PAD_L = 50;
const PAD_R = 20;
const PAD_T = 15;
const PAD_B = 25;
const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_T - PAD_B;

function getNumericTagValue(
  tagValues: Map<string, { value: number | boolean }>,
  tagName: string,
  fallback: number
): number {
  const tv = tagValues.get(tagName);
  if (tv && typeof tv.value === 'number') return tv.value;
  return fallback;
}

function RealTimeCurve() {
  const { t } = useTranslation();
  const tagValues = usePLCStore((s) => s.tagValues);

  const [history, setHistory] = useState<number[][]>(() =>
    SERIES.map(() => [])
  );

  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    setHistory((prev) =>
      prev.map((series, i) => {
        const val = getNumericTagValue(tagValues, SERIES[i].tagName, SERIES[i].fallback);
        const next = [...series, val];
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
      })
    );
  }, [tagValues]);

  const renderSvg = useCallback(() => {
    const allPoints = history.flat();
    if (allPoints.length === 0) {
      allPoints.push(0);
    }

    const globalMin = Math.min(...allPoints);
    const globalMax = Math.max(...allPoints, globalMin + 1);
    const range = globalMax - globalMin || 1;

    const yGridLines = 5;
    const gridLines = Array.from({ length: yGridLines }, (_, i) => {
      const val = globalMin + (range / (yGridLines - 1)) * i;
      const y = PAD_T + PLOT_H - ((val - globalMin) / range) * PLOT_H;
      return { val, y };
    });

    return (
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: '100%' }}
      >
        {gridLines.map((gl, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={PAD_L}
              y1={gl.y}
              x2={PAD_L + PLOT_W}
              y2={gl.y}
              stroke="var(--color-border-secondary)"
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
            <text
              x={PAD_L - 6}
              y={gl.y + 3}
              fill="var(--color-text-tertiary)"
              fontSize="9"
              textAnchor="end"
            >
              {gl.val.toFixed(1)}
            </text>
          </g>
        ))}

        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth="0.5"
        />
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth="0.5"
        />

        {history.map((series, si) => {
          if (series.length < 2) return null;
          const points = series
            .map((v, i) => {
              const x = PAD_L + (i / (MAX_POINTS - 1)) * PLOT_W;
              const y = PAD_T + PLOT_H - ((v - globalMin) / range) * PLOT_H;
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polyline
              key={`line-${si}`}
              points={points}
              fill="none"
              stroke={SERIES[si].color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    );
  }, [history]);

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-lg)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {t('monitor.realtimeCurve')}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
          {SERIES.map((s) => (
            <div
              key={s.tagName}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span style={{ color: s.color, display: 'flex', alignItems: 'center' }}>
                {s.icon}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 160 }}>{renderSvg()}</div>
    </div>
  );
}

export default RealTimeCurve;