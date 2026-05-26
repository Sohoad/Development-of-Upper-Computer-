import { useMemo } from 'react';
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

const CX = 40;
const CY = 40;
const R = 32;
const SW = 4;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(p1: { x: number; y: number }, p2: { x: number; y: number }, r: number, large: number) {
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}

function GaugeRing({ def }: { def: GaugeDef }) {
  const tagValues = usePLCStore((s) => s.tagValues);
  const tv = tagValues.get(def.tagName);
  const raw = tv && typeof tv.value === 'number' ? tv.value : 0;
  const val = Math.min(Math.max(raw, 0), def.max);
  const frac = val / def.max;

  const a1 = -210;
  const a2 = 30;
  const span = a2 - a1;
  const ang = a1 + span * frac;

  const bg1 = polar(CX, CY, R, a1);
  const bg2 = polar(CX, CY, R, a2);
  const val1 = polar(CX, CY, R, a1);
  const val2 = polar(CX, CY, R, ang);
  const needleEnd = polar(CX, CY, R * 0.72, ang);

  const bgArc = arc(bg1, bg2, R, 0);
  const valArc = arc(val1, val2, R, frac > 0.5 ? 1 : 0);

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        <path d={bgArc} fill="none" stroke="var(--color-border-secondary)" strokeWidth={SW} strokeLinecap="round" />
        <path d={valArc} fill="none" stroke={def.color} strokeWidth={SW} strokeLinecap="round" style={{ transition: 'd 0.4s ease' }} />
        <line x1={CX} y1={CY} x2={needleEnd.x} y2={needleEnd.y} stroke={def.color} strokeWidth="1.5" strokeLinecap="round" style={{ transition: 'all 0.4s ease' }} />
        <circle cx={CX} cy={CY} r="2.5" fill={def.color} />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: '18px' }}>
        <AnimatedValue value={val} precision={def.precision} />
      </span>
      <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', lineHeight: '14px' }}>{def.unit}</span>
    </div>
  );
}

function GaugePanel() {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, height: '100%' }}>
      {GAUGES.map((g) => (
        <div key={g.tagName} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: '14px' }}>
            {t(g.labelKey)}
          </span>
          <GaugeRing def={g} />
        </div>
      ))}
    </div>
  );
}

export default GaugePanel;