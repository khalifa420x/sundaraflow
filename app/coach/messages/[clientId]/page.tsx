'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { subscribeToMessages, sendMessage, markAsRead } from '@/lib/messaging';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';

const MSG_GAP_MS = 5 * 60 * 1000; // 5 minutes

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function CoachConversationPage() {
  const params = useParams();
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [clientName, setClientName] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const coachIdRef = useRef<string>('');

  const clientId = (params?.clientId as string) ?? '';

  /* Auth */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      setUid(u.uid);
      coachIdRef.current = u.uid;
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? snap.data() : {};
        setUserName(d.name || u.displayName || u.email?.split('@')[0] || 'Coach');
      } catch {
        setUserName(u.displayName || 'Coach');
      }
    });
    return () => unsub();
  }, []);

  /* Nom du client */
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', clientId));
        if (snap.exists()) {
          const d = snap.data();
          setClientName(d.name || d.displayName || d.email?.split('@')[0] || 'Membre');
          return;
        }
        const cSnap = await getDocs(query(collection(db, 'clients'), where('clientUserId', '==', clientId)));
        if (!cSnap.empty) setClientName(cSnap.docs[0].data().name || 'Membre');
      } catch (e) {
        console.error('fetch clientName error:', e);
        setClientName('Membre');
      }
    })();
  }, [clientId]);

  /* Abonnement messages temps réel */
  useEffect(() => {
    if (!uid || !clientId) return;
    const coachId = coachIdRef.current;

    const unsub = subscribeToMessages(
      coachId,
      clientId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
        markAsRead(coachId, clientId, 'coach');
      },
      (err) => {
        console.error('Messages error:', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [uid, clientId]);

  /* Scroll auto vers le bas */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    const coachId = coachIdRef.current;
    if (!coachId || !clientId) return;
    await sendMessage(coachId, clientId, coachId, userName, content);
  };

  return (
    <ProtectedRoute role="coach">
      <div style={{
        display: 'flex',
        height: '100vh',
        background: '#131313',
        color: '#e5e2e1',
        fontFamily: 'Inter, sans-serif',
        overflowX: 'hidden',
      }}>
        <Sidebar role="coach" />

        {/* Colonne conversation */}
        <div className="page-main" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflowX: 'hidden',
          minWidth: 0,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#1a1a1a',
            flexShrink: 0,
            zIndex: 10,
          }}>
            <button
              onClick={() => router.push('/coach/messages')}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '4px 8px 4px 0',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ←
            </button>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#89070e,#b22a27)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '.68rem',
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'Lexend, sans-serif',
              flexShrink: 0,
            }}>
              {initials(clientName || 'M')}
            </div>
            <div>
              <div style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 800,
                fontSize: '.95rem',
                color: '#e5e2e1',
                lineHeight: 1.2,
              }}>
                {clientName || 'Membre'}
              </div>
              <div style={{
                fontSize: '.62rem',
                color: '#9CA3AF',
                fontFamily: 'Inter, sans-serif',
              }}>
                Membre
              </div>
            </div>
          </div>

          {/* Zone messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: 12,
                color: '#9CA3AF',
                fontSize: '.82rem',
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.07)',
                  borderTopColor: '#b22a27',
                  animation: 'spin .8s linear infinite',
                }} />
                Chargement…
              </div>
            ) : messages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B7280',
                fontSize: '.82rem',
                textAlign: 'center',
              }}>
                Aucun message — démarrez la conversation avec {clientName || 'ce membre'}.
              </div>
            ) : (
              messages.map((msg, i) => {
                const prev = messages[i - 1];
                const prevTs = prev?.timestamp?.toDate ? prev.timestamp.toDate().getTime() : 0;
                const curTs = msg.timestamp?.toDate ? msg.timestamp.toDate().getTime() : 0;
                const showTimestamp = i === 0 || (curTs - prevTs) > MSG_GAP_MS;

                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === uid}
                    showTimestamp={showTimestamp}
                  />
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <MessageInput onSend={handleSend} disabled={!uid} />
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .page-main { margin-left: 0; width: 100%; }
          @media (min-width: 768px) { .page-main { margin-left: 240px; width: calc(100% - 240px); } }
          @media (max-width: 767px) { .page-main { margin-left: 0 !important; width: 100% !important; } }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
