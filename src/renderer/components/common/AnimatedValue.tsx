import { useState, useEffect, useRef } from 'react';

interface AnimatedValueProps {
  value: number;
  precision?: number;
  suffix?: string;
  prefix?: string;
  style?: React.CSSProperties;
  className?: string;
}

function AnimatedValue({
  value,
  precision = 0,
  suffix = '',
  prefix = '',
  style,
  className,
}: AnimatedValueProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flashState, setFlashState] = useState<'increase' | 'decrease' | null>(null);
  const prevValueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (value !== prev) {
      setDisplayValue(value);
      setFlashState(value > prev ? 'increase' : 'decrease');
      prevValueRef.current = value;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setFlashState(null);
        timerRef.current = null;
      }, 800);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value]);

  const flashClass = flashState ? ` ${flashState}` : '';

  return (
    <span
      className={`animated-value${flashClass}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {prefix}
      {displayValue.toFixed(precision)}
      {suffix}
    </span>
  );
}

export default AnimatedValue;