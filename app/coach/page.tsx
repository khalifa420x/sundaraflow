'use client';

import { useState, useEffect, useRef } from 'react';
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
import CalorieCalculator from '@/components/CalorieCalculator';

/* ── Types ── */
type Tab = 'programs' | 'create' | 'clients' | 'assign';

/* ── Constants ── */
const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  nutrition: { icon: '🥗', label: 'Nutrition', color: '#16a34a' },
  sport:     { icon: '🏋️', label: 'Sport',     color: '#b22a27' },
  business:  { icon: '🧠', label: 'Business',  color: '#6B7280' },
};

const AVATAR_COLORS = [
  'linear-gradient(135deg,#89070e,#b22a27)',
  'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  'linear-gradient(135deg,#6d28d9,#8b5cf6)',
  'linear-gradient(135deg,#15803d,#22c55e)',
  'linear-gradient(135deg,#374151,#6B7280)',
];

/* Hero images for banners */
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=1920&q=80',
];

const formatDate = (ts: Timestamp | null | undefined): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

/* ── Animated counter hook ── */
function useCounter(target: number, duration = 800, trigger = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger || target === 0) { setVal(target); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, trigger]);
  return val;
}

/* ════════════════════════════════════════
   COACH DASHBOARD
════════════════════════════════════════ */
export default function CoachDashboard() {
  const router = useRouter();

  /* ── State (logique inchangée) ── */
  const [user, setUser]                       = useState<import('firebase/auth').User | null>(null);
  const [title, setTitle]                     = useState('');
  const [description, setDescription]         = useState('');
  const [type, setType]                       = useState('nutrition');
  const [programs, setPrograms]               = useState<any[]>([]);
  const [clients, setClients]                 = useState<any[]>([]);
  const [selectedClient, setSelectedClient]   = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [activeTab, setActiveTab]             = useState<Tab>('programs');
  const [filter, setFilter]                   = useState('');
  const [clientEmail, setClientEmail]         = useState('');
  const [mounted, setMounted]                 = useState(false);
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [calcModal, setCalcModal]             = useState<{ name: string; id: string } | null>(null);

  /* Animated KPI counters */
  const progCount   = useCounter(programs.length, 800, mounted);
  const clientCount = useCounter(clients.length,  800, mounted);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  /* ── Créer programme (inchangé) ── */
  const handleCreateProgram = async () => {
    if (!title) return fireToast('⚠️', 'Titre requis', 'Veuillez saisir un titre de programme.');
    if (!user)  return fireToast('⚠️', 'Non connecté', 'Veuillez vous reconnecter.');
    setLoading(true);
    try {
      await addDoc(collection(db, 'programs'), {
        title, description, type,
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

  /* ── Ajouter client (inchangé) ── */
  const handleAddClient = async (email: string) => {
    if (!email) return fireToast('⚠️', 'Email requis', 'Veuillez saisir un email membre.');
    if (!user)  return fireToast('⚠️', 'Non connecté', 'Veuillez vous reconnecter.');
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      if (snap.empty) return fireToast('❌', 'Membre introuvable', `Aucun compte pour ${email}.`);
      const clientUserId = snap.docs[0].id;
      const q2 = query(collection(db, 'clients'), where('clientUserId', '==', clientUserId));
      const check = await getDocs(q2);
      if (!check.empty) return fireToast('⚠️', 'Déjà ajouté', 'Ce membre est déjà dans votre liste.');
      await addDoc(collection(db, 'clients'), { coachId: user.uid, clientUserId });
      setClientEmail('');
      await fetchClients();
      fireToast('🎉', 'Membre ajouté !', `${email} rejoint votre espace.`);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', "Impossible d'ajouter le membre.");
    }
  };

  /* ── Assigner programme (inchangé) ── */
  const handleAssignProgram = async () => {
    if (!selectedClient || !selectedProgram)
      return fireToast('⚠️', 'Sélection incomplète', 'Choisissez un membre et un programme.');
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

  /* ── Déconnexion (inchangé) ── */
  const handleSignOut = async () => { await signOut(auth); router.push('/login'); };

  /* ── Filtered programs ── */
  const filteredPrograms = programs.filter((p) => !filter || p.type === filter);

  /* ── Nav items ── */
  const NAV: { id: Tab; icon: string; label: string }[] = [
    { id: 'programs', icon: '🏋️', label: 'Programmes'  },
    { id: 'create',   icon: '✏️',  label: 'Créer'       },
    { id: 'clients',  icon: '👥', label: 'Membres'     },
    { id: 'assign',   icon: '🔗', label: 'Assigner'    },
  ];

  /* ── Banner titles per tab ── */
  const BANNER: Record<Tab, { sup: string; title: string; accent: string; img: string }> = {
    programs: { sup: '📋 Bibliothèque',    title: 'MES',          accent: 'PROGRAMMES.',   img: HERO_IMAGES[0] },
    create:   { sup: '✏️ Nouveau',         title: 'CRÉER UN',     accent: 'PROGRAMME.',    img: HERO_IMAGES[2] },
    clients:  { sup: '👥 Suivi membres',   title: 'MES',          accent: 'MEMBRES.',      img: HERO_IMAGES[1] },
    assign:   { sup: '🔗 Assignation',     title: 'ASSIGNER UN',  accent: 'PROGRAMME.',    img: HERO_IMAGES[2] },
  };

  const banner = BANNER[activeTab];

  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />

        {/* ══ ROOT ══ */}
        <div style={{ minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif' }}>

          {/* ══ HEADER — fixed, full width ══ */}
          <header style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
            height: 56,
            background: 'rgba(19,19,19,0.95)', backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 24px', gap: 14,
          }}>
            {/* Left: burger + logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="burger"
                style={{ background: 'none', border: 'none', color: '#e5e2e1', fontSize: '1.1rem', cursor: 'pointer', padding: '4px 6px', lineHeight: 1, display: 'none' }}
                aria-label="Menu"
              >☰</button>
              {/* PROBLÈME 2 FIX — logo redirige vers /coach/home */}
              <div
                onClick={() => router.push('/coach/home')}
                style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.05rem', fontWeight: 900, letterSpacing: '.07em', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
              >
                SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
              </div>
              <span style={{ fontSize: '.55rem', color: '#4B5563', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' }}>Dashboard</span>
            </div>

            {/* Right: badge + email + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(178,42,39,0.15)', borderRadius: 4, padding: '3px 10px', fontSize: '.58rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#e3beb8' }}>🏆 Coach</div>
              <span style={{ fontSize: '.68rem', color: '#9CA3AF', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(user as any)?.email}</span>
              <button className="hdr-btn" onClick={handleSignOut}>Déconnexion</button>
            </div>
          </header>

          {/* ══ BODY BELOW HEADER ══ */}
          <div style={{ display: 'flex', paddingTop: 56 }}>

            {/* ══ SIDEBAR — fixed, starts below header ══ */}
            {/* PROBLÈME 1 FIX — position fixed, z-index 50, margin-left sur main */}
            <aside
              className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
              style={{
                position: 'fixed',
                top: 56,
                left: 0,
                width: 220,
                height: 'calc(100vh - 56px)',
                zIndex: 50,
                background: '#1c1b1b',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {/* Coach card */}
              <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#89070e,#b22a27)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 900, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif', flexShrink: 0 }}>
                    {initials((user as any)?.displayName || (user as any)?.email || 'CO')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#e5e2e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(user as any)?.displayName || 'Coach'}
                    </div>
                    <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(user as any)?.email}</div>
                  </div>
                </div>
                {/* Mini KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Programmes', val: progCount },
                    { label: 'Membres',    val: clientCount },
                  ].map(k => (
                    <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '9px 8px' }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1 }}>{k.val}</div>
                      <div style={{ fontSize: '.52rem', color: '#9CA3AF', marginTop: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>{k.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nav */}
              <nav style={{ padding: '14px 10px', flex: 1 }}>
                <div style={{ fontSize: '.5rem', color: '#4B5563', fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', padding: '0 6px', marginBottom: 6 }}>Navigation</div>
                {NAV.map(item => {
                  const isActive = activeTab === item.id;
                  const count = item.id === 'programs' ? programs.length : item.id === 'clients' ? clients.length : null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 7,
                        background: isActive ? 'rgba(178,42,39,0.12)' : 'transparent',
                        border: `1px solid ${isActive ? 'rgba(178,42,39,0.22)' : 'transparent'}`,
                        color: isActive ? '#e3beb8' : '#9CA3AF',
                        fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', letterSpacing: '.06em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'all .18s ease', marginBottom: 3, textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 20, textAlign: 'center', fontSize: '.95rem', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {count !== null && count > 0 && (
                        <span style={{ background: isActive ? '#b22a27' : 'rgba(255,255,255,0.07)', color: isActive ? '#e5e2e1' : '#9CA3AF', borderRadius: 9, padding: '1px 6px', fontSize: '.52rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div style={{ marginTop: 18, marginBottom: 6, fontSize: '.5rem', color: '#4B5563', fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', padding: '0 6px' }}>Accès rapide</div>
                {[
                  { label: 'Accueil coach', icon: '🏠', action: () => router.push('/coach/home') },
                  { label: 'Déconnexion',   icon: '↗',  action: handleSignOut },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, background: 'transparent', border: '1px solid transparent', color: '#6B7280', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer', transition: 'color .18s ease', marginBottom: 2, textAlign: 'left' }}>
                    <span style={{ width: 20, textAlign: 'center', fontSize: '.9rem', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '.55rem', color: '#374151', fontFamily: 'Inter, sans-serif', textAlign: 'center', letterSpacing: '.06em' }}>
                SundaraFlow v2.4
              </div>
            </aside>

            {/* ══ MAIN — margin-left = sidebar width ══ */}
            {/* PROBLÈME 1 FIX — marginLeft 220px sur desktop, 0 sur mobile */}
            <main
              className="main-area"
              style={{
                marginLeft: 220,
                flex: 1,
                minWidth: 0,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'none' : 'translateY(14px)',
                transition: 'opacity .45s ease .05s, transform .45s ease .05s',
              }}
            >
              {/* ── HERO BANNER ── */}
              {/* PROBLÈME 3 FIX — image fitness sombre avec overlay + titre en surimpression */}
              <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img
                  key={banner.img}
                  src={banner.img}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%', filter: 'brightness(0.25) saturate(0.7)', transition: 'opacity .4s ease' }}
                />
                {/* Gradient overlay left */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.95) 0%, rgba(19,19,19,0.7) 50%, rgba(19,19,19,0.3) 100%)' }} />
                {/* Gradient overlay bottom */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #131313, transparent)' }} />
                {/* Left accent line */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(to bottom, #b22a27, #89070e, transparent)' }} />
                {/* Title overlay */}
                <div style={{ position: 'absolute', bottom: 22, left: 28, right: 28 }}>
                  <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 6 }}>{banner.sup}</div>
                  <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.5rem,3.5vw,2.4rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .9, color: '#e5e2e1', margin: 0 }}>
                    {banner.title} <span style={{ color: '#b22a27' }}>{banner.accent}</span>
                  </h1>
                </div>
              </div>

              {/* ── CONTENT AREA ── */}
              <div style={{ padding: 'clamp(20px,3vw,36px)' }}>

                {/* KPI row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 28 }} className="kpi-row">
                  {[
                    { icon: '📋', label: 'Programmes',   val: progCount,   sub: 'créés' },
                    { icon: '👥', label: 'Membres',      val: clientCount, sub: 'suivis' },
                    { icon: '🔗', label: 'Assignations', val: '—',         sub: 'ce mois' },
                    { icon: '📊', label: 'Rétention',    val: '89%',       sub: 'taux' },
                  ].map((k, i) => (
                    <div key={k.label} className="kpi-card-anim" style={{ background: '#1c1b1b', borderRadius: 10, padding: '15px 16px', borderLeft: '3px solid rgba(178,42,39,0.35)', animationDelay: `${i * 80}ms` }}>
                      <div style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>{k.icon} {k.label}</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, marginBottom: 3 }}>{k.val}</div>
                      <div style={{ fontSize: '.56rem', color: '#4B5563' }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* ══ TAB: PROGRAMMES ══ */}
                {activeTab === 'programs' && (
                  <div>
                    {/* Filter pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20, flexWrap: 'wrap' }}>
                      {[
                        { val: '',          label: 'Tous' },
                        { val: 'nutrition', label: '🥗 Nutrition' },
                        { val: 'sport',     label: '🏋️ Sport' },
                        { val: 'business',  label: '🧠 Business' },
                      ].map(f => (
                        <button key={f.val} onClick={() => setFilter(f.val)} className="filter-pill" style={{
                          padding: '6px 13px', borderRadius: 6, cursor: 'pointer',
                          fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.64rem', letterSpacing: '.08em', textTransform: 'uppercase',
                          background: filter === f.val ? 'rgba(178,42,39,0.12)' : '#1c1b1b',
                          border: `1px solid ${filter === f.val ? 'rgba(178,42,39,0.35)' : 'rgba(255,255,255,0.06)'}`,
                          color: filter === f.val ? '#e3beb8' : '#9CA3AF',
                          transition: 'all .18s ease',
                        }}>
                          {f.label}
                        </button>
                      ))}
                      <span style={{ fontSize: '.58rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginLeft: 'auto' }}>
                        {filteredPrograms.length} programme{filteredPrograms.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Empty state */}
                    {filteredPrograms.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1c1b1b', borderRadius: 12 }}>
                        <div style={{ fontSize: '3rem', marginBottom: 14 }}>📋</div>
                        <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-.02em', marginBottom: 8, color: '#e5e2e1', margin: '0 0 8px' }}>
                          Aucun programme{filter ? ` de type ${TYPE_CONFIG[filter]?.label}` : ''}.
                        </h3>
                        <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginBottom: 18, marginTop: 8 }}>Créez votre premier programme pour commencer.</p>
                        <button className="grad-btn" onClick={() => setActiveTab('create')}>Créer un programme →</button>
                      </div>
                    )}

                    {/* Programs grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                      {filteredPrograms.map((p, i) => {
                        const cfg = TYPE_CONFIG[p.type] || { icon: '📄', label: p.type, color: '#9CA3AF' };
                        const isFeatured = i === 0 && filteredPrograms.length > 1;
                        return (
                          <div
                            key={p.id}
                            className="prog-card"
                            style={{
                              background: '#1c1b1b',
                              borderRadius: 12,
                              overflow: 'hidden',
                              position: 'relative',
                              gridColumn: isFeatured ? 'span 2' : 'span 1',
                              animationDelay: `${i * 80}ms`,
                              cursor: 'default',
                            }}
                          >
                            {/* PROBLÈME 3 FIX — featured card avec image background */}
                            {isFeatured && (
                              <>
                                <img
                                  src={HERO_IMAGES[i % HERO_IMAGES.length]}
                                  alt=""
                                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.18) saturate(0.6)' }}
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(19,19,19,0.97) 0%, rgba(19,19,19,0.75) 60%, rgba(137,7,14,0.12) 100%)' }} />
                              </>
                            )}
                            <div style={{ position: 'relative', zIndex: 1, padding: isFeatured ? '24px' : '18px' }}>
                              {/* Top accent line */}
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isFeatured ? 16 : 12 }}>
                                <div style={{ fontSize: isFeatured ? '2rem' : '1.6rem' }}>{cfg.icon}</div>
                                <span style={{ fontSize: '.56rem', background: `${cfg.color}20`, borderRadius: 4, padding: '2px 8px', color: cfg.color, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{cfg.label}</span>
                              </div>
                              <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: isFeatured ? '1.15rem' : '.96rem', letterSpacing: '-.03em', marginBottom: 8, color: '#e5e2e1', lineHeight: 1.15, margin: '0 0 8px' }}>
                                {p.title}
                              </h3>
                              <p style={{ fontSize: '.74rem', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 14, minHeight: isFeatured ? 50 : 36, margin: '0 0 14px' }}>
                                {p.description || <span style={{ fontStyle: 'italic', opacity: .5 }}>Aucune description.</span>}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '.6rem', color: '#6B7280' }}>
                                <span>👤 {p.coachName || 'Coach'}</span>
                                <span>{formatDate(p.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredPrograms.length > 0 && (
                      <div style={{ marginTop: 18, textAlign: 'center' }}>
                        <button className="ghost-btn" onClick={() => setActiveTab('create')}>+ Créer un nouveau programme</button>
                      </div>
                    )}
                  </div>
                )}

                {/* ══ TAB: CRÉER ══ */}
                {activeTab === 'create' && (
                  <div style={{ maxWidth: 560 }}>
                    <div style={{ background: '#1c1b1b', borderRadius: 14, padding: '26px' }}>
                      <p style={{ fontSize: '.8rem', color: '#9CA3AF', marginBottom: 24, lineHeight: 1.75, margin: '0 0 24px' }}>
                        Le programme sera disponible pour être assigné à vos membres immédiatement après création.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <label className="field-label">Titre du programme *</label>
                          <input className="field-input" type="text" placeholder="Ex : Programme Force 12 semaines" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div>
                          <label className="field-label">Description</label>
                          <textarea className="field-input field-textarea" rows={4} placeholder="Objectifs, contenu, structure du programme…" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div>
                          <label className="field-label">Type de programme</label>
                          <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="nutrition">🥗 Nutrition</option>
                            <option value="sport">🏋️ Sport &amp; Fitness</option>
                            <option value="business">🧠 Business &amp; Mindset</option>
                          </select>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '12px 14px', fontSize: '.72rem', color: '#9CA3AF', lineHeight: 1.65, borderLeft: '2px solid rgba(178,42,39,0.3)' }}>
                          <span style={{ color: '#b22a27' }}>🚀 Prochainement :</span>{' '}Upload PDF, vidéos, plan nutritionnel intégré, intégration Stripe.
                        </div>
                        <button onClick={handleCreateProgram} disabled={loading} className="grad-btn" style={{ width: '100%', padding: '14px', opacity: loading ? .65 : 1, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {loading ? <><span className="spin-sm" /> Création en cours…</> : '▶ Créer le programme'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ TAB: CLIENTS ══ */}
                {activeTab === 'clients' && (
                  <div>
                    {/* Add member form */}
                    <div style={{ background: '#1c1b1b', borderRadius: 12, padding: '20px 22px', marginBottom: 22, maxWidth: 500 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 4, color: '#e5e2e1' }}>Ajouter un membre</div>
                      <p style={{ fontSize: '.72rem', color: '#9CA3AF', marginBottom: 13, margin: '4px 0 13px' }}>Le membre doit avoir un compte SundaraFlow actif.</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="field-input"
                          style={{ flex: 1 }}
                          type="email"
                          placeholder="email@membre.com"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddClient(clientEmail); }}
                        />
                        <button className="grad-btn" style={{ flexShrink: 0, padding: '10px 16px' }} onClick={() => handleAddClient(clientEmail)}>
                          + Ajouter
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '.55rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Mes membres ({clients.length})
                    </div>

                    {/* Empty state */}
                    {clients.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1c1b1b', borderRadius: 12 }}>
                        <div style={{ fontSize: '3rem', marginBottom: 14 }}>👥</div>
                        <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-.02em', color: '#e5e2e1', margin: '0 0 8px' }}>Aucun membre encore.</h3>
                        <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 0 }}>Ajoutez leur email ci-dessus pour commencer.</p>
                      </div>
                    )}

                    {/* Members grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
                      {clients.map((c, i) => (
                        <div key={c.id} className="member-card" style={{ background: '#1c1b1b', borderRadius: 12, padding: '18px', animationDelay: `${i * 80}ms` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 900, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif' }}>
                              {initials(c.name || c.email || '?')}
                            </div>
                            <span style={{ fontSize: '.55rem', background: 'rgba(22,163,74,0.12)', borderRadius: 4, padding: '2px 8px', color: '#16a34a', fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>● Actif</span>
                          </div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.94rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>{c.name || '—'}</div>
                          <div style={{ fontSize: '.68rem', color: '#9CA3AF', marginBottom: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>
                          {/* Progress bar — cosmetic */}
                          <div style={{ marginBottom: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: '.52rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' }}>Progression</span>
                              <span style={{ fontSize: '.68rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27' }}>—</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                              <div className="prog-bar-fill" style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10 }} />
                            </div>
                          </div>
                          <button
                            className="assign-btn"
                            onClick={() => { setSelectedClient(c.id); setActiveTab('assign'); fireToast('🔗', 'Membre sélectionné', `${c.name} prêt pour l'assignation.`); }}
                          >
                            Assigner un programme →
                          </button>
                          <button
                            className="calc-needs-btn"
                            onClick={() => setCalcModal({ name: c.name || c.email || 'Membre', id: c.id })}
                          >
                            📊 Calculer les besoins
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ══ TAB: ASSIGNER ══ */}
                {activeTab === 'assign' && (
                  <div style={{ maxWidth: 540 }}>
                    <div style={{ background: '#1c1b1b', borderRadius: 14, padding: '26px' }}>
                      <p style={{ fontSize: '.8rem', color: '#9CA3AF', marginBottom: 24, lineHeight: 1.75, margin: '0 0 24px' }}>
                        Le membre verra ce programme dans son espace SundaraFlow immédiatement après confirmation.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <label className="field-label">Membre</label>
                          <select className="field-input" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                            <option value="">— Sélectionner un membre —</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="field-label">Programme</label>
                          <select className="field-input" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
                            <option value="">— Sélectionner un programme —</option>
                            {programs.map((p) => {
                              const cfg = TYPE_CONFIG[p.type] || { icon: '📄' };
                              return (
                                <option key={p.id} value={p.id}>{cfg.icon} {p.title} · {TYPE_CONFIG[p.type]?.label || p.type}</option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Preview */}
                        {selectedClient && selectedProgram && (() => {
                          const c = clients.find((x) => x.id === selectedClient);
                          const p = programs.find((x) => x.id === selectedProgram);
                          const cfg = TYPE_CONFIG[p?.type] || { icon: '📄', label: p?.type, color: '#9CA3AF' };
                          return (
                            <div style={{ background: '#2a2a2a', borderRadius: 9, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: '1.3rem' }}>{cfg.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.84rem', marginBottom: 2, color: '#e5e2e1' }}>{p?.title}</div>
                                <div style={{ fontSize: '.68rem', color: '#9CA3AF' }}>→ <strong style={{ color: '#e3beb8' }}>{c?.name}</strong></div>
                              </div>
                              <span style={{ fontSize: '.56rem', background: `${cfg.color}20`, borderRadius: 4, padding: '2px 8px', color: cfg.color, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{cfg.label}</span>
                            </div>
                          );
                        })()}

                        {programs.length === 0 && (
                          <div style={{ background: 'rgba(178,42,39,0.07)', borderRadius: 7, padding: '10px 13px', fontSize: '.74rem', color: '#e3beb8' }}>
                            ⚠️ Aucun programme.{' '}
                            <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#b22a27' }} onClick={() => setActiveTab('create')}>Créer un programme →</span>
                          </div>
                        )}
                        {clients.length === 0 && (
                          <div style={{ background: 'rgba(178,42,39,0.07)', borderRadius: 7, padding: '10px 13px', fontSize: '.74rem', color: '#e3beb8' }}>
                            ⚠️ Aucun membre.{' '}
                            <span style={{ cursor: 'pointer', textDecoration: 'underline', color: '#b22a27' }} onClick={() => setActiveTab('clients')}>Ajouter un membre →</span>
                          </div>
                        )}

                        <button onClick={handleAssignProgram} className="grad-btn" style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          ✓ Confirmer l&apos;assignation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>{/* /content-area */}
            </main>
          </div>{/* /body */}
        </div>{/* /root */}

        {/* ══ MODALE CALCULATEUR ══ */}
        {calcModal && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setCalcModal(null); }}
          >
            <div style={{ background: '#1c1b1b', borderRadius: 16, padding: 32, maxWidth: 620, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'modalIn .25s ease' }}>

              {/* Bouton fermer */}
              <button
                onClick={() => setCalcModal(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem', lineHeight: 1, transition: 'background .2s', flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >×</button>

              {/* En-tête */}
              <div style={{ marginBottom: 22, paddingRight: 40 }}>
                <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 7 }}>
                  📊 Calculateur
                </div>
                <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-.04em', lineHeight: .95, color: '#e5e2e1', margin: 0 }}>
                  Calculateur — {calcModal.name}
                </h2>
                <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginTop: 8, lineHeight: 1.7 }}>
                  Estimez les besoins caloriques de ce membre pour adapter son programme.
                </p>
              </div>

              {/* Composant calculateur */}
              <CalorieCalculator mode="coach" memberName={calcModal.name} />

              {/* CTA bas */}
              <button
                onClick={() => setCalcModal(null)}
                className="modal-use-btn"
                style={{ width: '100%', marginTop: 20, padding: 14, background: 'linear-gradient(135deg,#89070e,#b22a27)', border: 'none', borderRadius: 8, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s' }}
              >
                UTILISER CES VALEURS POUR LE PROGRAMME →
              </button>
            </div>
          </div>
        )}

        {/* ── MOBILE OVERLAY ── */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 49, backdropFilter: 'blur(2px)' }}
          />
        )}

        {/* ══ STYLES ══ */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #131313; }

          /* ── Sidebar scroll ── */
          .sidebar::-webkit-scrollbar { width: 3px; }
          .sidebar::-webkit-scrollbar-track { background: transparent; }
          .sidebar::-webkit-scrollbar-thumb { background: rgba(178,42,39,0.3); border-radius: 10px; }

          /* ── Global scrollbar ── */
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: #131313; }
          ::-webkit-scrollbar-thumb { background: rgba(178,42,39,0.28); border-radius: 10px; }

          /* ── Buttons ── */
          .grad-btn {
            background: linear-gradient(135deg,#89070e,#0e0e0e);
            color: #e5e2e1; border: none; border-radius: 7px;
            padding: 11px 20px;
            font-family: 'Lexend', sans-serif; font-weight: 700;
            font-size: .7rem; letter-spacing: .1em; text-transform: uppercase;
            cursor: pointer; transition: transform .2s ease, filter .2s ease;
          }
          .grad-btn:hover { transform: scale(1.03); filter: brightness(1.12); }

          .ghost-btn {
            background: transparent; border: 1px solid rgba(255,255,255,0.09); border-radius: 7px;
            padding: 9px 18px; font-family: 'Lexend', sans-serif; font-weight: 700;
            font-size: .66rem; letter-spacing: .1em; text-transform: uppercase;
            color: #9CA3AF; cursor: pointer; transition: transform .2s ease, border-color .2s ease;
          }
          .ghost-btn:hover { transform: scale(1.03); border-color: rgba(178,42,39,0.35); color: #e3beb8; }

          .hdr-btn {
            background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px;
            padding: 7px 13px; font-family: 'Lexend', sans-serif; font-weight: 700;
            font-size: .62rem; letter-spacing: .1em; text-transform: uppercase;
            color: #6B7280; cursor: pointer; transition: transform .2s, color .2s;
          }
          .hdr-btn:hover { transform: scale(1.03); color: #9CA3AF; }

          .assign-btn {
            width: 100%; background: rgba(178,42,39,0.1); border: none; border-radius: 7px;
            padding: 9px; font-size: .62rem; font-family: 'Lexend', sans-serif; font-weight: 700;
            letter-spacing: .08em; text-transform: uppercase; color: #e3beb8; cursor: pointer;
            transition: background .2s ease, transform .2s ease;
          }
          .assign-btn:hover { background: rgba(178,42,39,0.2); transform: scale(1.02); }

          .calc-needs-btn {
            width: 100%; margin-top: 7px;
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 7px;
            padding: 8px; font-size: .6rem; font-family: 'Lexend', sans-serif; font-weight: 700;
            letter-spacing: .08em; text-transform: uppercase; color: #6B7280; cursor: pointer;
            transition: background .2s ease, border-color .2s ease, color .2s ease;
          }
          .calc-needs-btn:hover { background: rgba(178,42,39,0.08); border-color: rgba(178,42,39,0.28); color: #e3beb8; }

          .modal-use-btn:hover { transform: scale(1.02) !important; box-shadow: 0 0 24px rgba(178,42,39,0.35) !important; }

          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.96) translateY(12px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
          }

          /* ── Forms ── */
          .field-label {
            display: block; margin-bottom: 7px;
            font-size: .56rem; font-family: 'Inter', sans-serif; font-weight: 600;
            letter-spacing: .16em; text-transform: uppercase; color: #9CA3AF;
          }
          .field-input {
            width: 100%; background: #2a2a2a; border: 1px solid rgba(255,255,255,0.07);
            border-radius: 7px; padding: 10px 12px; color: #e5e2e1;
            font-family: 'Inter', sans-serif; font-size: .83rem; outline: none;
            transition: border-color .2s ease, box-shadow .2s ease;
          }
          .field-input:focus {
            border-color: rgba(178,42,39,0.5);
            box-shadow: 0 0 0 3px rgba(178,42,39,0.09);
          }
          .field-textarea { resize: vertical; }
          select.field-input option { background: #2a2a2a; color: #e5e2e1; }

          /* ── Spinner ── */
          .spin-sm {
            width: 13px; height: 13px;
            border: 2px solid rgba(255,255,255,.07); border-top-color: #b22a27;
            border-radius: 50%; animation: spin .7s linear infinite;
            display: inline-block; flex-shrink: 0; vertical-align: middle;
          }

          /* ── ANIMATIONS ── */
          /* PROBLÈME 4 FIX */

          /* fadeUp — KPI cards & program cards */
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .kpi-card-anim {
            animation: fadeUp .45s ease both;
          }

          /* Program card hover: scale + crimson glow */
          .prog-card {
            animation: fadeUp .45s ease both;
            transition: transform .25s ease, box-shadow .25s ease !important;
          }
          .prog-card:hover {
            transform: scale(1.02);
            box-shadow: 0 0 20px rgba(178,42,39,0.15), 0 8px 24px rgba(0,0,0,0.35);
          }

          /* Member card hover */
          .member-card {
            animation: fadeUp .45s ease both;
            transition: transform .25s ease, box-shadow .25s ease;
          }
          .member-card:hover {
            transform: scale(1.015);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          }

          /* Filter pills hover */
          .filter-pill:hover { opacity: .85; }

          /* Progress bar fill animation */
          .prog-bar-fill {
            animation: growWidth 1.2s ease forwards;
            width: 0 !important;
          }
          @keyframes growWidth {
            from { width: 0 !important; }
            to   { width: 40% !important; }
          }

          @keyframes spin { to { transform: rotate(360deg); } }

          /* ── Mobile ── */
          @media (max-width: 768px) {
            .burger { display: flex !important; }
            .sidebar {
              transform: translateX(-100%);
              transition: transform .25s ease;
              z-index: 160 !important;
            }
            .sidebar.sidebar-open { transform: translateX(0); }
            .main-area { margin-left: 0 !important; }
            .kpi-row { grid-template-columns: 1fr 1fr !important; }
          }

          @media (max-width: 480px) {
            .kpi-row { grid-template-columns: 1fr 1fr !important; }
          }

          /* Featured card spans 2 cols — only when there are multiple */
          @media (max-width: 600px) {
            [style*="span 2"] { grid-column: span 1 !important; }
          }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
