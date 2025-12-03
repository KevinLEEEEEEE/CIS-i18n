import { useEffect, useRef } from 'react';
import { emit } from '@create-figma-plugin/utilities';
import { ResizeWindowHandler } from '../../types';

export default function useAutoResize(deps: any[], width: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      emit<ResizeWindowHandler>('RESIZE_WINDOW', { width, height: h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, deps);
  return ref;
}
