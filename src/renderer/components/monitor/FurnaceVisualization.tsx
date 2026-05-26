import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';

function getNumericTagValue(
  tagValues: Map<string, { value: number | boolean }>,
  tagName: string,
  fallback: number
): number {
  const tv = tagValues.get(tagName);
  if (tv && typeof tv.value === 'number') return tv.value;
  return fallback;
}

interface TemperatureZone {
  label: string;
  tagName: string;
  fallback: number;
  y: number;
  height: number;
}

const ZONES: TemperatureZone[] = [
  { label: 'Top', tagName: 'furnace.temp_zone1', fallback: 780, y: 12, height: 85 },
  { label: 'Middle', tagName: 'furnace.temp_zone2', fallback: 950, y: 98, height: 85 },
  { label: 'Bottom', tagName: 'furnace.temp_zone3', fallback: 620, y: 183, height: 85 },
];

function tempToColor(temp: number): string {
  const t = Math.max(0, Math.min(1200, temp)) / 1200;
  let r: number, g: number, b: number;
  if (t < 0.25) {
    const s = t / 0.25;
    r = Math.round(0 + s * 0);
    g = Math.round(100 + s * 155);
    b = Math.round(255 - s * 105);
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    r = Math.round(s * 255);
    g = Math.round(255 - s * 55);
    b = Math.round(150 - s * 150);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    r = 255;
    g = Math.round(200 - s * 200);
    b = 0;
  } else {
    const s = (t - 0.75) / 0.25;
    r = 255;
    g = Math.round(s * 55);
    b = 0;
  }
  return `rgb(${r},${g},${b})`;
}

function FurnaceVisualization() {
  const { t } = useTranslation();
  const tagValues = usePLCStore((s) => s.tagValues);
  const alarms = usePLCStore((s) => s.alarms);

  const zoneTemps = useMemo(
    () =>
      ZONES.map((z) => ({
        ...z,
        temp: getNumericTagValue(tagValues, z.tagName, z.fallback),
      })),
    [tagValues]
  );

  const liquidLevel = useMemo(
    () => getNumericTagValue(tagValues, 'furnace.level', 55),
    [tagValues]
  );

  const hasAlarms = alarms.length > 0;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <svg
        viewBox="0 0 360 320"
        style={{
          width: '100%',
          maxWidth: 340,
          height: 'auto',
          filter: hasAlarms ? 'drop-shadow(0 0 8px rgba(211,32,41,0.5))' : undefined,
        }}
      >
        <defs>
          {ZONES.map((z, i) => (
            <linearGradient
              key={`grad-${i}`}
              id={`zoneGrad-${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={tempToColor(zoneTemps[i].temp)} stopOpacity="0.85" />
              <stop offset="100%" stopColor={tempToColor(zoneTemps[i].temp)} stopOpacity="0.55" />
            </linearGradient>
          ))}
          <linearGradient id="crucibleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={tempToColor(getNumericTagValue(tagValues, 'furnace.temp_zone3', 620))}
              stopOpacity="0.7"
            />
            <stop
              offset="100%"
              stopColor={tempToColor(getNumericTagValue(tagValues, 'furnace.temp_zone3', 620))}
              stopOpacity="0.9"
            />
          </linearGradient>
          <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ff4500" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#cc3300" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="360" height="320" rx="10" fill="var(--color-bg-elevated)" stroke="var(--color-border)" strokeWidth="1" />

        {ZONES.map((z, i) => (
          <rect
            key={`zone-${i}`}
            x="50"
            y={z.y}
            width="172"
            height={z.height}
            rx="4"
            fill={`url(#zoneGrad-${i})`}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
            style={{ transition: 'fill 0.5s var(--ease-out)' }}
          />
        ))}

        <rect
          x="86"
          y="86"
          width="104"
          height="170"
          rx="8"
          fill="url(#crucibleGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />

        <rect
          x="86"
          y={86 + (170 * (100 - liquidLevel)) / 100}
          width="104"
          height={(170 * liquidLevel) / 100}
          rx="6"
          fill="url(#liquidGrad)"
          style={{ transition: 'y 0.5s var(--ease-out), height 0.5s var(--ease-out)' }}
        />

        {Array.from({ length: 6 }).map((_, i) => (
          <g key={`coil-left-${i}`}>
            <circle
              cx="46"
              cy={42 + i * 42}
              r="8"
              fill="none"
              stroke={i % 2 === 0 ? 'var(--color-warning)' : '#fa541c'}
              strokeWidth="2"
              strokeDasharray="3 2"
              style={{
                animation: `status-pulse-warning ${1.5 + i * 0.3}s infinite`,
              }}
            />
          </g>
        ))}

        {Array.from({ length: 6 }).map((_, i) => (
          <g key={`coil-right-${i}`}>
            <circle
              cx="226"
              cy={42 + i * 42}
              r="8"
              fill="none"
              stroke={i % 2 === 0 ? 'var(--color-warning)' : '#fa541c'}
              strokeWidth="2"
              strokeDasharray="3 2"
              style={{
                animation: `status-pulse-warning ${1.5 + i * 0.3}s infinite`,
              }}
            />
          </g>
        ))}

        {zoneTemps.map((z, i) => (
          <g key={`label-${i}`}>
            <text
              x="232"
              y={z.y + z.height / 2 + 3}
              fill="var(--color-text-primary)"
              fontSize="11"
              fontWeight="600"
            >
              {z.label}
            </text>
            <text
              x="232"
              y={z.y + z.height / 2 + 18}
              fill={tempToColor(z.temp)}
              fontSize="15"
              fontWeight="700"
            >
              {Math.round(z.temp)}°C
            </text>
          </g>
        ))}

        <text
          x="138"
          y={288}
          fill="var(--color-text-secondary)"
          fontSize="10"
          textAnchor="middle"
        >
          {t('monitor.furnace')}
        </text>

        <text
          x="138"
          y={305}
          fill="var(--color-text-tertiary)"
          fontSize="9"
          textAnchor="middle"
        >
          {`Liquid Level: ${Math.round(liquidLevel)}%`}
        </text>

        <text x="180" y="20" fill="var(--color-text-secondary)" fontSize="10" textAnchor="middle">
          Exhaust
        </text>
        <rect
          x="172"
          y="25"
          width="16"
          height="25"
          rx="2"
          fill="var(--color-bg-spotlight)"
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export default FurnaceVisualization;