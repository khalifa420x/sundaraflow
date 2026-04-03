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
const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  nutrition: { icon: '🥗', label: 'Nutrition', color: '#16a34a' },
  sport:     { icon: '🏋️', label: 'Sport',     color: '#b22a27' },
  business:  { icon: '🧠', label: 'Business',  color: '#6B7280' },
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
  const deficit  = (displayNut.maintenanceCalories || 2500) - (displayNut.calories || 2000);
  const weeklyKg = (deficit * 7 / 7700).toFixed(2);
  const defColor = deficit > 0 ? '#16a34a' : deficit < 0 ? '#f87171' : '#9CA3AF';
  const defLabel = deficit > 0 ? `−${deficit} kcal` : deficit < 0 ? `+${Math.abs(deficit)} kcal surplus` : 'Équilibre';

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
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: '.73rem', color: '#9CA3AF' }}>Chargement…</p>
    </div>
  );

  /* ─── shared inline style atoms ─── */
  const S = {
    tag: { fontSize: '.58rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase' as const, color: '#b22a27', marginBottom: 10, display: 'block' },
    sectionTitle: { fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .92, color: '#e5e2e1' },
    card: { background: '#2a2a2a', borderRadius: 10, padding: '20px' },
    surface: { background: '#1c1b1b', borderRadius: 10, padding: '20px' },
    label: { fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF' },
    badge: { fontSize: '.58rem', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 8px', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const },
    gradBtn: { background: 'linear-gradient(135deg,#89070e,#0e0e0e)', color: '#e5e2e1', border: 'none', borderRadius: 6, padding: '11px 22px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer' },
    ghostBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '9px 18px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9CA3AF', cursor: 'pointer' },
  };

  return (
    <ProtectedRoute role="client">
      <>
        <Toast />
        <div className="sf-page-root" style={{
          minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif',
          ['--gold' as any]: '#b22a27', ['--gold-d' as any]: '#89070e', ['--gold-glow' as any]: 'rgba(178,42,39,0.12)',
          ['--green' as any]: '#16a34a', ['--k0' as any]: '#131313', ['--k2' as any]: '#1c1b1b',
          ['--k3' as any]: '#232222', ['--k4' as any]: '#2a2a2a', ['--k5' as any]: '#353534',
          ['--wf' as any]: 'rgba(255,255,255,0.06)', ['--w' as any]: '#e5e2e1', ['--wd' as any]: '#9CA3AF',
          ['--fd' as any]: 'Lexend, sans-serif', ['--fb' as any]: 'Inter, sans-serif',
          ['--r' as any]: '8px', ['--rl' as any]: '12px', ['--rxl' as any]: '20px',
          ['--tr' as any]: 'all .2s ease',
        }}>

          {/* ══ HEADER ══ */}
          <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(19,19,19,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '13px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '.06em', cursor: 'pointer', textTransform: 'uppercase' }} onClick={() => router.push('/client/home')}>
              SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(178,42,39,0.15)', borderRadius: 4, padding: '4px 12px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#e3beb8' }}>👤 Membre</div>
              <span style={{ fontSize: '.72rem', color: '#9CA3AF' }}>{userName || user?.email}</span>
              {coachName && <span style={{ fontSize: '.68rem', color: '#9CA3AF' }}>Coach : <strong style={{ color: '#b22a27' }}>{coachName}</strong></span>}
              <button style={S.ghostBtn} onClick={() => router.push('/client')}>Mes programmes →</button>
              <button style={{ ...S.ghostBtn, borderColor: 'rgba(255,255,255,0.06)', color: '#6B7280' }} onClick={handleSignOut}>Déconnexion</button>
            </div>
          </header>

          {/* ══ HERO ══ */}
          <section style={{ position: 'relative', height: 'clamp(400px,52vh,660px)', overflow: 'hidden' }}>
            <img
              src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1920&q=80"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.28) saturate(0.7)' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.96) 0%, rgba(19,19,19,0.6) 55%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, #131313, transparent)' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #b22a27, #89070e, transparent)' }} />
            <div style={{
              position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              padding: 'clamp(24px,5vw,60px)', maxWidth: 1200, margin: '0 auto',
              opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(28px)', transition: 'opacity .65s ease, transform .65s ease',
            }}>
              <span style={S.tag}>{greeting()}, {userName || 'athlète'} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(2.6rem,6.5vw,5.2rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .88, marginBottom: 18, color: '#e5e2e1' }}>
                VOTRE PARCOURS<br /><span style={{ color: '#b22a27' }}>COMMENCE ICI.</span>
              </h1>
              <p style={{ fontSize: 'clamp(.85rem,1.5vw,.98rem)', color: '#9CA3AF', marginBottom: 26, maxWidth: 500, lineHeight: 1.8 }}>
                {loading ? 'Chargement de vos données…' : `${displayPrograms.length} programme${displayPrograms.length !== 1 ? 's' : ''} · Nutrition active · ${displayMeals.length} repas · ${displayTips.length} conseil${displayTips.length !== 1 ? 's' : ''}`}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button style={{ ...S.gradBtn, padding: '14px 32px', fontSize: '.78rem' }} onClick={() => router.push('/client')}>Voir mes programmes →</button>
                <button style={{ background: 'transparent', color: '#e3beb8', border: '1px solid rgba(227,190,184,0.2)', borderRadius: 6, padding: '14px 24px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                  onClick={() => document.getElementById('prog-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Aperçu ↓
                </button>
              </div>
            </div>
          </section>

          {/* ══ KPI BAR ══ */}
          <section style={{ background: '#1c1b1b', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: mounted ? 1 : 0, transition: 'opacity .5s ease .1s' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }} className="kpi-row">
              {[
                { icon: '📋', label: 'Programmes',      val: loading ? '—' : displayPrograms.length,          sub: 'assignés' },
                { icon: '🔥', label: 'Objectif kcal',   val: loading ? '—' : `${displayNut.calories}`,        sub: 'kcal / jour' },
                { icon: '🍽️', label: 'Repas assignés',  val: loading ? '—' : displayMeals.length,            sub: 'par votre coach' },
                { icon: '💡', label: 'Conseils',         val: loading ? '—' : displayTips.length,             sub: 'disponibles' },
                { icon: '⏱️', label: 'Jeûne',            val: loading ? '—' : displayNut.fastingType || '—',  sub: 'protocole actif' },
              ].map((k, i) => (
                <div key={k.label} style={{ padding: '22px 20px', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ ...S.label, marginBottom: 7 }}>{k.icon} {k.label}</div>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,2.5vw,2.2rem)', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: '.58rem', color: '#9CA3AF', marginTop: 5 }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ══ MAIN CONTENT ══ */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px,4vw,56px) clamp(16px,4vw,48px) 80px', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity .5s ease .2s, transform .5s ease .2s' }}>

            {/* ══ SECTION — PROGRAMMES ══ */}
            <section id="prog-section" style={{ marginBottom: 64 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
                <div>
                  <span style={S.tag}>🏋️ Entraînement</span>
                  <h2 style={S.sectionTitle}>MES <span style={{ color: '#b22a27' }}>PROGRAMMES.</span></h2>
                </div>
                <button style={S.ghostBtn} onClick={() => router.push('/client')}>Voir tout →</button>
              </div>
              {loading ? <Spinner /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                  {displayPrograms.slice(0, 4).map((p: any, i: number) => {
                    const cfg = TYPE_CONFIG[p.type] || { icon: '📄', label: p.type || 'Programme', color: '#9CA3AF' };
                    const days = p.assignedAt ? daysSince(p.assignedAt) : (p.days || 0);
                    const prog = p.progress || 0;
                    return (
                      <div key={p.id} onClick={() => router.push('/client')}
                        style={{ position: 'relative', background: '#1c1b1b', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'background .2s', minHeight: 175 }}
                      >
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom, ${cfg.color}, transparent)` }} />
                        <div style={{ padding: '20px 20px 16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ fontSize: '1.7rem' }}>{cfg.icon}</div>
                            <span style={{ ...S.badge, background: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(.9rem,2vw,1.05rem)', letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 10, color: '#e5e2e1' }}>{p.title}</div>
                          <div style={{ ...S.label, marginBottom: 7 }}>{days === 0 ? "Assigné aujourd'hui" : `Démarré il y a ${days}j`}{p.coachName ? ` · ${p.coachName}` : ''}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.4s ease' }} />
                            </div>
                            <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', color: prog > 0 ? '#b22a27' : '#6B7280', flexShrink: 0 }}>
                              {prog > 0 ? `${prog}%` : 'À démarrer'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ══ SECTION — JEÛNE & NUTRITION ══ */}
            <section style={{ marginBottom: 64 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
                <div>
                  <span style={S.tag}>📊 Nutrition & Jeûne</span>
                  <h2 style={S.sectionTitle}>MA <span style={{ color: '#b22a27' }}>NUTRITION.</span></h2>
                </div>
                {coachName && <span style={{ fontSize: '.68rem', color: '#9CA3AF' }}>Par <strong style={{ color: '#b22a27' }}>{coachName}</strong></span>}
              </div>

              {loading ? <Spinner /> : (
                <>
                  {/* Fasting + deficit row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="nut-top-grid">

                    {/* Fasting widget */}
                    <div style={{ background: '#1c1b1b', borderRadius: 12, padding: '20px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '2.6rem', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, flexShrink: 0 }}>
                        {displayNut.fastingType || '—'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 5, color: '#e5e2e1' }}>
                          Jeûne Intermittent {displayNut.fastingType}
                        </div>
                        <p style={{ fontSize: '.74rem', color: '#9CA3AF', marginBottom: 10 }}>
                          Fenêtre alimentaire : <strong style={{ color: '#e3beb8' }}>{displayNut.windowStart} – {displayNut.windowEnd}</strong>
                          {fastStatus?.inWindow
                            ? <span style={{ marginLeft: 10, color: '#16a34a' }}>✓ Fenêtre ouverte</span>
                            : <span style={{ marginLeft: 10, color: '#9CA3AF' }}>Hors fenêtre</span>
                          }
                        </p>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: fastStatus ? `${fastStatus.pct}%` : '0%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    </div>

                    {/* Deficit banner */}
                    <div style={{ background: deficit > 0 ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)', borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={S.label}>{deficit > 0 ? 'Déficit calorique' : 'Surplus calorique'}</div>
                      <div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, letterSpacing: '-.04em', color: defColor, lineHeight: 1, marginBottom: 5, marginTop: 8 }}>{defLabel}</div>
                        <div style={{ fontSize: '.68rem', color: '#9CA3AF', marginBottom: 14 }}>
                          Maintenance {(displayNut.maintenanceCalories || 2500).toLocaleString('fr-FR')} → Objectif {(displayNut.calories || 2000).toLocaleString('fr-FR')} kcal/j
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-.04em', color: defColor }}>{deficit > 0 ? '−' : '+'}{Math.abs(parseFloat(weeklyKg))} kg</span>
                          <span style={{ fontSize: '.62rem', color: '#9CA3AF', marginBottom: 4 }}>/ semaine estimé</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Macro cards */}
                  <div className="macro-grid" style={{ marginBottom: 14 }}>
                    {[
                      { icon: '🔥', label: 'Objectif calorique', val: displayNut.calories?.toLocaleString('fr-FR'), unit: 'kcal/j', pct: 100 },
                      { icon: '🥩', label: 'Protéines', val: displayNut.protein, unit: 'g', pct: Math.round(((displayNut.protein || 0) * 4 / (displayNut.calories || 2000)) * 100) },
                      { icon: '🌾', label: 'Glucides',  val: displayNut.carbs,   unit: 'g', pct: Math.round(((displayNut.carbs || 0) * 4 / (displayNut.calories || 2000)) * 100) },
                      { icon: '🥑', label: 'Lipides',   val: displayNut.fat,     unit: 'g', pct: Math.round(((displayNut.fat || 0) * 9 / (displayNut.calories || 2000)) * 100) },
                    ].map(m => (
                      <div key={m.label} style={{ background: '#1c1b1b', borderRadius: 8, padding: '16px' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: 7 }}>{m.icon}</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.45rem', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1 }}>{m.val}</div>
                        <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2, marginBottom: 8 }}>{m.unit} · {m.label}</div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(m.pct, 100)}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10 }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coach note */}
                  {displayNut.notes && (
                    <div style={{ background: '#1c1b1b', borderRadius: 8, padding: '14px 18px', fontSize: '.8rem', color: '#9CA3AF', borderLeft: '3px solid rgba(178,42,39,0.4)' }}>
                      📝 <strong style={{ color: '#e5e2e1' }}>Note de {coachName || 'votre coach'} :</strong> {displayNut.notes}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ══ SECTION — REPAS ══ */}
            <section style={{ marginBottom: 64 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
                <div>
                  <span style={S.tag}>🍽️ Plan alimentaire</span>
                  <h2 style={S.sectionTitle}>MES <span style={{ color: '#b22a27' }}>REPAS.</span></h2>
                </div>
                {coachName && <span style={{ fontSize: '.68rem', color: '#9CA3AF' }}>Par <strong style={{ color: '#b22a27' }}>{coachName}</strong></span>}
              </div>
              {loading ? <Spinner /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {displayMeals.map((m: any, i: number) => (
                    <div key={m.id} style={{ background: '#1c1b1b', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: '1.6rem', flexShrink: 0, width: 44, height: 44, background: '#2a2a2a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.emoji || '🍽️'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>{m.name}</div>
                        {m.description && <div style={{ fontSize: '.7rem', color: '#9CA3AF', marginBottom: 6, lineHeight: 1.5 }}>{m.description}</div>}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {m.calories && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🔥 <strong>{m.calories}</strong> kcal</span>}
                          {m.protein  && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🥩 <strong>{m.protein}g</strong> prot</span>}
                          {m.carbs    && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🌾 <strong>{m.carbs}g</strong> gluc</span>}
                          {m.fat      && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🥑 <strong>{m.fat}g</strong> lip</span>}
                        </div>
                      </div>
                      {m.time && (
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', color: '#b22a27', flexShrink: 0, background: 'rgba(178,42,39,0.1)', borderRadius: 6, padding: '5px 10px' }}>
                          {m.time}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ══ SECTION — CONSEILS DU COACH ══ */}
            <section style={{ marginBottom: 64 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
                <div>
                  <span style={S.tag}>💡 Lifestyle & Mindset</span>
                  <h2 style={S.sectionTitle}>CONSEILS DU <span style={{ color: '#b22a27' }}>COACH.</span></h2>
                </div>
              </div>
              {loading ? <Spinner /> : (
                <>
                  {/* Featured tip */}
                  {displayTips.length > 0 && (
                    <div style={{ background: 'linear-gradient(135deg,rgba(137,7,14,0.12),rgba(20,18,18,0.95))', borderRadius: 12, padding: '24px', marginBottom: 18, borderLeft: '3px solid #b22a27' }}>
                      <div style={{ fontSize: '2.5rem', color: 'rgba(178,42,39,0.35)', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 6 }}>"</div>
                      <div style={{ ...S.label, color: '#b22a27', marginBottom: 10 }}>
                        {CAT_ICON[displayTips[0]?.category] || '💡'} {TIP_CAT_LABEL[displayTips[0]?.category] || displayTips[0]?.category} — Conseil du moment
                      </div>
                      <p style={{ fontSize: '.92rem', color: '#e5e2e1', lineHeight: 1.8, marginBottom: 12 }}>{displayTips[0]?.content}</p>
                      <div style={{ fontSize: '.7rem', color: '#9CA3AF' }}>— {displayTips[0]?.title} · <span style={{ color: '#b22a27' }}>{coachName || 'Votre coach'}</span></div>
                    </div>
                  )}

                  {/* Tips grid */}
                  {displayTips.length > 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                      {displayTips.slice(1).map((t: any, i: number) => (
                        <div key={t.id} style={{ background: '#1c1b1b', borderRadius: 10, padding: '18px' }}>
                          <div style={{ fontSize: '1.4rem', marginBottom: 9 }}>{CAT_ICON[t.category] || '💡'}</div>
                          <h4 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 7, color: '#e5e2e1' }}>{t.title}</h4>
                          <p style={{ fontSize: '.76rem', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 10 }}>{t.content}</p>
                          <span style={S.badge}>{TIP_CAT_LABEL[t.category] || t.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ══ SECTION — ANALYSES ══ */}
            <section style={{ marginBottom: 64 }}>
              <div style={{ marginBottom: 26 }}>
                <span style={S.tag}>📈 Progression</span>
                <h2 style={S.sectionTitle}>MES <span style={{ color: '#b22a27' }}>ANALYSES.</span></h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12, marginBottom: 18 }}>
                {[
                  { label: 'Programmes assignés',  val: loading ? '—' : displayPrograms.length,  sub: 'total' },
                  { label: 'Jours de suivi',        val: loading ? '—' : `${displayPrograms[0] ? daysSince(displayPrograms[displayPrograms.length-1]?.assignedAt) : 18}j`, sub: 'depuis le début' },
                  { label: 'Repas assignés',        val: loading ? '—' : displayMeals.length,     sub: 'par votre coach' },
                  { label: 'Conseils reçus',        val: loading ? '—' : displayTips.length,      sub: 'publications' },
                  { label: 'Objectif calorique',    val: loading ? '—' : `${displayNut.calories} kcal`, sub: 'par jour' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#1c1b1b', borderRadius: 8, padding: '16px' }}>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,2rem)', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, marginBottom: 5 }}>{s.val}</div>
                    <div style={S.label}>{s.label}</div>
                    <div style={{ fontSize: '.58rem', color: '#9CA3AF', marginTop: 3, opacity: .7 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 16px', fontSize: '.73rem', color: '#9CA3AF', textAlign: 'center', borderLeft: '2px solid rgba(178,42,39,0.3)' }}>
                <span style={{ color: '#b22a27' }}>📈 Prochainement :</span> Graphiques de progression, suivi du poids, taux d&apos;adhérence, historique des séances.
              </div>
            </section>

            {/* ══ CTA ══ */}
            <div style={{ background: 'linear-gradient(135deg,#89070e 0%,#0e0e0e 100%)', borderRadius: 16, padding: 'clamp(30px,5vw,52px)', textAlign: 'center' }}>
              <span style={{ ...S.tag, color: '#e3beb8', display: 'inline-block', marginBottom: 16 }}>📂 Espace personnel</span>
              <h2 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.6rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .92, marginBottom: 16, color: '#e5e2e1' }}>
                TOUS VOS PROGRAMMES<br />EN UN SEUL ENDROIT.
              </h2>
              <p style={{ fontSize: 'clamp(.82rem,1.4vw,.94rem)', color: 'rgba(227,190,184,.8)', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.8 }}>
                Accédez à votre espace personnel pour consulter, filtrer et gérer l&apos;ensemble de vos programmes et ressources.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={{ background: 'rgba(229,226,225,0.14)', backdropFilter: 'blur(10px)', border: '1px solid rgba(229,226,225,0.2)', borderRadius: 6, padding: '14px 36px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#e5e2e1', cursor: 'pointer' }} onClick={() => router.push('/client')}>
                  📂 Voir mes programmes →
                </button>
                <button style={{ background: 'transparent', border: '1px solid rgba(229,226,225,0.12)', borderRadius: 6, padding: '14px 24px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(229,226,225,0.45)', cursor: 'pointer' }} onClick={handleSignOut}>
                  Déconnexion
                </button>
              </div>
            </div>

          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
          .sf-page-root, .sf-page-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
          .sf-page-root h1, .sf-page-root h2, .sf-page-root h3 { font-family: 'Lexend', sans-serif !important; font-weight: 900 !important; letter-spacing: -.04em !important; line-height: .95 !important; color: #e5e2e1; margin: 0; }
          .sf-page-root h4 { font-family: 'Lexend', sans-serif !important; font-weight: 800 !important; letter-spacing: -.02em !important; margin: 0; color: #e5e2e1; }
          .sf-page-root p { font-family: 'Inter', sans-serif !important; color: #9CA3AF; line-height: 1.7; margin: 0; }
          .macro-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
          .kpi-row { grid-template-columns: repeat(5,1fr) !important; }
          .nut-top-grid { grid-template-columns: 1fr 1fr !important; }
          @keyframes spin { to { transform:rotate(360deg); } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
          @media(max-width:960px) {
            .kpi-row { grid-template-columns: repeat(3,1fr) !important; }
            .nut-top-grid { grid-template-columns: 1fr !important; }
          }
          @media(max-width:600px) {
            .macro-grid { grid-template-columns: 1fr 1fr !important; }
            .kpi-row { grid-template-columns: 1fr 1fr !important; }
          }
          .sf-page-root ::-webkit-scrollbar { width:4px; height:4px; }
          .sf-page-root ::-webkit-scrollbar-track { background:transparent; }
          .sf-page-root ::-webkit-scrollbar-thumb { background:rgba(178,42,39,0.35); border-radius:10px; }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
