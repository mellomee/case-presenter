import { useEffect, useMemo, useRef, useState } from 'react';

export default function useStoredSplitWidths(storageKey, initialWidths) {
  const [widths, setWidths] = useState(() => {
    if (typeof window === 'undefined') return initialWidths;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      return saved && typeof saved === 'object' ? { ...initialWidths, ...saved } : initialWidths;
    } catch {
      return initialWidths;
    }
  });

  const dragRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [storageKey, widths]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragRef.current) return;
      const { type, startX, startWidths } = dragRef.current;
      const delta = event.clientX - startX;

      if (type === 'left') {
        setWidths({
          ...startWidths,
          left: Math.max(300, startWidths.left + delta),
          middle: Math.max(320, startWidths.middle - delta),
        });
      }

      if (type === 'right') {
        setWidths({
          ...startWidths,
          middle: Math.max(320, startWidths.middle + delta),
          right: Math.max(380, startWidths.right - delta),
        });
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag = useMemo(() => ({
    left: (event) => {
      dragRef.current = { type: 'left', startX: event.clientX, startWidths: widths };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    right: (event) => {
      dragRef.current = { type: 'right', startX: event.clientX, startWidths: widths };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
  }), [widths]);

  return { widths, startDrag };
}