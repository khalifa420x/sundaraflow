'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';

/* ── Mock data ── */
const MOCK_CLIENTS = [
  { id: 'm1', name: 'Sophie Martin',   email: 'sophie@gmail.com',  goal: 'Perte de poids', status: 'actif',   weight: 65, progress: 68 },
  { id: 'm2', name: 'Lucas Dubois',    email: 'lucas@gmail.com',   goal: 'Prise de masse', status: 'actif',   weight: 82, progress: 45 },
  { id: 'm3', name: 'Emma Petit',      email: 'emma@gmail.com',    goal: 'Maintien',       status: 'pause',   weight: 58, progress: 82 },
  { id: 'm4', name: 'Thomas Bernard',  email: 'thomas@gmail.com',  goal: 'Prise de masse', status: 'pending', weight: 75, progress: 12 },
];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#9E1B1B,#b91c1c)',
  'linear-gradient(135deg,#16a34a,#15803d)',
  'linear-gradient(135deg,#374151,#4B5563)',
];

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

type AddMode = null | 'email' | 'manuel' | 'lien';
type FilterStatus = 'tous' | 'actif' | 'pause' | 'pending';

const FILTER_LABELS: Record<FilterStatus, string> = {
  tous: 'Tous',
  actif: 'Actifs ●',
  pause: 'En pause ⏸',
  pending: 'En attente ⏳',
};

