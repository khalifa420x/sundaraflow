'use client';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any;
  read: boolean;
  type: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp: boolean;
}

export default function MessageBubble({ message, isOwn, showTimestamp }: MessageBubbleProps) {
  const ts: Date = message.timestamp?.toDate
    ? message.timestamp.toDate()
    : new Date();

  const isToday = new Date().toDateString() === ts.toDateString();
  const timeStr = ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const label = isToday ? timeStr : `${dateStr} · ${timeStr}`;

  return (
    <div style={{ animation: 'msgFadeIn .22s ease' }}>
      {showTimestamp && (
        <div style={{
          textAlign: 'center',
          fontSize: '.6rem',
          color: '#6B7280',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '.06em',
          margin: '16px 0 10px',
        }}>
          {label}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 4,
        paddingLeft: isOwn ? 48 : 0,
        paddingRight: isOwn ? 0 : 48,
      }}>
        <div style={{
          maxWidth: 'min(75%, 280px)',
          padding: '10px 14px',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOwn ? '#b22a27' : '#2a2a2a',
          color: '#e5e2e1',
          fontFamily: 'Inter, sans-serif',
          fontSize: '.875rem',
          lineHeight: 1.55,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
        }}>
          {message.content}
        </div>
      </div>

      <style>{`
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
