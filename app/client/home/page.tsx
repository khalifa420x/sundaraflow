'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs,
  doc, getDoc, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';

/* ══════════════════════════════════════════════════
   MOCK DATA  — affichés si Firestore est vide
══════════════════════════════════════════════════ */
const MOCK_PROGRAMS = [
  { id: 'mp1', title: 'Force & Hypertrophie', type: 'sport',     assignedAt: null, coachName: 'Thomas Martin', progress: 45, days: 18 },
  { id: 'mp2', title: 'HIIT Brûle-graisses',  type: 'sport',     assignedAt: null, coachName: 'Thomas Martin', progress: 0,  days: 0  },
];
const MOCK_NUTRITION = {
  calories: 2000, maintenanceCalories: 2500, protein: 150, carbs: 200, fat: 65,
  fastingType: '16/8', windowStart: '12:00', windowEnd: '20:00',
  notes: 'Favoriser les protéines le matin. Éviter les glucides raffinés après 19h.',
};
const MOCK_MEALS = [
  { id: 'mm1', emoji: '🥚', name: 'Petit-déjeuner Protéiné', time: '12:00', description: 'Omelette 3 œufs · Avoine 60g · Fruits rouges', calories: 520, protein: 38, carbs: 48, fat: 16 },
  { id: 'mm2', emoji: '🍗', name: 'Déjeuner Performance',     time: '15:00', description: 'Poulet 200g · Riz basmati 120g · Brocolis vapeur', calories: 680, protein: 52, carbs: 72, fat: 18 },
  { id: 'mm3', emoji: '🥜', name: 'Collation Anabolique',     time: '17:30', description: 'Amandes 30g · Yaourt grec 0% · Banane',             calories: 285, protein: 18, carbs: 26, fat: 12 },
  { id: 'mm4', emoji: '🥑', name: 'Dîner Légèreté',           time: '19:00', description: 'Saumon 180g · Patate douce · Salade · Avocat ¼',   calories: 615, protein: 45, carbs: 52, fat: 24 },
];
const MOCK_TIPS = [
  { id: 'mt1', category: 'lifestyle', title: 'Hydratation optimale',    content: 'Buvez 30-35ml d\'eau par kg de poids corporel par jour. Commencez chaque matin avec 500ml avant café ou thé.' },
  { id: 'mt2', category: 'training',  title: 'Progression des charges', content: 'Augmentez de 2.5kg toutes les 2-3 semaines sur les exercices composés. La progression linéaire est la clé du progrès.' },
  { id: 'mt3', category: 'nutrition', title: 'Fenêtre anabolique',       content: 'Consommez 25-40g de protéines dans les 30-60 min après l\'entraînement pour maximiser la synthèse musculaire.' },
  { id: 'mt4', category: 'mindset',   title: 'Qualité du sommeil',       content: 'Dormez 7-9h par nuit. La récupération musculaire se fait à 70% pendant le sommeil profond. Couchez-vous à heure fixe.' },
];

/* ── Constants ── */
const TYPE_CONFIG: Record<string, { icon: string; badge: string; label: string; gradient: string }> = {
  nutrition: { icon: '🥗', badge: 'badge-green', label: 'Nutrition', gradient: 'linear-gradient(135deg,#16a34a,var(--green))' },
  sport:     { icon: '🏋️', badge: 'badge-blue',  label: 'Sport',     gradient: 'linear-gradient(135deg,#2563eb,var(--blue))'  },
  business:  { icon: '🧠', badge: 'badge-dim',   label: 'Business',  gradient: 'linear-gradient(135deg,#374151,#4B5563)' },
};
const CAT_ICON: Record<string, string> = { nutrition: '🥗', training: '🏋️', lifestyle: '🌿', mindset: '🧠' };
const TIP_CAT_LABEL: Record<string, string> = { nutrition: 'Nutrition', training: 'Entraînement', lifestyle: 'Lifestyle', mindset: 'Mindset' };

const daysSince = (ts: Timestamp | null | undefined): number => {
  if (!ts) return 0;
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};