const goalChip = (goal: string) => {
  if (!goal) return { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF' };
  const g = goal.toLowerCase();
  if (g.includes('perte')) return { bg: 'rgba(178,42,39,0.1)', color: '#e3beb8' };
  if (g.includes('prise')) return { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' };
  return { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF' };
};

const statusBadge = (status: string) => {
  if (status === 'actif')   return { bg: 'rgba(22,163,74,0.12)',   color: '#16a34a', label: '● ACTIF' };
  if (status === 'pause')   return { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: '⏸ EN PAUSE' };
  return                           { bg: 'rgba(178,42,39,0.12)',  color: '#b22a27', label: '⏳ EN ATTENTE' };
};

/* ════════════════════════════════════════════
   PAGE
════════════════════════════════════════════ */
export default function CoachMembers() {
  const router = useRouter();

  /* Auth */
  const [user, setUser]       = useState<import('firebase/auth').User | null>(null);
  const [userName, setUserName] = useState('');

  /* Data */
  const [clients, setClients]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mounted, setMounted]   = useState(false);

  /* Filters */
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('tous');

  /* Modal */
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addMode, setAddMode]             = useState<AddMode>(null);
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteLink, setInviteLink]       = useState('');
  const [copying, setCopying]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [manualForm, setManualForm]       = useState({ name: '', email: '', goal: 'Perte de poids', weight: '' });

  /* Mount */
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  /* Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        setUserName(u.displayName || u.email?.split('@')[0] || 'Coach');
        await fetchClients(u);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* Generate invite link when mode = lien */
  useEffect(() => {
    if (addMode === 'lien' && user) {
      const token = crypto.randomUUID();
      const link = `${window.location.origin}/register/client?coach=${user.uid}&token=${token}`;
      setInviteLink(link);
      addDoc(collection(db, 'invitations'), {
        coachId: user.uid, token, type: 'link',
        status: 'active', createdAt: Timestamp.now(),
      }).catch(() => {});
    }
  }, [addMode, user]);

  const fetchClients = async (u: import('firebase/auth').User) => {
    try {
      const snap = await getDocs(query(collection(db, 'clients'), where('coachId', '==', u.uid)));
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setClients([]); }
  };

  /* Derived */
  const clientsFiltres = clients
    .filter(c => {
      const q = searchQuery.toLowerCase();
      return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    })
    .filter(c => filterStatus === 'tous' || c.status === filterStatus);

  const displayClients = clientsFiltres.length > 0
    ? clientsFiltres
    : (clients.length === 0 ? MOCK_CLIENTS : []);

  /* Handlers */
  const handleSendInvite = async () => {
    if (!user || !inviteEmail) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'invitations'), {
        coachId: user.uid, email: inviteEmail,
        token: crypto.randomUUID(), status: 'pending', type: 'email',
        createdAt: Timestamp.now(),
      });
      fireToast('✉️', 'Invitation envoyée', inviteEmail);
      setInviteEmail(''); setAddMode(null); setShowAddModal(false);
    } catch { fireToast('❌', 'Erreur', "Impossible d'envoyer l'invitation."); }
    setSaving(false);
  };

  const handleAddManual = async () => {
    if (!user || !manualForm.name || !manualForm.email) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'clients'), {
        coachId: user.uid, clientUserId: '',
        name: manualForm.name, email: manualForm.email,
        goal: manualForm.goal,
        weight: manualForm.weight ? Number(manualForm.weight) : null,
        status: 'pending', progress: 0,
        createdAt: Timestamp.now(),
      });
      fireToast('✅', 'Membre ajouté', manualForm.name);
      setManualForm({ name: '', email: '', goal: 'Perte de poids', weight: '' });
      setAddMode(null); setShowAddModal(false);
      if (user) await fetchClients(user);
    } catch { fireToast('❌', 'Erreur', "Impossible d'ajouter le membre."); }
    setSaving(false);
  };

  const closeModal = () => { setShowAddModal(false); setAddMode(null); setInviteEmail(''); setInviteLink(''); setCopying(false); };

  /* Input style */
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#2a2a2a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '10px 14px',
    color: '#e5e2e1', fontSize: '.85rem',
    outline: 'none', fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '.56rem',
    fontFamily: 'Lexend, sans-serif', fontWeight: 700,
    letterSpacing: '.15em', textTransform: 'uppercase',
    color: '#9CA3AF', marginBottom: 6,
  };

  return (
    <ProtectedRoute role="coach">
      <Toast />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .mem-main {
          flex: 1; min-width: 0; display: flex; flex-direction: column;
          overflow-x: hidden; min-height: 100vh;
        }
        @media (min-width: 768px) {
          .mem-main { margin-left: 240px; width: calc(100vw - 240px); }
        }
        @media (max-width: 767px) {
          .mem-main { margin-left: 0; width: 100%; padding-top: 56px; }
        }
        .mem-input:focus {
          border-color: rgba(178,42,39,0.5) !important;
          box-shadow: 0 0 0 3px rgba(178,42,39,0.08) !important;
          outline: none !important;
        }
        .mem-card {
          background: #1c1b1b;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px;
          transition: all .2s;
          cursor: pointer;
        }
        .mem-card:hover {
          border-color: rgba(178,42,39,0.3);
          transform: scale(1.02);
          box-shadow: 0 0 24px rgba(178,42,39,0.12);
        }
        .mem-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .mem-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media (min-width: 1100px) {
          .mem-grid { grid-template-columns: repeat(3,1fr); }
        }
        .mem-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2,1fr);
        }
        @media (min-width: 768px) {
          .mem-kpi-grid { grid-template-columns: repeat(4,1fr); }
        }
        .mem-option:hover {
          border-color: rgba(178,42,39,0.35) !important;
          background: rgba(178,42,39,0.06) !important;
        }
        @keyframes fadeIn { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(178,42,39,0.35); border-radius: 10px; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#131313', overflowX: 'hidden' }}>
        <Sidebar role="coach" />

        <main className="mem-main">

          {/* ══ BLOC 1 — HERO ══ */}
          <div style={{ position: 'relative', height: 'clamp(320px,45vh,480px)', overflow: 'hidden' }}>
            {/* Image de fond */}
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.25) saturate(0.6) grayscale(0.3)' }}
            />
            {/* Overlays */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,19,19,0.7)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.95) 0%, transparent 65%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #131313, transparent)' }} />

            {/* Contenu */}
            <div style={{
              position: 'relative', zIndex: 1, height: '100%',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              padding: 'clamp(20px,4vw,48px)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(16px)',
              transition: 'opacity .6s, transform .6s',
            }}>
              <div style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 12 }}>
                ESPACE COACH — MEMBRES
              </div>
              <h1 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3.8rem)', letterSpacing: '-.04em', lineHeight: .88, color: '#e5e2e1', margin: '0 0 8px' }}>
                GÉREZ VOS <br />MEMBRES.
              </h1>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.2rem,3vw,2.2rem)', color: '#b22a27', letterSpacing: '-.03em', marginBottom: 16 }}>
                MAXIMISEZ LA PERFORMANCE.
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: '#9CA3AF', maxWidth: 460, lineHeight: 1.7, marginBottom: 24, marginTop: 0 }}>
                Suivez et optimisez la progression de chaque membre en temps réel.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setShowAddModal(true); setAddMode(null); }}
                  style={{ background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#e5e2e1', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44 }}
                >
                  + AJOUTER UN MEMBRE →
                </button>
              </div>
            </div>
          </div>

          {/* ══ BLOC 2 — KPI ROW ══ */}
          <div style={{ background: '#1c1b1b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="mem-kpi-grid">
              {[
                { label: 'MEMBRES TOTAL', val: displayClients.length },
                { label: 'ACTIFS',        val: displayClients.filter(c => c.status === 'actif').length },
                { label: 'EN PAUSE',      val: displayClients.filter(c => c.status === 'pause').length },
                { label: 'EN ATTENTE',    val: displayClients.filter(c => c.status === 'pending').length },
              ].map((kpi, i, arr) => (
                <div key={kpi.label} style={{
                  padding: 'clamp(14px,2vw,22px)',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.6rem,3vw,2.4rem)', color: '#b22a27', lineHeight: 1 }}>{kpi.val}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '.56rem', letterSpacing: '.14em', textTransform: 'uppercase', color: '#9CA3AF', marginTop: 5 }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ BLOC 3 — SEARCH & FILTERS ══ */}
          <div style={{ padding: '20px clamp(16px,2.5vw,32px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
              <input
                className="mem-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou email…"
                style={{
                  width: '100%', padding: '11px 14px 11px 42px',
                  background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, color: '#e5e2e1', fontSize: '.85rem',
                  outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['tous', 'actif', 'pause', 'pending'] as FilterStatus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  style={{
                    borderRadius: 999, padding: '6px 16px',
                    fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.65rem',
                    cursor: 'pointer', border: 'none', transition: 'all .15s',
                    background: filterStatus === f ? '#b22a27' : 'rgba(255,255,255,0.05)',
                    color: filterStatus === f ? '#e5e2e1' : '#9CA3AF',
                  }}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* ══ BLOC 4 — GRILLE MEMBRES ══ */}
          <div style={{ padding: '0 clamp(16px,2.5vw,32px) 48px' }}>
            {displayClients.length === 0 ? (
              /* Empty state */
              <div style={{ background: '#1c1b1b', borderRadius: 14, padding: 48, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>👥</div>
                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#e5e2e1', marginBottom: 8 }}>Aucun membre trouvé</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.8rem', color: '#9CA3AF', marginBottom: 20 }}>
                  {searchQuery || filterStatus !== 'tous' ? 'Aucun résultat pour cette recherche.' : "Vous n'avez pas encore de membres."}
                </div>
                <button
                  onClick={() => { setShowAddModal(true); setAddMode(null); }}
                  style={{ background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#e5e2e1', border: 'none', borderRadius: 8, padding: '11px 22px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  + Ajouter un membre
                </button>
              </div>
            ) : (
              <div className="mem-grid">
                {displayClients.map((client, idx) => {
                  const badge = statusBadge(client.status);
                  const chip  = goalChip(client.goal || '');
                  const prog  = client.progress || 0;
                  return (
                    <div key={client.id} className="mem-card">
                      {/* A) Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{ width: 46, height: 46, borderRadius: '50%', background: AVATAR_GRADIENTS[idx % 3], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', color: '#fff', flexShrink: 0 }}>
                            {initials(client.name || 'M')}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#e5e2e1', letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{client.name}</div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.62rem', color: '#9CA3AF', marginTop: 2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>
                          </div>
                        </div>
                        <div style={{ background: badge.bg, color: badge.color, fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, flexShrink: 0, marginLeft: 8 }}>
                          {badge.label}
                        </div>
                      </div>

                      {/* B) Goal chip */}
                      <div style={{ marginBottom: 14 }}>
                        <span style={{ background: chip.bg, color: chip.color, fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4 }}>
                          {client.goal || 'Non défini'}
                        </span>
                      </div>

                      {/* C) Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {[
                          { label: 'POIDS',       val: client.weight ? `${client.weight} kg` : '—' },
                          { label: 'PROGRESSION', val: `${prog}%` },
                        ].map(s => (
                          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '.52rem', textTransform: 'uppercase', letterSpacing: '.1em', color: '#9CA3AF', marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.95rem', color: '#e5e2e1' }}>{s.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* D) Progress bar */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '.56rem', textTransform: 'uppercase', color: '#9CA3AF' }}>Programme</span>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: '#b22a27' }}>{prog}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                          <div style={{ width: `${prog}%`, height: '100%', background: 'linear-gradient(to right,#89070e,#b22a27)', borderRadius: 999, transition: 'width 1.4s ease' }} />
                        </div>
                      </div>

                      {/* E) Actions */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => router.push('/coach/home')} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 6, color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase', minHeight: 34, cursor: 'pointer' }}>
                          Voir
                        </button>
                        <button onClick={() => router.push('/coach/messages')} style={{ flex: 1, background: 'rgba(178,42,39,0.08)', border: 'none', borderRadius: 6, color: '#e3beb8', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase', minHeight: 34, cursor: 'pointer' }}>
                          Message
                        </button>
                        <button onClick={() => router.push('/coach/home')} style={{ flex: 1, background: 'linear-gradient(135deg,#89070e,#b22a27)', border: 'none', borderRadius: 6, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase', minHeight: 34, cursor: 'pointer' }}>
                          Programme
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ BLOC 5 — MODAL AJOUT ══ */}
          {showAddModal && (
            <div
              onClick={closeModal}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'fadeIn .25s ease' }}
              >
                {/* ✕ */}
                <button onClick={closeModal} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#9CA3AF', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#e5e2e1', marginBottom: 6 }}>AJOUTER UN MEMBRE</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.8rem', color: '#9CA3AF', marginBottom: 24 }}>Choisissez comment inviter ou créer un membre.</div>

                {/* ── Choix du mode ── */}
                {addMode === null && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { mode: 'email' as AddMode, icon: '✉️', title: 'Invitation par email', desc: 'Le membre reçoit un lien pour créer son compte' },
                      { mode: 'manuel' as AddMode, icon: '✏️', title: 'Ajout manuel', desc: 'Créez directement le profil, le membre complète plus tard' },
                      { mode: 'lien' as AddMode, icon: '🔗', title: "Lien d'invitation", desc: 'Générez un lien unique à partager' },
                    ].map(opt => (
                      <div
                        key={String(opt.mode)}
                        className="mem-option"
                        onClick={() => setAddMode(opt.mode)}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '16px 20px', cursor: 'pointer', transition: 'all .15s' }}
                      >
                        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(178,42,39,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem', color: '#e5e2e1' }}>{opt.title}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.72rem', color: '#9CA3AF', marginTop: 2 }}>{opt.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Back button ── */}
                {addMode !== null && (
                  <button onClick={() => setAddMode(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
                    ← Retour
                  </button>
                )}

                {/* ── MODE EMAIL ── */}
                {addMode === 'email' && (
                  <div>
                    <label style={labelStyle}>Email du membre</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="email@membre.com"
                      style={inputStyle}
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={saving || !inviteEmail}
                      style={{ width: '100%', background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#e5e2e1', border: 'none', borderRadius: 8, padding: '13px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44, marginTop: 16, opacity: (saving || !inviteEmail) ? .5 : 1 }}
                    >
                      {saving ? 'Envoi…' : "ENVOYER L'INVITATION →"}
                    </button>
                  </div>
                )}

                {/* ── MODE MANUEL ── */}
                {addMode === 'manuel' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Nom complet *</label>
                      <input type="text" value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} placeholder="Prénom Nom" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input type="email" value={manualForm.email} onChange={e => setManualForm(p => ({ ...p, email: e.target.value }))} placeholder="email@membre.com" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Objectif</label>
                      <select value={manualForm.goal} onChange={e => setManualForm(p => ({ ...p, goal: e.target.value }))} style={{ ...inputStyle, color: '#e5e2e1' }}>
                        <option value="Perte de poids">Perte de poids</option>
                        <option value="Prise de masse">Prise de masse</option>
                        <option value="Maintien">Maintien</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Poids actuel (kg) — optionnel</label>
                      <input type="number" min={30} max={200} value={manualForm.weight} onChange={e => setManualForm(p => ({ ...p, weight: e.target.value }))} placeholder="75" style={inputStyle} />
                    </div>
                    <button
                      onClick={handleAddManual}
                      disabled={saving || !manualForm.name || !manualForm.email}
                      style={{ width: '100%', background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#e5e2e1', border: 'none', borderRadius: 8, padding: '13px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44, marginTop: 6, opacity: (saving || !manualForm.name || !manualForm.email) ? .5 : 1 }}
                    >
                      {saving ? 'Ajout…' : 'AJOUTER LE MEMBRE →'}
                    </button>
                  </div>
                )}

                {/* ── MODE LIEN ── */}
                {addMode === 'lien' && (
                  <div>
                    <label style={labelStyle}>Votre lien d&apos;invitation</label>
                    <input
                      readOnly
                      value={inviteLink || 'Génération en cours…'}
                      style={{ ...inputStyle, color: '#9CA3AF', fontSize: '.75rem', cursor: 'default' }}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button
                        onClick={() => navigator.clipboard.writeText(inviteLink).then(() => { setCopying(true); setTimeout(() => setCopying(false), 2000); })}
                        disabled={!inviteLink}
                        style={{ flex: 1, background: copying ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: copying ? '#16a34a' : '#e5e2e1', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase', minHeight: 44, cursor: 'pointer' }}
                      >
                        {copying ? '✓ COPIÉ !' : '📋 COPIER LE LIEN'}
                      </button>
                      <button
                        onClick={() => navigator.share?.({ title: 'SundaraFlow', url: inviteLink })}
                        disabled={!inviteLink || !navigator.share}
                        style={{ flex: 1, background: 'linear-gradient(135deg,#89070e,#b22a27)', border: 'none', borderRadius: 8, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase', minHeight: 44, cursor: 'pointer', opacity: (!inviteLink || !navigator.share) ? .5 : 1 }}
                      >
                        📤 PARTAGER
                      </button>
                    </div>
                    <div style={{ background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: '.68rem', color: '#9CA3AF', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
                      ℹ️ Toute personne avec ce lien pourra rejoindre votre espace coach.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </ProtectedRoute>
  );
}
