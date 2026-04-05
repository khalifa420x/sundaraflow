'use client';

import { useState } from 'react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = !!value.trim() && !sending && !disabled;

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = value.trim();
    setSending(true);
    setValue('');
    try {
      await onSend(trimmed);
    } catch (e) {
      console.error('send error:', e);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '12px 16px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: '#1a1a1a',
      flexShrink: 0,
    }}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Écrire un message..."
        disabled={disabled || sending}
        style={{
          flex: 1,
          background: '#1c1b1b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '10px 14px',
          color: '#e5e2e1',
          fontFamily: 'Inter, sans-serif',
          fontSize: '.875rem',
          outline: 'none',
          transition: 'border-color .2s',
          minWidth: 0,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#b22a27'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          width: 44,
          height: 44,
          background: canSend ? '#b22a27' : 'rgba(178,42,39,0.3)',
          border: 'none',
          borderRadius: 10,
          color: '#e5e2e1',
          fontSize: '1.1rem',
          cursor: canSend ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background .2s',
        }}
        onMouseEnter={e => { if (canSend) (e.currentTarget).style.background = '#89070e'; }}
        onMouseLeave={e => { (e.currentTarget).style.background = canSend ? '#b22a27' : 'rgba(178,42,39,0.3)'; }}
      >
        →
      </button>
    </div>
  );
}
