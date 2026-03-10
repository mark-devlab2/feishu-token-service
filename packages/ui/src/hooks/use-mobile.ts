import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function readIsMobile() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useMobile() {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    const onResize = () => setIsMobile(readIsMobile());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}