/* ════════════════════════════════════════
   CLIENT HOME
════════════════════════════════════════ */
export default function ClientHome() {
  const router = useRouter();

  /* Auth */
  const [user, setUser]         = useState<import('firebase/auth').User | null>(null);
  const [userName, setUserName] = useState('');

  /* Firestore data */
  const [assignments, setAssignments]     = useState<any[]>([]);
  const [nutritionPlan, setNutritionPlan] = useState<any | null>(null);
  const [clientMeals, setClientMeals]     = useState<any[]>([]);
  const [tips, setTips]                   = useState<any[]>([]);
  const [coachId, setCoachId]             = useState('');
  const [coachName, setCoachName]         = useState('');

  /* UI */
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  /* Computed: real data or mock fallback */
  const displayPrograms = assignments.length > 0 ? assignments : MOCK_PROGRAMS;
  const displayNut      = nutritionPlan || MOCK_NUTRITION;
  const displayMeals    = clientMeals.length > 0 ? clientMeals : MOCK_MEALS;
  const displayTips     = tips.length > 0 ? tips : MOCK_TIPS;

  /* Deficit */
  const deficit   = (displayNut.maintenanceCalories || 2500) - (displayNut.calories || 2000);
  const weeklyKg  = (deficit * 7 / 7700).toFixed(2);
  const defColor  = deficit > 0 ? 'var(--green)' : deficit < 0 ? '#f87171' : 'var(--wd)';
  const defLabel  = deficit > 0 ? `−${deficit} kcal` : deficit < 0 ? `+${Math.abs(deficit)} kcal surplus` : 'Équilibre';

  /* Fasting status */
  const getFastingStatus = () => {
    if (!displayNut.fastingType || displayNut.fastingType === 'none') return null;
    const now = new Date();
    const [sh, sm] = (displayNut.windowStart || '12:00').split(':').map(Number);
    const [eh, em] = (displayNut.windowEnd   || '20:00').split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const inWindow = nowMin >= startMin && nowMin < endMin;
    const pct = inWindow ? Math.round(((nowMin - startMin) / (endMin - startMin)) * 100) : 0;
    return { inWindow, pct };
  };
  const fastStatus = getFastingStatus();

  /* Mount */
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Auth + name */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? snap.data() : {};
        setUserName(d.name || d.displayName || u.displayName || u.email?.split('@')[0] || 'vous');
      } catch {
        setUserName(u.displayName || u.email?.split('@')[0] || 'vous');
      }
    });
    return () => unsub();
  }, []);

  /* Fetch all */
  const fetchAll = async (u = user) => {
    if (!u) return;
    setLoading(true);
    try {
      /* Assigned programs */
      const aSnap = await getDocs(query(
        collection(db, 'program_assignments'),
        where('clientId', '==', u.uid),
        orderBy('assignedAt', 'desc')
      ));
      const progData: any[] = [];
      for (const docSnap of aSnap.docs) {
        const { programId, assignedAt } = docSnap.data();
        const pDoc = await getDoc(doc(db, 'programs', programId));
        if (pDoc.exists()) progData.push({ id: docSnap.id, assignedAt, ...pDoc.data() });
      }
      setAssignments(progData);

      /* Find coach */
      const clientSnap = await getDocs(query(collection(db, 'clients'), where('clientUserId', '==', u.uid)));
      if (!clientSnap.empty) {
        const cId = clientSnap.docs[0].data().coachId;
        setCoachId(cId);
        try {
          const coachDoc = await getDoc(doc(db, 'users', cId));
          if (coachDoc.exists()) setCoachName(coachDoc.data().name || coachDoc.data().email || 'Votre coach');
        } catch {}

        /* Nutrition plan */
        const nutSnap = await getDocs(query(collection(db, 'nutrition_assignments'), where('clientId', '==', u.uid)));
        setNutritionPlan(nutSnap.empty ? null : { id: nutSnap.docs[0].id, ...nutSnap.docs[0].data() });

        /* Tips */
        const tipSnap = await getDocs(query(collection(db, 'coach_tips'), where('coachId', '==', cId), limit(10)));
        const tipData = tipSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        tipData.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTips(tipData);
      }

      /* Meals from coach */
      const mealsSnap = await getDocs(query(collection(db, 'coach_meals'), where('clientId', '==', u.uid)));
      const mealsData = mealsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      mealsData.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      setClientMeals(mealsData);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', 'Impossible de charger vos données.');
    }
    setLoading(false);
  };

  useEffect(() => { if (user) fetchAll(user); }, [user]);
  const handleSignOut = async () => { await signOut(auth); router.push('/login'); };

  /* ── Helpers ── */
  const Spinner = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--wf)', borderTopColor: 'var(--gold)', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: '.73rem', color: 'var(--wd)' }}>Chargement…</p>
    </div>
  );

  const SecHeader = ({ tag, icon, title, accent, byCoach = false }: { tag: string; icon: string; title: string; accent: string; byCoach?: boolean }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(158,27,27,.1)', border: '1px solid rgba(158,27,27,.22)', borderRadius: '9999px', padding: '4px 14px', marginBottom: 12, fontFamily: 'Lexend, sans-serif', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#f87171' }}>{icon} {tag}</div>
      <h2 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,2.8vw,2.2rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.05, marginTop: 4 }}>
        {title} <span style={{ color: '#9E1B1B' }}>{accent}</span>
      </h2>
      {byCoach && coachName && <p style={{ fontSize: '.75rem', color: '#9CA3AF', marginTop: 6, fontFamily: 'Inter, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' as const, fontWeight: 600, fontSize: '.62rem' as any }}>Par {coachName}</p>}
    </div>
  );

  return (
    <ProtectedRoute role="client">
      <>
        <Toast />
        <div className="sf-page-root" style={{ minHeight: '100vh', background: '#121212', color: '#FFFFFF', fontFamily: 'Inter, sans-serif',
          /* ── Color token overrides — Kinetic Monolith system ── */
          ['--gold' as any]: '#9E1B1B', ['--gold-d' as any]: '#7a1212', ['--gold-glow' as any]: 'rgba(158,27,27,0.14)',
          ['--amber' as any]: '#9E1B1B', ['--blue' as any]: '#9E1B1B', ['--purple' as any]: '#9E1B1B',
          ['--green' as any]: '#16a34a', ['--red' as any]: '#dc2626',
          ['--k0' as any]: '#121212', ['--k2' as any]: '#1a1a1a', ['--k3' as any]: '#1e1e1e', ['--k4' as any]: '#252525',
          ['--wf' as any]: 'rgba(255,255,255,0.07)', ['--w' as any]: '#FFFFFF', ['--wd' as any]: '#9CA3AF',
          ['--fd' as any]: 'Lexend, sans-serif', ['--fb' as any]: 'Inter, sans-serif',
          ['--r' as any]: '6px', ['--rl' as any]: '12px', ['--rxl' as any]: '16px',
        }}>

          {/* ══ HEADER ══ */}
          <header style={{ borderBottom: '1px solid var(--wf)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'rgba(6,6,6,.93)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.3rem', letterSpacing: '.04em', cursor: 'pointer', fontWeight: 700 }} onClick={() => router.push('/')}>
              Sundara<span style={{ color: '#9E1B1B' }}>Flow</span>
              <span style={{ fontSize: '.58rem', color: '#9CA3AF', marginLeft: 10, fontFamily: 'Inter, sans-serif', letterSpacing: '.08em', fontWeight: 400 }}>Espace Membre</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(158,27,27,.2)', border: '1px solid rgba(158,27,27,.35)', borderRadius: '9999px', padding: '3px 10px', fontSize: '.65rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#f87171' }}>👤 Membre</span>
              <span style={{ fontSize: '.7rem', color: '#9CA3AF' }}>{userName || user?.email}</span>
              <button className="btn btn-gold btn-sm" onClick={() => router.push('/client')}>Mes programmes →</button>
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Déconnexion</button>
            </div>
          </header>

          {/* ══ APP SHELL ══ */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 100px' }}>

            {/* ── HERO ── */}
            <section style={{ position: 'relative', overflow: 'hidden', padding: '52px 0 40px', marginBottom: 32 }}>
              <div className="hero-bg" />
              <div className="hero-grid-lines" />
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(22px)', transition: 'opacity .55s ease, transform .55s ease' }}>
                <div className="hero-eyebrow" style={{ marginBottom: 18 }}>{greeting()}, {userName || 'athlète'}</div>
                <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(2rem,5vw,3.8rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .96, marginBottom: 14 }}>
                  Votre parcours <span style={{ color: '#9E1B1B' }}>commence ici.</span>
                </h1>
                <p style={{ fontSize: 'clamp(.88rem,1.6vw,1.05rem)', color: 'var(--wd)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.88 }}>
                  {displayPrograms.length} programme{displayPrograms.length !== 1 ? 's' : ''}{displayNut ? ' · Nutrition active' : ''}{displayMeals.length > 0 ? ` · ${displayMeals.length} repas` : ''}{displayTips.length > 0 ? ` · ${displayTips.length} conseils` : ''}.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-gold" onClick={() => router.push('/client')}>📂 Voir mes programmes</button>
                  <button className="btn btn-outline" onClick={() => document.getElementById('prog-section')?.scrollIntoView({ behavior: 'smooth' })}>↓ Aperçu</button>
                </div>
              </div>
            </section>

            {/* App shell titlebar */}
            <div className="app-shell" style={{ marginBottom: 48, opacity: mounted ? 1 : 0, transition: 'opacity .5s ease .1s' }}>
              <div className="app-titlebar">
                <div className="atb-left">
                  <div className="atb-dots">
                    <div className="atb-dot atb-dot-r" />
                    <div className="atb-dot atb-dot-y" />
                    <div className="atb-dot atb-dot-g" />
                  </div>
                  <div className="atb-brand">Sundara<span>Flow</span> <span style={{ fontSize: '.65rem', color: 'var(--wd)', fontFamily: 'var(--fb)', fontWeight: 400 }}>— Espace Membre</span></div>
                </div>
                <div className="atb-right">
                  <div className="atb-user">
                    <div className="atb-av">{(userName || 'CL').slice(0, 2).toUpperCase()}</div>
                    <span>{userName || 'Membre'}</span>
                  </div>
                  {coachName && <span style={{ fontSize: '.68rem', color: 'var(--wd)' }}>Coach : <strong style={{ color: 'var(--gold)' }}>{coachName}</strong></span>}
                </div>
              </div>

              {/* KPI row */}
              <div className="app-main" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
                  {[
                    { icon: '📋', label: 'Programmes',      val: loading ? '—' : displayPrograms.length,    color: '#9E1B1B' },
                    { icon: '🥗', label: 'Plan nutrition',  val: loading ? '—' : `${displayNut.calories} kcal`, color: '#16a34a' },
                    { icon: '🍽️', label: 'Repas assignés',  val: loading ? '—' : displayMeals.length,       color: '#9E1B1B' },
                    { icon: '💡', label: 'Conseils',        val: loading ? '—' : displayTips.length,        color: '#9CA3AF' },
                    { icon: '⏱️', label: 'Jeûne',           val: loading ? '—' : displayNut.fastingType || '—', color: '#9E1B1B' },
                  ].map(k => (
                    <div className="kpi-card" key={k.label}>
                      <div className="kpi-label">{k.icon} {k.label}</div>
                      <div className="kpi-val" style={{ fontSize: '1.5rem', color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════
                SECTION 1 — PROGRAMMES
            ══════════════════════════════════════ */}
            <div id="prog-section" style={{ marginBottom: 60, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease .15s, transform .5s ease .15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
                <SecHeader tag="Entraînement" icon="🏋️" title="Mes" accent="programmes." byCoach={false} />
                <button className="btn btn-outline btn-sm" onClick={() => router.push('/client')}>Voir tout →</button>
              </div>
              {loading ? <Spinner /> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {displayPrograms.slice(0, 4).map((p: any, i: number) => {
                    const cfg = TYPE_CONFIG[p.type] || { icon: '📄', badge: 'badge-dim', label: p.type || 'Programme', gradient: 'var(--k4)' };
                    const days = p.assignedAt ? daysSince(p.assignedAt) : (p.days || 0);
                    const prog = p.progress || 0;
                    return (
                      <div key={p.id} className="cp-card" style={{ animation: 'fadeUp .4s ease both', animationDelay: `${i*70}ms`, cursor: 'pointer' }} onClick={() => router.push('/client')}>
                        <div className="cp-av" style={{ background: cfg.gradient, fontSize: '1.2rem', color: 'var(--k0)' }}>{cfg.icon}</div>
                        <div className="cp-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span className="cp-name">{p.title}</span>
                            <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                          </div>
                          <div className="cp-prog-wrap">
                            <div className="cp-prog-bar"><div className="cp-fill" style={{ width: `${prog}%` }} /></div>
                            <span className="cp-pct">{prog > 0 ? `${prog}%` : 'À démarrer'}</span>
                          </div>
                          <div className="cp-meta">
                            {p.coachName && <span className="badge badge-dim">👤 {p.coachName}</span>}
                            <span className="badge badge-dim">📅 {days === 0 ? "Assigné aujourd'hui" : `Il y a ${days}j`}</span>
                          </div>
                        </div>
                        <span style={{ color: 'var(--wd)', fontSize: '1.1rem', flexShrink: 0 }}>→</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════
                SECTION 2 — JEÛNE INTERMITTENT
            ══════════════════════════════════════ */}
            <div style={{ marginBottom: 60, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease .2s, transform .5s ease .2s' }}>
              <SecHeader tag="Jeûne Intermittent" icon="⏱️" title="Votre protocole" accent="de jeûne." byCoach />
              {loading ? <Spinner /> : (
                <>
                  <div className="fast-widget" style={{ marginBottom: 18 }}>
                    <div className="fast-timer">{displayNut.fastingType || '—'}</div>
                    <div className="fast-body">
                      <h4>Jeûne Intermittent {displayNut.fastingType}</h4>
                      <p>
                        Fenêtre alimentaire : <strong style={{ color: 'var(--gold)' }}>{displayNut.windowStart} – {displayNut.windowEnd}</strong>
                        {fastStatus?.inWindow
                          ? <span style={{ marginLeft: 12 }}>· <span style={{ color: 'var(--green)' }}>✓ Fenêtre ouverte</span></span>
                          : <span style={{ marginLeft: 12 }}>· <span style={{ color: 'var(--wd)' }}>Hors fenêtre</span></span>
                        }
                      </p>
                      <div className="fast-prog-bar">
                        <div className="fast-prog-fill" style={{ width: fastStatus ? `${fastStatus.pct}%` : '0%' }} />
                      </div>
                    </div>
                    <span className={`badge ${fastStatus?.inWindow ? 'badge-green' : 'badge-dim'}`}>
                      {fastStatus?.inWindow ? '✓ Fenêtre ouverte' : '⏸ Jeûne en cours'}
                    </span>
                  </div>
                  <div className="g3">
                    {[
                      { icon: '🔥', title: 'Brûler les graisses',   desc: 'Après 12-16h de jeûne, votre corps utilise les graisses stockées comme carburant principal — mode cétose légère.' },
                      { icon: '🧠', title: 'Clarté mentale',        desc: 'Le jeûne augmente la production de BDNF et améliore la concentration, la mémoire et la créativité.' },
                      { icon: '⚗️', title: 'Autophagie cellulaire', desc: 'À partir de 16h, votre corps active l\'autophagie — nettoyage cellulaire aux effets anti-vieillissement prouvés.' },
                    ].map((c, i) => (
                      <div key={c.title} className="feat-card" style={{ animation: 'fadeUp .4s ease both', animationDelay: `${i*80}ms` }}>
                        <div className="feat-icon">{c.icon}</div>
                        <h3 style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8 }}>{c.title}</h3>
                        <p style={{ fontSize: '.8rem', color: 'var(--wd)', lineHeight: 1.72 }}>{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ══════════════════════════════════════
                SECTION 3 — REPAS IDÉAUX
            ══════════════════════════════════════ */}
            <div style={{ marginBottom: 60, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease .25s, transform .5s ease .25s' }}>
              <SecHeader tag="Repas Idéaux" icon="🍽️" title="Votre plan" accent="alimentaire." byCoach />
              {loading ? <Spinner /> : (
                <div className="meal-plan-grid">
                  {displayMeals.map((m: any, i: number) => (
                    <div key={m.id} className="meal-row" style={{ animation: 'fadeUp .4s ease both', animationDelay: `${i*60}ms` }}>
                      <div className="meal-emoji">{m.emoji || '🍽️'}</div>
                      <div className="meal-info">
                        <div className="meal-name">{m.name}</div>
                        {m.description && <div className="meal-desc">{m.description}</div>}
                        <div className="meal-macros-row">
                          {m.calories && <span className="meal-m">🔥 <strong>{m.calories}</strong> kcal</span>}
                          {m.protein  && <span className="meal-m">🥩 <strong>{m.protein}g</strong> prot</span>}
                          {m.carbs    && <span className="meal-m">🌾 <strong>{m.carbs}g</strong> gluc</span>}
                          {m.fat      && <span className="meal-m">🥑 <strong>{m.fat}g</strong> lip</span>}
                        </div>
                      </div>
                      {m.time && <div className="meal-time">{m.time}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════
                SECTION 4 — DÉFICIT CALORIQUE
            ══════════════════════════════════════ */}
            <div style={{ marginBottom: 60, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease .3s, transform .5s ease .3s' }}>
              <SecHeader tag="Nutrition & Déficit" icon="📊" title="Suivi" accent="calorique." byCoach />
              {loading ? <Spinner /> : (
                <>
                  {/* Deficit banner */}
                  <div style={{ background: deficit > 0 ? 'rgba(34,197,94,.07)' : 'rgba(248,113,113,.07)', border: `1px solid ${deficit > 0 ? 'rgba(34,197,94,.25)' : 'rgba(248,113,113,.25)'}`, borderRadius: 'var(--rl)', padding: '20px 24px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '.62rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 5 }}>{deficit > 0 ? 'Déficit calorique' : 'Surplus calorique'}</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 900, letterSpacing: '-.04em', color: defColor, lineHeight: 1 }}>{defLabel}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--wd)', marginTop: 5 }}>Maintenance {(displayNut.maintenanceCalories || 2500).toLocaleString('fr-FR')} → Objectif {(displayNut.calories || 2000).toLocaleString('fr-FR')} kcal/j</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.62rem', color: 'var(--wd)', marginBottom: 4 }}>Estimation / semaine</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-.04em', color: defColor }}>{deficit > 0 ? '−' : '+'}{Math.abs(parseFloat(weeklyKg))} kg</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--wd)' }}>sur 7 jours</div>
                    </div>
                  </div>

                  {/* Macro cards */}
                  <div className="macro-grid" style={{ marginBottom: 18 }}>
                    {[
                      { icon: '🔥', label: 'Objectif calorique', val: displayNut.calories?.toLocaleString('fr-FR'), unit: 'kcal/j', cls: 'mc-gold', pct: 100 },
                      { icon: '🥩', label: 'Protéines',  val: displayNut.protein, unit: 'g', cls: 'mc-blue',  pct: Math.round(((displayNut.protein || 0) * 4 / (displayNut.calories || 2000)) * 100) },
                      { icon: '🌾', label: 'Glucides',   val: displayNut.carbs,   unit: 'g', cls: 'mc-amber', pct: Math.round(((displayNut.carbs || 0) * 4 / (displayNut.calories || 2000)) * 100) },
                      { icon: '🥑', label: 'Lipides',    val: displayNut.fat,     unit: 'g', cls: 'mc-green', pct: Math.round(((displayNut.fat || 0) * 9 / (displayNut.calories || 2000)) * 100) },
                    ].map(m => (
                      <div className="mac-card" key={m.label}>
                        <div className="mac-icon">{m.icon}</div>
                        <div className="mac-val" style={{ color: 'var(--gold)' }}>{m.val}</div>
                        <div className="mac-unit">{m.unit}</div>
                        <div className="mac-label">{m.label}</div>
                        <div className="mac-bar"><div className={`mac-fill ${m.cls}`} style={{ width: `${Math.min(m.pct, 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>

                  {displayNut.notes && (
                    <div style={{ background: 'var(--k3)', border: '1px solid rgba(158,27,27,.16)', borderRadius: 'var(--r)', padding: '12px 16px', fontSize: '.82rem', color: 'var(--wd)' }}>
                      📝 <strong style={{ color: 'var(--w)' }}>Note de {coachName || 'votre coach'} :</strong> {displayNut.notes}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ══════════════════════════════════════
                SECTION 5 — CONSEILS & LIFESTYLE
            ══════════════════════════════════════ */}
            <div style={{ marginBottom: 60, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease .35s, transform .5s ease .35s' }}>
              <SecHeader tag="Conseils & Lifestyle" icon="💡" title={coachName ? `${coachName} vous` : 'Conseils de votre'} accent={coachName ? 'conseille.' : 'coach.'} byCoach={false} />
              {loading ? <Spinner /> : (
                <>
                  <div className="tip-hero" style={{ marginBottom: 18 }}>
                    <div className="tip-qm">"</div>
                    <div>
                      <div className="tip-lbl">{CAT_ICON[displayTips[0]?.category] || '💡'} {TIP_CAT_LABEL[displayTips[0]?.category] || displayTips[0]?.category} — Conseil du moment</div>
                      <div className="tip-quote">{displayTips[0]?.content}</div>
                      <div className="tip-author">— {displayTips[0]?.title} · <span style={{ color: 'var(--gold)' }}>{coachName || 'Votre coach'}</span></div>
                    </div>
                  </div>
                  {displayTips.length > 1 && (
                    <div className="advice-grid">
                      {displayTips.slice(1).map((t: any, i: number) => (
                        <div key={t.id} className="adv-card" style={{ animation: 'fadeUp .4s ease both', animationDelay: `${i*60}ms` }}>
                          <div className="adv-icon">{CAT_ICON[t.category] || '💡'}</div>
                          <h4>{t.title}</h4>
                          <p>{t.content}</p>
                          <div style={{ marginTop: 10 }}><span className="badge badge-dim">{TIP_CAT_LABEL[t.category] || t.category}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ══════════════════════════════════════
                SECTION 6 — ANALYSES
            ══════════════════════════════════════ */}
            <div style={{ marginBottom: 60, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .5s ease .4s, transform .5s ease .4s' }}>
              <SecHeader tag="Analyses" icon="📈" title="Votre" accent="progression." byCoach={false} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Programmes',        val: loading ? '—' : displayPrograms.length,  sub: 'assignés' },
                  { label: 'Jours de suivi',    val: loading ? '—' : `${displayPrograms[0] ? daysSince(displayPrograms[displayPrograms.length-1]?.assignedAt) : 18}j`, sub: 'depuis le début' },
                  { label: 'Repas assignés',    val: loading ? '—' : displayMeals.length,     sub: 'par votre coach' },
                  { label: 'Conseils reçus',    val: loading ? '—' : displayTips.length,      sub: 'publications' },
                  { label: 'Objectif calorique',val: loading ? '—' : `${displayNut.calories} kcal`, sub: 'par jour' },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div className="stat-box-val">{s.val}</div>
                    <div className="stat-box-label">{s.label}</div>
                    <div style={{ fontSize: '.6rem', color: 'var(--wd)', marginTop: 3 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--k2)', border: '1px dashed var(--wf)', borderRadius: 'var(--r)', padding: '14px 18px', fontSize: '.75rem', color: 'var(--wd)', textAlign: 'center', marginBottom: 20 }}>
                <span style={{ color: 'var(--gold)' }}>📈 Prochainement :</span> Graphiques de progression, suivi du poids, taux d&apos;adhérence, historique des séances.
              </div>

              <div className="g3">
                {[
                  { icon: '🎬', title: 'Vidéos d\'exercices',  desc: 'Accédez aux démonstrations vidéo de chaque exercice de votre programme, directement depuis l\'app.' },
                  { icon: '📄', title: 'Documents PDF',         desc: 'Téléchargez vos plans d\'entraînement, fiches nutrition et ressources partagées par votre coach.' },
                  { icon: '📊', title: 'Suivi de progression',  desc: 'Visualisez votre évolution semaine par semaine avec des graphiques et indicateurs clés.' },
                ].map(item => (
                  <div key={item.title} className="feat-card" style={{ opacity: .6, cursor: 'default', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 14, right: 14, fontSize: '.55rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', background: 'var(--gold-glow)', border: '1px solid rgba(158,27,27,.2)', borderRadius: 100, padding: '2px 8px' }}>Bientôt</div>
                    <div className="feat-icon" style={{ fontSize: '1.4rem' }}>{item.icon}</div>
                    <h3 style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8 }}>{item.title}</h3>
                    <p style={{ fontSize: '.8rem', color: 'var(--wd)', lineHeight: 1.72 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ══ CTA → /client ══ */}
            <div style={{ background: 'linear-gradient(135deg,rgba(158,27,27,.08),rgba(158,27,27,.02))', border: '1px solid rgba(158,27,27,.18)', borderRadius: 'var(--rxl)', padding: 'clamp(30px,5vw,50px)', textAlign: 'center', opacity: mounted ? 1 : 0, transition: 'opacity .5s ease .5s' }}>
              <div className="tag" style={{ marginBottom: 16 }}>📂 Espace personnel</div>
              <h2 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,3vw,2.3rem)', fontWeight: 900, letterSpacing: '-.03em', marginBottom: 12 }}>
                Tous vos programmes en <span style={{ color: '#9E1B1B' }}>un seul endroit.</span>
              </h2>
              <p style={{ fontSize: '.9rem', color: 'var(--wd)', marginBottom: 28, maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.8 }}>
                Accédez à votre dashboard complet pour consulter, filtrer et gérer l&apos;ensemble de vos programmes.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-gold" onClick={() => router.push('/client')} style={{ padding: '14px 38px' }}>📂 Voir mes programmes</button>
                <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Déconnexion</button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

          /* ── Global typography resets scoped to this page ── */
          .sf-page-root, .sf-page-root * { font-family: 'Inter', sans-serif; }

          /* Headings — extrabold, tight tracking, Lexend */
          .sf-page-root h1, .sf-page-root h2, .sf-page-root h3 {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 800 !important;
            letter-spacing: -.03em !important;
            line-height: 1.05 !important;
            color: #FFFFFF;
          }
          .sf-page-root h4 {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: -.02em !important;
          }

          /* Labels — uppercase, wide tracking */
          .sf-page-root .kpi-label {
            font-family: 'Inter', sans-serif !important;
            font-size: .62rem !important;
            font-weight: 600 !important;
            letter-spacing: .16em !important;
            text-transform: uppercase !important;
            color: #9CA3AF !important;
          }

          /* KPI values — Lexend heavy */
          .sf-page-root .kpi-val {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 900 !important;
            letter-spacing: -.04em !important;
            color: #FFFFFF;
          }

          /* Body text */
          .sf-page-root p {
            font-family: 'Inter', sans-serif !important;
            font-weight: 400 !important;
            color: #D1D5DB;
          }

          /* Buttons — uppercase Lexend bold */
          .sf-page-root button,
          .sf-page-root .btn {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: .08em !important;
            text-transform: uppercase !important;
          }

          /* Badges */
          .sf-page-root .badge {
            font-family: 'Inter', sans-serif !important;
            font-size: .6rem !important;
            font-weight: 700 !important;
            letter-spacing: .1em !important;
            text-transform: uppercase !important;
          }

          /* App-shell titlebar brand */
          .sf-page-root .atb-brand {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 900 !important;
            letter-spacing: .04em !important;
            text-transform: uppercase !important;
            font-size: .82rem !important;
          }
          .sf-page-root .atb-brand span:first-child { color: #9E1B1B; }

          /* Hero elements */
          .sf-page-root .hero-eyebrow {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 700 !important;
            font-size: .65rem !important;
            letter-spacing: .18em !important;
            text-transform: uppercase !important;
            color: #9E1B1B !important;
          }

          /* Stat boxes */
          .sf-page-root .stat-box-val {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 900 !important;
            letter-spacing: -.03em !important;
          }
          .sf-page-root .stat-box-label {
            font-family: 'Inter', sans-serif !important;
            font-weight: 600 !important;
            letter-spacing: .1em !important;
            text-transform: uppercase !important;
            font-size: .6rem !important;
          }

          /* Card names */
          .sf-page-root .feat-card h3,
          .sf-page-root .cp-name {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: -.02em !important;
          }

          /* Mac values (nutrition) */
          .sf-page-root .mac-val {
            font-family: 'Lexend', sans-serif !important;
            font-weight: 900 !important;
            letter-spacing: -.03em !important;
          }

          /* Input fields */
          .sf-page-root input,
          .sf-page-root textarea,
          .sf-page-root select {
            font-family: 'Inter', sans-serif !important;
            font-weight: 400 !important;
            font-size: .85rem !important;
          }

          @keyframes spin   { to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
          @media (max-width:900px) { .macro-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width:600px) { .macro-grid { grid-template-columns: 1fr 1fr !important; } .meal-macros-row { flex-wrap:wrap; gap:6px; } }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
