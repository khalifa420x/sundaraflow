'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, getDocs,
  doc, getDoc,
} from 'firebase/firestore';
import { subscribeToMessages, sendMessage, markAsRead } from '@/lib/messaging';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';

const MSG_GAP_MS = 5 * 60 * 1000;

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ClientMessagesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCoach, setNoCoach] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  /* Auth + nom client */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? snap.data() : {};
        setUserName(d.name || u.displayName || u.email?.split('@')[0] || 'vous');
      } catch {
        setUserName(u.displayName || 'vous');
      }
    });
    return () => unsub();
  }, []);

  /* Trouver le coach du client */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const cSnap = await getDocs(
          query(collection(db, 'clients'), where('clientUserId', '==', uid)),
        );
        if (cSnap.empty) { setNoCoach(true); setLoading(false); return; }

        const cId = cSnap.docs[0].data().coachId as string;
        setCoachId(cId);

        const coachDoc = await getDoc(doc(db, 'users', cId));
        if (coachDoc.exists()) {
          const d = coachDoc.data();
          setCoachName(d.name || d.displayName || d.email?.split('@')[0] || 'Votre coach');
        } else {
          setCoachName('Votre coach');
        }
      } catch (e) {
        console.error('fetch coach error:', e);
        setNoCoach(true);
        setLoading(false);
      }
    })();
  }, [uid]);

  /* Abonnement messages temps réel */
  useEffect(() => {
    if (!uid || !coachId) return;

    const unsub = subscribeToMessages(coachId, uid, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      markAsRead(coachId, uid, 'client');
    });

    return () => unsub();
  }, [uid, coachId]);

  /* Scroll auto vers le bas */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!uid || !coachId) return;
    await sendMessage(coachId, uid, uid, userName, content);
  };

  return (
    <ProtectedRoute role="client">
      <div style={{
        display: 'flex',
        height: '100vh',
        background: '#131313',
        color: '#e5e2e1',
        fontFamily: 'Inter, sans-serif',
        overflowX: 'hidden',
      }}>
        <Sidebar role="client" />

        <div style={{
          flex: 1,
          marginLeft: 240,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflowX: 'hidden',
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
          }}>
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
              {initials(coachName || 'C')}
            </div>
            <div>
              <div style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 800,
                fontSize: '.95rem',
                color: '#e5e2e1',
                lineHeight: 1.2,
              }}>
                {coachName || 'Votre coach'}
              </div>
              <div style={{
                fontSize: '.62rem',
                color: '#b22a27',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}>
                Votre coach
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
            ) : noCoach ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 12,
                color: '#9CA3AF',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem' }}>💬</div>
                <p style={{ fontSize: '.875rem', margin: 0, lineHeight: 1.7 }}>
                  Aucun coach assigné — contactez l'équipe SundaraFlow.
                </p>
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
                Aucun message — envoyez votre premier message à votre coach.
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
          <MessageInput onSend={handleSend} disabled={!uid || !coachId || noCoach} />
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 767px) {
            div[style*="margin-left: 240"] { margin-left: 0 !important; }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
