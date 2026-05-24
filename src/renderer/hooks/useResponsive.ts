import { useState, useEffect, useCallback } from 'react';

const SM_BREAKPOINT = 1280;
const LG_BREAKPOINT = 1920;

export type Breakpoint = 'sm' | 'md' | 'lg';

function getBreakpoint(width: number): Breakpoint {
  if (width < SM_BREAKPOINT) return 'sm';
  if (width < LG_BREAKPOINT) return 'md';
  return 'lg';
}

export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'lg';
    return getBreakpoint(window.innerWidth);
  });

  const handleResize = useCallback(() => {
    setBreakpoint(getBreakpoint(window.innerWidth));
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return {
    breakpoint,
    isMobile: breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg',
  };
}