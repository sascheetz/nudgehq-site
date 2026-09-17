import { useState } from 'react';

interface ToastState {
  message: string;
  type: 'ok' | 'err' | '';
}

let toastCallback: ((msg: string, type?: 'ok' | 'err' | '') => void) | null = null;

export function showToast(msg: string, type: 'ok' | 'err' | '' = '') {
  if (toastCallback) toastCallback(msg, type);
}

export function Toast() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: '' });
  const [visible, setVisible] = useState(false);

  if (!toastCallback) {
    toastCallback = (msg: string, type: 'ok' | 'err' | '' = '') => {
      setToast({ message: msg, type });
      setVisible(true);
      setTimeout(() => setVisible(false), 3600);
    };
  }

  const bg = toast.type === 'err' ? 'rgba(255,92,92,0.15)' : toast.type === 'ok' ? 'rgba(62,207,142,0.12)' : 'var(--ink)';
  const color = toast.type === 'err' ? 'var(--fire)' : toast.type === 'ok' ? 'var(--chill)' : 'var(--bg)';
  const border = toast.type === 'err' ? 'rgba(255,92,92,0.4)' : toast.type === 'ok' ? 'rgba(62,207,142,0.35)' : 'var(--border2)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '22px',
        right: '22px',
        background: bg,
        color,
        border: `1px solid ${border}`,
        padding: '11px 18px',
        borderRadius: '8px',
        fontSize: '0.9rem',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.25s',
        pointerEvents: 'none',
        zIndex: 100,
        maxWidth: '300px',
      }}
    >
      {toast.message}
    </div>
  );
}
