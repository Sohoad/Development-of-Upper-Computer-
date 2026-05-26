import { useTranslation } from 'react-i18next';
import { usePLCStore } from '../../stores/plcStore';
import AnimatedValue from '../common/AnimatedValue';

interface GaugeDef {
  tagName: string;
  labelKey: string;
  unit: string;
  max: number;
  color: string;
  precision: number;
}

const GAUGES: GaugeDef[] = [
  { tagName: 'furnace.temp_zone2', labelKey: 'monitor.temperature', unit: '℃', max: 1200, color: '#fa541c', precision: 0 },
  { tagName: 'furnace.pressure', labelKey: 'monitor.pressure', unit: 'Pa', max: 10, color: '#177ddc', precision: 1 },
  { tagName: 'furnace.power', labelKey: 'monitor.power', unit: 'kW', max: 150, color: '#d89614', precision: 0 },
  { tagName: 'furnace.current', labelKey: 'monitor.current', unit: 'A', max: 300, color: '#49aa19', precision: 0 },
];

function SquareCard({ def }: { def: GaugeDef }) {
  const tagValues = usePLCStore((s) => s.tagValues);
  const tv = tagValues.get(def.tagName);
  const raw = tv && typeof tv.value === 'number' ? tv.value : 0;
  const val = Math.min(Math.max(raw, 0), def.max);
  const frac = val / def.max;

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
        padding: '6px 4px',
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
          top: 0,
          left: 0,
          height: `${frac * 100}%`,
          width: 3,
          background: def.color,
          borderRadius: '0 0 2px 2px',
          transition: 'height 0.4s ease',
          opacity: 0.6,
        }}
      />
      <span
        style={{
          fontSize: 8,
          color: 'var(--color-text-tertiary)',
          lineHeight: '12px',
          marginBottom: 2,
          textAlign: 'center',
        }}
      >
        {def.labelKey}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: def.color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: '22px',
        }}
      >
        <AnimatedValue value={val} precision={def.precision} />
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

function GaugePanel() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4,
        height: '100%',
      }}
    >
      {GAUGES.map((g) => (
        <div
          key={g.tagName}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: 'var(--color-text-tertiary)',
              textAlign: 'center',
              lineHeight: '12px',
            }}
          >
            {t(g.labelKey)}
          </span>
          <SquareCard def={g} />
        </div>
      ))}
    </div>
  );
}

export default GaugePanel;