'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';

/* ── Helpers ── */
type Tab = 'programs' | 'create' | 'clients' | 'assign';

const TYPE_CONFIG: Record<string, { icon: string; badge: string; label: string }> = {
  nutrition: { icon: '🥗', badge: 'badge-green', label: 'Nutrition' },
  sport:     { icon: '🏋️', badge: 'badge-blue',  label: 'Sport'     },
  business:  { icon: '🧠', badge: 'badge-gold',  label: 'Business'  },
};

const AVATAR_COLORS = [
  'linear-gradient(135deg,var(--gold-d),var(--gold))',
  'linear-gradient(135deg,#2563eb,var(--blue))',
  'linear-gradient(135deg,#7c3aed,var(--purple))',
  'linear-gradient(135deg,#16a34a,var(--green))',
  'linear-gradient(135deg,#dc2626,var(--red))',
];

const formatDate = (ts: Timestamp | null | undefined): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

/* ════════════════════════════════════════
   COACH DASHBOARD
════════════════════════════════════════ */
export default function CoachDashboard() {
  const router = useRouter();

  /* ── State (identique à l'original) ── */
  const [user, setUser]                     = useState<import('firebase/auth').User | null>(null);
  const [title, setTitle]                   = useState('');
  const [description, setDescription]       = useState('');
  const [type, setType]                     = useState('nutrition');
  const [programs, setPrograms]             = useState<any[]>([]);
  const [clients, setClients]               = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [loading, setLoading]               = useState(false);

  /* ── State UI ── */
  const [activeTab, setActiveTab] = useState<Tab>('programs');
  const [filter, setFilter]       = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  /* ── Auth (inchangé) ── */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => { if (u) setUser(u as any); });
    return () => unsub();
  }, []);

  /* ── Fetch programmes (inchangé) ── */
  const fetchPrograms = async () => {
    if (!user) return;
    const q = query(collection(db, 'programs'), where('coachId', '==', user.uid));
    const snap = await getDocs(q);
    const data: any[] = [];
    snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
    setPrograms(data);
  };

  /* ── Fetch clients (inchangé) ── */
  const fetchClients = async () => {
    if (!user) return;
    const q = query(collection(db, 'clients'), where('coachId', '==', user.uid));
    const snap = await getDocs(q);
    const data: any[] = [];
    for (const docSnap of snap.docs) {
      const clientUserId = docSnap.data().clientUserId;
      const clientDoc = await getDoc(doc(db, 'users', clientUserId));
      if (clientDoc.exists()) {
        data.push({ id: docSnap.id, name: clientDoc.data().name, email: clientDoc.data().email, userId: clientUserId });
      }
    }
    setClients(data);
  };

  useEffect(() => { fetchPrograms(); fetchClients(); }, [user]);

  /* ── Créer programme (logique inchangée, alert → fireToast) ── */
  const handleCreateProgram = async () => {
    if (!title) return fireToast('⚠️', 'Titre requis', 'Veuillez saisir un titre de programme.');
    if (!user)  return fireToast('⚠️', 'Non connecté', 'Veuillez vous reconnecter.');
    setLoading(true);
    try {
      await addDoc(collection(db, 'programs'), {
        title,
        description,
        type,
        coachId: user.uid,
        coachName: (user as any).displayName || 'Coach',
        createdAt: Timestamp.now(),
      });
      setTitle(''); setDescription(''); setType('nutrition');
      await fetchPrograms();
      setActiveTab('programs');
      fireToast('✅', 'Programme créé !', `"${title}" ajouté à votre liste.`);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', 'Impossible de créer le programme.');
    }
    setLoading(false);
  };

  /* ── Ajouter client (logique inchangée, alert → fireToast) ── */
  const handleAddClient = async (email: string) => {
    if (!email) return fireToast('⚠️', 'Email requis', 'Veuillez saisir un email client.');
    if (!user)  return fireToast('⚠️', 'Non connecté', 'Veuillez vous reconnecter.');
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      if (snap.empty) return fireToast('❌', 'Client introuvable', `Aucun compte pour ${email}.`);

      const clientUserId = snap.docs[0].id;
      const q2 = query(collection(db, 'clients'), where('clientUserId', '==', clientUserId));
      const check = await getDocs(q2);
      if (!check.empty) return fireToast('⚠️', 'Déjà ajouté', 'Ce client est déjà dans votre liste.');

      await addDoc(collection(db, 'clients'), { coachId: user.uid, clientUserId });
      setClientEmail('');
      await fetchClients();
      fireToast('🎉', 'Client ajouté !', `${email} rejoint votre espace.`);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', "Impossible d'ajouter le client.");
    }
  };

  /* ── Assigner programme (logique inchangée, alert → fireToast) ── */
  const handleAssignProgram = async () => {
    if (!selectedClient || !selectedProgram)
      return fireToast('⚠️', 'Sélection incomplète', 'Choisissez un client et un programme.');
    try {
      await addDoc(collection(db, 'program_assignments'), {
        clientId: selectedClient,
        programId: selectedProgram,
        assignedAt: Timestamp.now(),
      });
      setSelectedClient(''); setSelectedProgram('');
      const prog = programs.find((p) => p.id === selectedProgram);
      const client = clients.find((c) => c.id === selectedClient);
      fireToast('✅', 'Programme assigné !', `"${prog?.title}" → ${client?.name}.`);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', "Impossible d'assigner le programme.");
    }
  };

  /* ── Déconnexion ── */
  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  /* ── Filtered programs ── */
  const filteredPrograms = programs.filter((p) => !filter || p.type === filter);

  /* ── Styles partagés ── */
  const S = {
    page: {
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 65% 40% at 50% -5%, rgba(158,27,27,.07) 0%, transparent 55%), #121212',
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
      /* CSS variable overrides — propagate to all children */
      '--gold': '#9E1B1B',
      '--gold-d': '#7a1212',
      '--gold-glow': 'rgba(158,27,27,0.12)',
      '--amber': '#9E1B1B',
      '--blue': '#9E1B1B',
      '--purple': '#9E1B1B',
      '--green': '#16a34a',
      '--red': '#dc2626',
      '--k0': '#121212',
      '--k2': '#1a1a1a',
      '--k3': '#1e1e1e',
      '--k4': '#252525',
      '--wf': 'rgba(255,255,255,0.07)',
      '--w': '#FFFFFF',
      '--wd': '#9CA3AF',
      '--fd': 'Lexend, sans-serif',
      '--fb': 'Inter, sans-serif',
      '--r': '6px',
      '--rl': '12px',
      '--rxl': '16px',
    } as React.CSSProperties,
    wrap: { maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' } as React.CSSProperties,
  };

  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />
        <div style={S.page}>

          {/* ══ HEADER ══ */}
          <header
            style={{
              borderBottom: '1px solid var(--wf)',
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: 'rgba(6,6,6,.92)',
              backdropFilter: 'blur(20px)',
              position: 'sticky',
              top: 0,
              zIndex: 100,
            }}
          >
            <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.35rem', letterSpacing: '.04em', fontWeight: 700 }}>
              Sundara<span style={{ color: '#9E1B1B' }}>Flow</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: 'rgba(158,27,27,.2)', border: '1px solid rgba(158,27,27,.35)', borderRadius: '9999px', padding: '3px 10px', fontSize: '.65rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#f87171' }}>🏆 Coach</span>
              <span style={{ fontSize: '.72rem', color: 'var(--wd)' }}>
                {(user as any)?.email}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Déconnexion
              </button>
            </div>
          </header>

          <div
            style={{
              ...S.wrap,
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(16px)',
              transition: 'opacity .45s ease, transform .45s ease',
            }}
          >
            {/* ══ KPI STRIP ══ */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                margin: '28px 0 24px',
              }}
            >
              {[
                { icon: '📋', label: 'Programmes', val: programs.length },
                { icon: '👥', label: 'Clients',    val: clients.length  },
                { icon: '🔗', label: 'Assignations', val: '—'           },
              ].map((k) => (
                <div className="kpi-card" key={k.label}>
                  <div className="kpi-label">{k.icon} {k.label}</div>
                  <div className="kpi-val">{k.val}</div>
                </div>
              ))}
            </div>

            {/* ══ TABS ══ */}
            <div className="main-tabs" style={{ borderRadius: 'var(--r) var(--r) 0 0', marginBottom: 0 }}>
              {(
                [
                  { id: 'programs', label: '🏋️ Programmes', badge: programs.length > 0 ? String(programs.length) : undefined },
                  { id: 'create',   label: '✏️ Créer'  },
                  { id: 'clients',  label: '👥 Clients', badge: clients.length > 0 ? String(clients.length) : undefined },
                  { id: 'assign',   label: '🔗 Assigner' },
                ] as { id: Tab; label: string; badge?: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  className={`main-tab${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                  {t.badge && <span className="tbadge">{t.badge}</span>}
                </button>
              ))}
            </div>

            {/* ══ TAB: PROGRAMMES ══ */}
            {activeTab === 'programs' && (
              <div
                style={{
                  background: 'var(--k2)',
                  border: '1px solid var(--wf)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--rl) var(--rl)',
                  padding: 24,
                }}
              >
                {/* Filtre type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div className="prog-seg">
                    {[
                      { val: '',           label: 'Tous'       },
                      { val: 'nutrition',  label: '🥗 Nutrition' },
                      { val: 'sport',      label: '🏋️ Sport'   },
                      { val: 'business',   label: '🧠 Business' },
                    ].map((f) => (
                      <button
                        key={f.val}
                        className={`seg-btn${filter === f.val ? ' active' : ''}`}
                        onClick={() => setFilter(f.val)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '.72rem', color: 'var(--wd)', marginLeft: 'auto' }}>
                    {filteredPrograms.length} programme{filteredPrograms.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {filteredPrograms.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--wd)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
                    <p style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', marginBottom: 6 }}>
                      Aucun programme{filter ? ` de type ${TYPE_CONFIG[filter]?.label}` : ''}.
                    </p>
                    <p style={{ fontSize: '.8rem' }}>
                      <span
                        style={{ color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setActiveTab('create')}
                      >
                        Créer votre premier programme →
                      </span>
                    </p>
                  </div>
                )}

                <div className="g3">
                  {filteredPrograms.map((p, i) => {
                    const cfg = TYPE_CONFIG[p.type] || { icon: '📄', badge: 'badge-dim', label: p.type };
                    return (
                      <div className="feat-card" key={p.id}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div className="feat-icon">{cfg.icon}</div>
                          <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        <h3 style={{ fontSize: '1rem', marginBottom: 8, fontFamily: 'var(--fd)' }}>{p.title}</h3>
                        <p style={{ fontSize: '.8rem', color: 'var(--wd)', lineHeight: 1.72, marginBottom: 12, minHeight: 40 }}>
                          {p.description || <span style={{ fontStyle: 'italic' }}>Aucune description.</span>}
                        </p>
                        <div style={{ fontSize: '.65rem', color: 'var(--wd)', borderTop: '1px solid var(--wf)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                          <span>👤 {p.coachName || 'Coach'}</span>
                          <span>{formatDate(p.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ TAB: CRÉER ══ */}
            {activeTab === 'create' && (
              <div
                style={{
                  background: 'var(--k2)',
                  border: '1px solid var(--wf)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--rl) var(--rl)',
                  padding: 32,
                  maxWidth: 560,
                }}
              >
                <div style={{ marginBottom: 28 }}>
                  <div className="tag">✏️ Nouveau programme</div>
                  <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 300, fontStyle: 'italic', marginBottom: 6 }}>
                    Créez un <span className="gold-i">programme premium.</span>
                  </h2>
                  <p style={{ fontSize: '.82rem', color: 'var(--wd)' }}>
                    Il sera disponible pour être assigné à vos clients.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="fld">
                    <label>Titre du programme *</label>
                    <input
                      type="text"
                      placeholder="Ex : Programme Force 12 semaines"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      placeholder="Objectifs, contenu, structure du programme…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="fld">
                    <label>Type de programme</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="nutrition">🥗 Nutrition</option>
                      <option value="sport">🏋️ Sport &amp; Fitness</option>
                      <option value="business">🧠 Business &amp; Mindset</option>
                    </select>
                  </div>

                  {/* Préparation future : upload PDF / vidéo / plan nutrition */}
                  <div
                    style={{
                      background: 'var(--k3)',
                      border: '1px dashed var(--wf)',
                      borderRadius: 'var(--r)',
                      padding: '16px 20px',
                      fontSize: '.75rem',
                      color: 'var(--wd)',
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: 'var(--gold)' }}>🚀 Prochainement :</span>{' '}
                    Upload PDF, vidéos, plan nutritionnel intégré, intégration Stripe.
                  </div>

                  <button
                    className="btn btn-gold"
                    onClick={handleCreateProgram}
                    disabled={loading}
                    style={{ width: '100%', marginTop: 4, opacity: loading ? .7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                  >
                    {loading ? '⟳ Création en cours…' : '▶ Créer le programme'}
                  </button>
                </div>
              </div>
            )}

            {/* ══ TAB: CLIENTS ══ */}
            {activeTab === 'clients' && (
              <div
                style={{
                  background: 'var(--k2)',
                  border: '1px solid var(--wf)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--rl) var(--rl)',
                  padding: 24,
                }}
              >
                {/* Ajouter client */}
                <div style={{ marginBottom: 28, maxWidth: 480 }}>
                  <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 12 }}>
                    Ajouter un client
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="fld" style={{ flex: 1, marginBottom: 0 }}>
                      <input
                        type="email"
                        placeholder="email@client.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddClient(clientEmail); }}
                      />
                    </div>
                    <button
                      className="btn btn-gold btn-sm"
                      style={{ flexShrink: 0 }}
                      onClick={() => handleAddClient(clientEmail)}
                    >
                      + Ajouter
                    </button>
                  </div>
                  <p style={{ fontSize: '.68rem', color: 'var(--wd)', marginTop: 7 }}>
                    Le client doit avoir un compte SundaraFlow.
                  </p>
                </div>

                {/* Liste clients */}
                <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 14 }}>
                  Mes clients ({clients.length})
                </div>

                {clients.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--wd)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👥</div>
                    <p style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem' }}>Aucun client encore.</p>
                    <p style={{ fontSize: '.78rem', marginTop: 6 }}>Ajoutez leur email ci-dessus pour commencer.</p>
                  </div>
                )}

                <div className="client-cards">
                  {clients.map((c, i) => (
                    <div className="client-card" key={c.id}>
                      <div className="cc-top">
                        <div
                          className="cc-av"
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: 'var(--k0)' }}
                        >
                          {initials(c.name || c.email || '?')}
                        </div>
                        <span className="badge badge-green">Actif</span>
                      </div>
                      <div className="cc-name">{c.name || '—'}</div>
                      <div className="cc-niche" style={{ fontSize: '.72rem' }}>{c.email}</div>
                      <div className="cc-actions" style={{ marginTop: 14 }}>
                        <button
                          className="btn btn-xs btn-outline btn"
                          onClick={() => { setSelectedClient(c.id); setActiveTab('assign'); fireToast('🔗', 'Client sélectionné', `${c.name} prêt pour l\'assignation.`); }}
                        >
                          Assigner →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ TAB: ASSIGNER ══ */}
            {activeTab === 'assign' && (
              <div
                style={{
                  background: 'var(--k2)',
                  border: '1px solid var(--wf)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--rl) var(--rl)',
                  padding: 32,
                  maxWidth: 560,
                }}
              >
                <div style={{ marginBottom: 28 }}>
                  <div className="tag">🔗 Assignation</div>
                  <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 300, fontStyle: 'italic', marginBottom: 6 }}>
                    Assigner un <span className="gold-i">programme à un client.</span>
                  </h2>
                  <p style={{ fontSize: '.82rem', color: 'var(--wd)' }}>
                    Le client verra ce programme dans son dashboard immédiatement.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="fld">
                    <label>Client</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    >
                      <option value="">— Sélectionner un client —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label>Programme</label>
                    <select
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                    >
                      <option value="">— Sélectionner un programme —</option>
                      {programs.map((p) => {
                        const cfg = TYPE_CONFIG[p.type] || { icon: '📄' };
                        return (
                          <option key={p.id} value={p.id}>
                            {cfg.icon} {p.title} · {TYPE_CONFIG[p.type]?.label || p.type}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Aperçu sélection */}
                  {selectedClient && selectedProgram && (() => {
                    const c = clients.find((x) => x.id === selectedClient);
                    const p = programs.find((x) => x.id === selectedProgram);
                    const cfg = TYPE_CONFIG[p?.type] || { icon: '📄', badge: 'badge-dim', label: p?.type };
                    return (
                      <div style={{ background: 'var(--k3)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 'var(--r)', padding: '14px 16px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: 2 }}>{p?.title}</div>
                          <div style={{ color: 'var(--wd)' }}>→ {c?.name}</div>
                        </div>
                        <span className={`badge ${cfg.badge}`} style={{ marginLeft: 'auto' }}>{cfg.label}</span>
                      </div>
                    );
                  })()}

                  <button
                    className="btn btn-gold"
                    onClick={handleAssignProgram}
                    style={{ width: '100%' }}
                  >
                    ✓ Confirmer l&apos;assignation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    </ProtectedRoute>
  );
}
