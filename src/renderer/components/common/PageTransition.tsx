import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  direction?: 'fade' | 'slide-right' | 'slide-left' | 'slide-up';
  style?: React.CSSProperties;
}

function PageTransition({ children, direction = 'fade', style }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const dirClass =
    direction === 'fade'
      ? ''
      : direction === 'slide-right'
        ? ' slide-right'
        : direction === 'slide-left'
          ? ' slide-left'
          : ' slide-up';

  return (
    <div
      className={`page-transition${dirClass}`}
      style={{ opacity: mounted ? undefined : 0, ...style }}
    >
      {children}
    </div>
  );
}

export default PageTransition;