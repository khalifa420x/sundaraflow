'use client';

import { useEffect, useRef, useState } from 'react';

type ToastData = { icon: string; title: string; msg: string };

/** Déclenche un toast depuis n'importe quel composant client */
export function fireToast(icon: string, title: string, msg: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sundara:toast', { detail: { icon, title, msg } })
    );
  }
}

/** Composant Toast — à placer une fois dans la page */
export default function Toast() {
  const [data, setData] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<ToastData>).detail;
      setData(d);
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 3800);
    };
    window.addEventListener('sundara:toast', handler);
    return () => window.removeEventListener('sundara:toast', handler);
  }, []);

  if (!data) return null;
  return (
    <div className={`toast${visible ? ' show' : ''}`}>
      <div className="toast-icon">{data.icon}</div>
      <div className="toast-text">
        <strong>{data.title}</strong>
        <span>{data.msg}</span>
      </div>
      <div className="toast-close" onClick={() => setVisible(false)}>✕</div>
    </div>
  );
}
