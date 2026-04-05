'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, orderBy,
  getDocs, doc, getDoc, setDoc, Timestamp,
} from 'firebase/firestore';
import { getConversationId } from '@/lib/messaging';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';

/* ── Types ── */
interface Conversation {
  id: string;
  coachId: string;
  clientId: string;
  clientName: string;
  coachName: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadCoach: number;
  unreadClient: number;
}

interface Member {
  id: string;        /* doc ID dans 'clients' */
  clientUserId: string;
  name: string;
  email: string;
}

/* ── Helpers ── */
function relativeTime(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'maintenant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#89070e,#b22a27)',
  'linear-gradient(135deg,#7a1212,#9E1B1B)',
  'linear-gradient(135deg,#16a34a,#15803d)',
  'linear-gradient(135deg,#374151,#4B5563)',
];

/* ════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════ */
export default function CoachMessagesPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [coachName, setCoachName] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  /* Modale */
  const [showModal, setShowModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [startingWith, setStartingWith] = useState<string | null>(null);

  /* ── Auth ── */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? snap.data() : {};
        setCoachName(d.name || u.displayName || u.email?.split('@')[0] || 'Coach');
      } catch {
        setCoachName(u.displayName || 'Coach');
      }
    });
    return () => unsub();
  }, []);

  /* ── Conversations temps réel ── */
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'conversations'),
      where('coachId', '==', uid),
      orderBy('lastMessageAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
        setLoading(false);
      },
      (err) => { console.error('conversations snapshot:', err); setLoading(false); },
    );
    return () => unsub();
  }, [uid]);

  /* ── Charger les membres (au clic sur le bouton) ── */
  const openModal = async () => {
    setShowModal(true);
    if (members.length > 0 || !uid) return;
    setLoadingMembers(true);
    try {
      const cSnap = await getDocs(
        query(collection(db, 'clients'), where('coachId', '==', uid)),
      );
      const list: Member[] = [];
      for (const docSnap of cSnap.docs) {
        const data = docSnap.data();
        const clientUserId: string = data.clientUserId || data.userId || '';
        let name = data.name || '';
        let email = data.email || '';
        if (clientUserId && (!name || !email)) {
          try {
            const uDoc = await getDoc(doc(db, 'users', clientUserId));
            if (uDoc.exists()) {
              const ud = uDoc.data();
              name = name || ud.name || ud.displayName || '';
              email = email || ud.email || '';
            }
          } catch { /* ignore */ }
        }
        if (!name) name = email.split('@')[0] || 'Membre';
        list.push({ id: docSnap.id, clientUserId, name, email });
      }
      setMembers(list);
    } catch (e) {
      console.error('fetch members error:', e);
    }
    setLoadingMembers(false);
  };

  /* ── Démarrer / ouvrir une conversation ── */
  const startConversation = async (member: Member) => {
    if (!uid || startingWith) return;
    setStartingWith(member.clientUserId);
    try {
      const convId = getConversationId(uid, member.clientUserId);
      await setDoc(
        doc(db, 'conversations', convId),
        {
          coachId: uid,
          clientId: member.clientUserId,
          coachName,
          clientName: member.name,
          lastMessage: '',
          lastMessageAt: Timestamp.now(),
          unreadCoach: 0,
          unreadClient: 0,
        },
        { merge: true },
      );
      setShowModal(false);
      router.push(`/coach/messages/${member.clientUserId}`);
    } catch (e) {
      console.error('startConversation error:', e);
    }
    setStartingWith(null);
  };

  /* ════════ RENDER ════════ */
  return (
    <ProtectedRoute role="coach">
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#131313',
        color: '#e5e2e1',
        fontFamily: 'Inter, sans-serif',
        overflowX: 'hidden',
      }}>
        <Sidebar role="coach" />

        <main style={{
          flex: 1,
          marginLeft: 240,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
        }}>

          {/* ── En-tête ── */}
          <div style={{
            padding: '28px 32px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontSize: '.56rem',
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 700,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: '#b22a27',
                marginBottom: 8,
              }}>
                💬 Messagerie
              </div>
              <h1 style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(1.4rem,3vw,2rem)',
                letterSpacing: '-.04em',
                color: '#e5e2e1',
                margin: 0,
              }}>
                MES <span style={{ color: '#b22a27' }}>CONVERSATIONS.</span>
              </h1>
            </div>

            <button
              onClick={openModal}
              style={{
                background: 'linear-gradient(135deg,#89070e,#0e0e0e)',
                color: '#e5e2e1',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 700,
                fontSize: '.7rem',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'opacity .2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget).style.opacity = '.85'; }}
              onMouseLeave={e => { (e.currentTarget).style.opacity = '1'; }}
            >
              DÉMARRER UNE CONVERSATION +
            </button>
          </div>

          {/* ── Liste des conversations ── */}
          <div style={{ flex: 1, padding: '16px 24px' }}>
            {loading ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '60px 0', gap: 12, color: '#9CA3AF', fontSize: '.82rem',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27',
                  animation: 'spin .8s linear infinite',
                }} />
                Chargement…
              </div>

            ) : conversations.length === 0 ? (
              /* ── État vide ── */
              <div style={{
                background: '#1c1b1b',
                borderRadius: 16,
                padding: '56px 32px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.05)',
                marginTop: 8,
                maxWidth: 520,
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>💬</div>
                <p style={{
                  color: '#e5e2e1',
                  fontSize: '.95rem',
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 700,
                  margin: '0 0 10px',
                  letterSpacing: '-.02em',
                }}>
                  Aucune conversation pour le moment.
                </p>
                <p style={{
                  color: '#9CA3AF',
                  fontSize: '.8rem',
                  margin: '0 0 28px',
                  lineHeight: 1.7,
                }}>
                  Cliquez sur + pour démarrer un échange avec l'un de vos membres.
                </p>
                <button
                  onClick={openModal}
                  style={{
                    background: 'linear-gradient(135deg,#89070e,#0e0e0e)',
                    color: '#e5e2e1',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 28px',
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 700,
                    fontSize: '.7rem',
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'opacity .2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.opacity = '.85'; }}
                  onMouseLeave={e => { (e.currentTarget).style.opacity = '1'; }}
                >
                  DÉMARRER UNE CONVERSATION →
                </button>
              </div>

            ) : (
              /* ── Liste ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 680 }}>
                {conversations.map((conv, idx) => {
                  const hasUnread = (conv.unreadCoach || 0) > 0;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => router.push(`/coach/messages/${conv.clientId}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        background: '#1c1b1b',
                        borderRadius: 12,
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background .15s, border-color .15s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(178,42,39,0.2)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background = '#1c1b1b';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)';
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.72rem', fontWeight: 700, color: '#fff',
                        fontFamily: 'Lexend, sans-serif', flexShrink: 0, position: 'relative',
                      }}>
                        {initials(conv.clientName || 'M')}
                        {hasUnread && (
                          <div style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 18, height: 18, background: '#b22a27',
                            borderRadius: '50%', border: '2px solid #131313',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '.52rem', fontFamily: 'Lexend, sans-serif',
                            fontWeight: 700, color: '#fff',
                          }}>
                            {conv.unreadCoach > 9 ? '9+' : conv.unreadCoach}
                          </div>
                        )}
                      </div>

                      {/* Texte */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 4,
                        }}>
                          <span style={{
                            fontFamily: 'Lexend, sans-serif', fontWeight: 700,
                            fontSize: '.875rem', color: '#e5e2e1',
                          }}>
                            {conv.clientName || 'Membre'}
                          </span>
                          <span style={{ fontSize: '.6rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                            {relativeTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p style={{
                          margin: 0, fontSize: '.78rem',
                          color: hasUnread ? '#e5e2e1' : '#9CA3AF',
                          fontWeight: hasUnread ? 600 : 400,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {conv.lastMessage || 'Aucun message pour le moment…'}
                        </p>
                      </div>

                      <span style={{ color: '#6B7280', fontSize: '1rem', flexShrink: 0 }}>›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ══════════════════════════════════
            MODALE — Choisir un membre
        ══════════════════════════════════ */}
        {showModal && (
          <div
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(8px)',
              zIndex: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <div style={{
              background: '#1c1b1b',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.08)',
              animation: 'modalIn .22s ease',
              overflow: 'hidden',
            }}>
              {/* Header modale */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 24px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{
                    fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700,
                    letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27',
                    marginBottom: 4,
                  }}>
                    Nouvelle conversation
                  </div>
                  <h2 style={{
                    fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem',
                    letterSpacing: '-.04em', color: '#e5e2e1', margin: 0,
                  }}>
                    Choisir un membre
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                    width: 32, height: 32, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF',
                    fontSize: '.95rem', flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Corps modale */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
                {loadingMembers ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '40px 0', gap: 12, color: '#9CA3AF', fontSize: '.82rem',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27',
                      animation: 'spin .8s linear infinite',
                    }} />
                    Chargement des membres…
                  </div>
                ) : members.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '40px 16px',
                    color: '#9CA3AF', fontSize: '.82rem', lineHeight: 1.7,
                  }}>
                    Aucun membre trouvé.<br />
                    Invitez des membres depuis le tableau de bord.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {members.map((member, idx) => {
                      const isStarting = startingWith === member.clientUserId;
                      return (
                        <div
                          key={member.id}
                          onClick={() => !isStarting && startConversation(member)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '12px 14px', borderRadius: 10,
                            cursor: isStarting ? 'wait' : 'pointer',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.05)',
                            transition: 'background .15s, border-color .15s',
                            opacity: startingWith && !isStarting ? 0.5 : 1,
                          }}
                          onMouseEnter={e => {
                            if (!isStarting) {
                              (e.currentTarget as HTMLDivElement).style.background = 'rgba(178,42,39,0.08)';
                              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(178,42,39,0.25)';
                            }
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)';
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '.66rem', fontWeight: 700, color: '#fff',
                            fontFamily: 'Lexend, sans-serif', flexShrink: 0,
                          }}>
                            {isStarting
                              ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />
                              : initials(member.name)
                            }
                          </div>

                          {/* Infos */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: 'Lexend, sans-serif', fontWeight: 700,
                              fontSize: '.875rem', color: '#e5e2e1',
                              marginBottom: 2,
                            }}>
                              {member.name}
                            </div>
                            {member.email && (
                              <div style={{
                                fontSize: '.7rem', color: '#9CA3AF',
                                fontFamily: 'Inter, sans-serif',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {member.email}
                              </div>
                            )}
                          </div>

                          <span style={{ color: '#9CA3AF', fontSize: '.85rem', flexShrink: 0 }}>›</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes modalIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
          @media (max-width: 767px) {
            main { margin-left: 0 !important; padding-top: 60px; }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
