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
import CalorieCalculator from '@/components/CalorieCalculator';
import Sidebar from '@/components/Sidebar';

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

const CHART_BARS = [
  { label: 'Lun', h: 55, deficit: -380 },
  { label: 'Mar', h: 70, deficit: -520 },
  { label: 'Mer', h: 45, deficit: -290 },
  { label: 'Jeu', h: 80, deficit: -610 },
  { label: 'Ven', h: 65, deficit: -450 },
  { label: 'Sam', h: 30, deficit: -180 },
  { label: 'Dim', h: 50, deficit: -320 },
];

const daysSince = (ts: Timestamp | null | undefined): number => {
  if (!ts) return 0;
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
};

const NAV_ITEMS = [
  { key: 'overview',     icon: '🏠', label: 'Tableau de bord' },
  { key: 'programmes',   icon: '📋', label: 'Mes Programmes' },
  { key: 'nutrition',    icon: '🥗', label: 'Ma Nutrition' },
  { key: 'statistiques', icon: '📈', label: 'Mes Statistiques' },
] as const;

type NavKey = typeof NAV_ITEMS[number]['key'];

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
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [activeTab, setActiveTab]     = useState<NavKey>('overview');
  const [statPeriod, setStatPeriod]   = useState('30J');

  /* Computed: real data or mock fallback */
  const displayPrograms = assignments.length > 0 ? assignments : MOCK_PROGRAMS;
  const displayNut      = nutritionPlan || MOCK_NUTRITION;
  const displayMeals    = clientMeals.length > 0 ? clientMeals : MOCK_MEALS;
  const displayTips     = tips.length > 0 ? tips : MOCK_TIPS;

  /* Deficit */
  const deficit  = (displayNut.maintenanceCalories || 2500) - (displayNut.calories || 2000);
  const defColor = deficit > 0 ? '#b22a27' : deficit < 0 ? '#f87171' : '#9CA3AF';
  const defLabel = deficit > 0 ? `−${deficit} KCAL` : deficit < 0 ? `+${Math.abs(deficit)} KCAL` : 'ÉQUILIBRE';

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
    const totalFastMins = 1440 - (endMin - startMin);
    const elapsedFastMins = inWindow ? 0 : nowMin < startMin ? (1440 - endMin + nowMin) : (nowMin - endMin);
    const elapsedH = Math.floor(elapsedFastMins / 60);
    const elapsedM = elapsedFastMins % 60;
    const fastPct = Math.min(100, Math.round((elapsedFastMins / totalFastMins) * 100));
    return { inWindow, pct, elapsedH, elapsedM, fastPct, totalFastMins, elapsedFastMins };
  };
  const fastStatus = getFastingStatus();

  /* SVG circle */
  const CIRCLE_R = 70;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R; // ≈ 439.8
  const fastPctVal = fastStatus?.fastPct ?? 0;
  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * fastPctVal) / 100;

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

  const navTo = (key: string) => { setActiveTab(key as NavKey); };

  const firstName = userName.split(' ')[0] || userName;

  /* ─────────────────────────────────────────────────────── */
  return (
    <ProtectedRoute role="client">
      <Toast />
      <div className="cl-root">

        <Sidebar role="client" activeTab={activeTab} onNavTo={navTo} onSignOut={handleSignOut} />

        {/* ══ MAIN ══ */}
        <main className="cl-main" style={{ opacity: mounted ? 1 : 0, transition: 'opacity .4s ease' }}>

          <div className="cl-content">

            {/* ══ OVERVIEW TAB ══ */}
            {activeTab === 'overview' && (
              <>
                {/* HERO */}
                <section className="cl-hero">
                  <div className="cl-hero-overlay" />
                  <div className="cl-hero-content">
                    <div className="cl-hero-badge">TABLEAU DE BORD</div>
                    <h1 className="cl-hero-title">
                      BONJOUR, <span style={{ color: '#b22a27' }}>{firstName.toUpperCase()}.</span><br />
                      CONTINUEZ À PROGRESSER.
                    </h1>
                    <p className="cl-hero-quote">
                      <em>« Le succès, c'est la somme de petits efforts répétés jour après jour. »</em>
                    </p>
                  </div>
                </section>

                {/* ROW 1 — Bilan énergétique + Séance du jour */}
                <div className="cl-row2">

                  {/* Bilan énergétique */}
                  <div className="cl-card cl-energy-card">
                    <div className="cl-card-head">
                      <div>
                        <div className="cl-card-label">BILAN ÉNERGÉTIQUE</div>
                        <div className="cl-card-sub">7 derniers jours</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.8rem)', color: '#b22a27', letterSpacing: '-.04em', lineHeight: 1 }}>
                          {defLabel}
                        </div>
                        <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'Inter, sans-serif', letterSpacing: '.08em' }}>
                          AUJOURD'HUI
                        </div>
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div className="cl-chart">
                      {CHART_BARS.map((bar, i) => {
                        const isToday = i === 4; // Ven = today mock
                        return (
                          <div key={bar.label} className="cl-chart-col">
                            <div className="cl-chart-bar-wrap">
                              <div
                                className="cl-chart-bar"
                                style={{
                                  height: `${bar.h}%`,
                                  background: isToday
                                    ? 'linear-gradient(to top, #89070e, #b22a27)'
                                    : 'rgba(178,42,39,0.22)',
                                  ['--target-h' as any]: `${bar.h}%`,
                                }}
                              />
                            </div>
                            <div className={`cl-chart-label${isToday ? ' today' : ''}`}>{bar.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Séance du jour */}
                  <div className="cl-card cl-seance-card">
                    <div className="cl-seance-bg" />
                    <div className="cl-seance-overlay" />
                    <div className="cl-seance-content">
                      <div className="cl-seance-badge">HAUTE INTENSITÉ</div>
                      <div>
                        <div className="cl-card-label" style={{ marginBottom: 6 }}>SÉANCE DU JOUR</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', color: '#e5e2e1', letterSpacing: '-.03em', lineHeight: 1.2 }}>
                          {displayPrograms[0]?.title || 'Force & Hypertrophie'}
                        </div>
                        <div style={{ fontSize: '.65rem', color: '#9CA3AF', marginTop: 8, fontFamily: 'Inter, sans-serif', letterSpacing: '.1em' }}>
                          45 MIN · 420 KCAL
                        </div>
                      </div>
                      <button className="cl-seance-btn">DÉMARRER MA SÉANCE ▶</button>
                    </div>
                  </div>
                </div>

                {/* ROW 2 — Protocole de jeûne + Nutrition du jour */}
                <div className="cl-row2">

                  {/* Protocole de jeûne */}
                  <div className="cl-card cl-fasting-card">
                    <div className="cl-card-label" style={{ marginBottom: 20 }}>PROTOCOLE DE JEÛNE</div>
                    <div className="cl-fasting-circle-wrap">
                      <svg width="160" height="160" viewBox="0 0 160 160">
                        {/* Background track */}
                        <circle
                          cx="80" cy="80" r={CIRCLE_R}
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="8"
                        />
                        {/* Progress arc */}
                        <circle
                          cx="80" cy="80" r={CIRCLE_R}
                          fill="none"
                          stroke="url(#fastGrad)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 80 80)"
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                        <defs>
                          <linearGradient id="fastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#89070e" />
                            <stop offset="100%" stopColor="#b22a27" />
                          </linearGradient>
                        </defs>
                        {/* Center text */}
                        <text x="80" y="72" textAnchor="middle" fill="#e5e2e1" fontFamily="Lexend, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-1">
                          {fastStatus ? `${fastStatus.elapsedH}:${String(fastStatus.elapsedM).padStart(2, '0')}` : '16:00'}
                        </text>
                        <text x="80" y="92" textAnchor="middle" fill="#9CA3AF" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="2">
                          ÉCOULÉ
                        </text>
                        <text x="80" y="108" textAnchor="middle" fill="#b22a27" fontFamily="Lexend, sans-serif" fontWeight="700" fontSize="10" letterSpacing="1">
                          {fastStatus?.inWindow ? 'FENÊTRE' : 'EN JEÛNE'}
                        </text>
                      </svg>
                    </div>
                    <div className="cl-fasting-info">
                      <div className="cl-fasting-row">
                        <span className="cl-card-label">Protocole</span>
                        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#b22a27' }}>{displayNut.fastingType || '16/8'}</span>
                      </div>
                      <div className="cl-fasting-row">
                        <span className="cl-card-label">Fenêtre alimentaire</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#e5e2e1' }}>{displayNut.windowStart} – {displayNut.windowEnd}</span>
                      </div>
                      <div className="cl-fasting-row">
                        <span className="cl-card-label">État actuel</span>
                        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: fastStatus?.inWindow ? '#16a34a' : '#b22a27', letterSpacing: '.06em' }}>
                          {fastStatus?.inWindow ? '● FENÊTRE OUVERTE' : '● EN COURS DE JEÛNE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ma Nutrition du Jour */}
                  <div className="cl-card cl-nut-card">
                    <div className="cl-card-head" style={{ marginBottom: 20 }}>
                      <div>
                        <div className="cl-card-label">MA NUTRITION DU JOUR</div>
                        <div className="cl-card-sub">Objectif : {displayNut.calories?.toLocaleString('fr-FR')} kcal</div>
                      </div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#b22a27' }}>
                        {Math.round((displayNut.calories || 2000) * 0.72).toLocaleString('fr-FR')}
                        <span style={{ fontSize: '.55rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginLeft: 4 }}>kcal</span>
                      </div>
                    </div>

                    {/* Macro bars */}
                    {[
                      { label: 'Protéines', current: Math.round((displayNut.protein || 150) * 0.8), target: displayNut.protein || 150, unit: 'g', color: '#b22a27' },
                      { label: 'Glucides',  current: Math.round((displayNut.carbs   || 200) * 0.66), target: displayNut.carbs   || 200, unit: 'g', color: '#89070e' },
                      { label: 'Lipides',   current: Math.round((displayNut.fat     || 65)  * 0.65), target: displayNut.fat     || 65,  unit: 'g', color: '#5c0509' },
                    ].map(m => (
                      <div key={m.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>{m.label}</span>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', color: '#b22a27' }}>
                            {m.current}{m.unit} / {m.target}{m.unit}
                          </span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{
                            height: 5,
                            width: `${Math.min(100, Math.round((m.current / m.target) * 100))}%`,
                            background: `linear-gradient(to right, ${m.color}, #b22a27)`,
                            borderRadius: 9999,
                            transition: 'width 1s ease',
                          }} />
                        </div>
                      </div>
                    ))}

                    {/* Repas */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {displayMeals.slice(0, 2).map(meal => (
                        <div key={meal.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                            {meal.emoji || '🍽️'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', color: '#e5e2e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</div>
                            <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{meal.time} · {meal.calories} kcal</div>
                          </div>
                          <div style={{ fontSize: '.6rem', color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 700, flexShrink: 0 }}>+{meal.protein}g P</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ROW 3 — 3 blocks bas */}
                <div className="cl-row3">

                  {/* Progression du poids */}
                  <div className="cl-card cl-weight-card">
                    <div className="cl-card-label" style={{ marginBottom: 12 }}>PROGRESSION DU POIDS</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.6rem)', color: '#e5e2e1', letterSpacing: '-.06em', lineHeight: 1 }}>78.4</div>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '.7rem', color: '#9CA3AF', lineHeight: 1 }}>kg</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.65rem', color: '#b22a27', letterSpacing: '.04em', marginTop: 3 }}>−0.6 cette semaine</div>
                      </div>
                    </div>
                    <div className="cl-weight-trend">
                      {[62, 55, 70, 48, 65, 58, 72].map((h, i) => (
                        <div key={i} className="cl-weight-bar" style={{ height: `${h}%`, background: i === 6 ? '#b22a27' : 'rgba(178,42,39,0.2)' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', letterSpacing: '.06em', marginTop: 10 }}>
                      OBJECTIF : 75.0 KG · {Math.round(((78.4 - 75) / 0.6))} SEMAINES RESTANTES
                    </div>
                  </div>

                  {/* Points d'activité */}
                  <div className="cl-card cl-activity-card">
                    <div className="cl-card-label" style={{ marginBottom: 12 }}>POINTS D'ACTIVITÉ</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.6rem)', color: '#b22a27', letterSpacing: '-.06em', lineHeight: 1 }}>1 840</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.6rem', color: '#9CA3AF', marginBottom: 6 }}>pts ce mois</div>
                    </div>
                    <div style={{ marginTop: 16, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>Objectif mensuel</span>
                        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: '#b22a27' }}>74%</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: 5, width: '74%', background: 'linear-gradient(to right, #89070e, #b22a27)', borderRadius: 9999 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                      +240 pts cette semaine · Objectif : 2 500 pts
                    </div>
                  </div>

                  {/* Habitudes Élite */}
                  <div className="cl-card cl-habits-card">
                    <div className="cl-card-label" style={{ marginBottom: 16 }}>HABITUDES ÉLITE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {displayTips.slice(0, 2).map((tip: any) => (
                        <div key={tip.id} style={{ background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: '1rem' }}>{CAT_ICON[tip.category] || '💡'}</span>
                            <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', color: '#e5e2e1', letterSpacing: '.02em' }}>{tip.title}</span>
                          </div>
                          <p style={{ fontSize: '.65rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.55, margin: 0 }}>
                            {tip.content.length > 100 ? tip.content.slice(0, 100) + '…' : tip.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ══ CALCULATEUR CALORIQUE ══ */}
                <div className="cl-card" style={{ marginTop: 24 }}>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 10 }}>⚡ Outil personnel</div>
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,2rem)', letterSpacing: '-.05em', color: '#e5e2e1', margin: '0 0 8px' }}>
                      MON CALCULATEUR <span style={{ color: '#b22a27' }}>CALORIQUE.</span>
                    </h2>
                    <p style={{ fontSize: '.78rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                      Calculez vos besoins caloriques selon votre profil.
                    </p>
                  </div>
                  <CalorieCalculator mode="membre" />
                  <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, fontSize: '.72rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                    💡 Votre coach peut ajuster ces valeurs dans votre plan nutritionnel.
                  </div>
                </div>
              </>
            )}

            {/* ══ PROGRAMMES TAB ══ */}
            {activeTab === 'programmes' && (
              <div>
                <div className="cl-page-header">
                  <h2 className="cl-page-title">MES PROGRAMMES</h2>
                  <p className="cl-page-sub">Programmes assignés par votre coach</p>
                </div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div className="cl-spinner" />
                    <p style={{ fontSize: '.73rem', color: '#9CA3AF', marginTop: 12 }}>Chargement…</p>
                  </div>
                ) : (
                  <div className="cl-prog-grid">
                    {displayPrograms.map((prog: any) => {
                      const cfg = TYPE_CONFIG[prog.type] || TYPE_CONFIG.sport;
                      const days = daysSince(prog.assignedAt);
                      return (
                        <div key={prog.id} className="cl-prog-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div style={{ fontSize: '1.5rem' }}>{cfg.icon}</div>
                            <span style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: cfg.color, background: `${cfg.color}18`, padding: '3px 8px', borderRadius: 4, border: `1px solid ${cfg.color}30` }}>
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: 'clamp(.85rem,2vw,1rem)', color: '#e5e2e1', letterSpacing: '-.02em', marginBottom: 6 }}>{prog.title}</div>
                          <div style={{ fontSize: '.62rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
                            {prog.coachName || 'Votre coach'} · Commencé il y a {days} jours
                          </div>
                          {typeof prog.progress === 'number' && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>Progression</span>
                                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: '#b22a27' }}>{prog.progress}%</span>
                              </div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999 }}>
                                <div style={{ height: 4, width: `${prog.progress}%`, background: 'linear-gradient(to right, #89070e, #b22a27)', borderRadius: 9999 }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ NUTRITION TAB ══ */}
            {activeTab === 'nutrition' && (
              <div>
                <div className="cl-page-header">
                  <h2 className="cl-page-title">MA NUTRITION</h2>
                  <p className="cl-page-sub">Plan nutritionnel et repas du jour</p>
                </div>

                {/* Calculateur */}
                <div className="cl-card" style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 10 }}>⚡ Outil personnel</div>
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.2rem,3vw,1.6rem)', letterSpacing: '-.05em', color: '#e5e2e1', margin: '0 0 8px' }}>
                      MON CALCULATEUR <span style={{ color: '#b22a27' }}>CALORIQUE.</span>
                    </h2>
                    <p style={{ fontSize: '.75rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', margin: 0 }}>Calculez vos besoins caloriques selon votre profil.</p>
                  </div>
                  <CalorieCalculator mode="membre" />
                  <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, fontSize: '.72rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                    💡 Votre coach peut ajuster ces valeurs dans votre plan nutritionnel.
                  </div>
                </div>

                {/* Plan nutrition */}
                <div className="cl-card" style={{ marginBottom: 24 }}>
                  <div className="cl-card-label" style={{ marginBottom: 20 }}>MON PLAN NUTRITIONNEL</div>
                  <div className="cl-nut-stats">
                    {[
                      { label: 'Calories cible', val: displayNut.calories, unit: 'kcal' },
                      { label: 'Protéines', val: displayNut.protein, unit: 'g' },
                      { label: 'Glucides', val: displayNut.carbs, unit: 'g' },
                      { label: 'Lipides', val: displayNut.fat, unit: 'g' },
                    ].map(s => (
                      <div key={s.label} className="cl-nut-stat">
                        <div style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#b22a27', letterSpacing: '-.04em' }}>{s.val}</div>
                        <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{s.unit}</div>
                      </div>
                    ))}
                  </div>
                  {displayNut.notes && (
                    <div style={{ background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, padding: '14px 16px', marginTop: 20 }}>
                      <div style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 8 }}>NOTES DU COACH</div>
                      <p style={{ fontSize: '.75rem', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, margin: 0 }}>{displayNut.notes}</p>
                    </div>
                  )}
                </div>

                {/* Repas */}
                <div className="cl-card">
                  <div className="cl-card-label" style={{ marginBottom: 20 }}>MES REPAS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {displayMeals.map((meal: any) => (
                      <div key={meal.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                          {meal.emoji || '🍽️'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.85rem', color: '#e5e2e1' }}>{meal.name}</div>
                          <div style={{ fontSize: '.62rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginTop: 3 }}>{meal.time} · {meal.description}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.82rem', color: '#b22a27' }}>{meal.calories} kcal</div>
                          <div style={{ fontSize: '.58rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>P {meal.protein}g · G {meal.carbs}g · L {meal.fat}g</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ STATISTIQUES TAB ══ */}
            {activeTab === 'statistiques' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowX: 'hidden' }}>

                {/* ── 1. HERO BANNER ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(229,226,225,0.4)', marginBottom: 8 }}>STATISTIQUES DÉTAILLÉES</div>
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,6vw,3rem)', letterSpacing: '-.05em', lineHeight: .92, color: '#e5e2e1', margin: '0 0 6px' }}>MES STATISTIQUES.</h2>
                    <p style={{ fontSize: '.78rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', margin: 0 }}>Votre progression globale ce mois</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['7J', '30J', '3M', '1AN'].map(p => (
                      <button
                        key={p}
                        onClick={() => setStatPeriod(p)}
                        style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.08em', transition: 'all .15s', background: statPeriod === p ? '#b22a27' : 'rgba(255,255,255,0.06)', color: statPeriod === p ? '#fff' : '#6B7280' }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── 2. ROW KPI ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  <style>{`.st-kpi-grid { display: grid; grid-template-columns: 1fr; gap: 14px; } @media(min-width:640px){ .st-kpi-grid { grid-template-columns: 1fr 1fr; } } @media(min-width:900px){ .st-kpi-grid { grid-template-columns: 2fr 1fr 1fr; } }`}</style>
                  <div className="st-kpi-grid">
                    {/* Card 1 — Performance */}
                    <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27' }}>PERFORMANCE ATTEINTE</div>
                      <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: 'clamp(1rem,2.5vw,1.3rem)', color: '#e5e2e1', lineHeight: 1.25, margin: 0 }}>
                        Votre capacité a progressé de <span style={{ color: '#b22a27' }}>14.2%</span> ce mois.
                      </p>
                      <div style={{ padding: '10px 14px', background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.15)', borderRadius: 8, fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                        💡 <em>Conseil IA : Vos fenêtres de récupération se raccourcissent. Augmentez l'intensité lors de votre prochain cycle.</em>
                      </div>
                    </div>
                    {/* Card 2 — Record */}
                    <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏆</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.4rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>245 <span style={{ fontSize: '.7em', color: '#9CA3AF', fontWeight: 700 }}>kg</span></div>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b22a27' }}>RECORD PERSONNEL</div>
                    </div>
                    {/* Card 3 — Streak */}
                    <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔥</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.4rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>18</div>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b22a27' }}>JOURS CONSÉCUTIFS</div>
                    </div>
                  </div>
                </div>

                {/* ── 3+4. GRAPHIQUE + COMPOSITION ── */}
                <style>{`.st-chart-grid { display: grid; grid-template-columns: 1fr; gap: 14px; } @media(min-width:768px){ .st-chart-grid { grid-template-columns: 1fr 300px; } }`}</style>
                <div className="st-chart-grid">

                  {/* Graphique barres */}
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>PROGRESSION FORCE</div>
                      <div style={{ display: 'flex', gap: 14 }}>
                        {[{ label: 'SQUAT', color: '#b22a27' }, { label: 'SOULEVÉ DE TERRE', color: '#3a3939' }].map(l => (
                          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.1em', color: '#6B7280' }}>{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Bars */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
                      {[
                        { label: 'SEMAINE 01', squat: 60, sdt: 45 },
                        { label: 'SEMAINE 02', squat: 72, sdt: 55 },
                        { label: 'SEMAINE 03', squat: 65, sdt: 70 },
                        { label: 'SEMAINE 04', squat: 90, sdt: 80 },
                      ].map(w => (
                        <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 100 }}>
                            <div style={{ flex: 1, background: '#b22a27', borderRadius: '3px 3px 0 0', height: `${w.squat}%`, transition: 'height 1s ease' }} />
                            <div style={{ flex: 1, background: '#3a3939', borderRadius: '3px 3px 0 0', height: `${w.sdt}%`, transition: 'height 1s ease' }} />
                          </div>
                          <div style={{ fontSize: '.48rem', fontFamily: 'Lexend, sans-serif', fontWeight: 600, letterSpacing: '.06em', color: '#6B7280', textAlign: 'center', whiteSpace: 'nowrap' }}>{w.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Composition corporelle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px', flex: 1 }}>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 18 }}>COMPOSITION CORPORELLE</div>
                      {[
                        { label: 'Progression du poids', val: '-2.4kg', pct: 60 },
                        { label: 'Indice de masse grasse', val: '-1.8%', pct: 45 },
                      ].map(r => (
                        <div key={r.label} style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>{r.label}</span>
                            <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>{r.val}</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${r.pct}%`, background: 'linear-gradient(90deg, #89070e, #b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Volume total */}
                    <div style={{ background: 'linear-gradient(135deg, #89070e, #b22a27)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: -20, right: -10, fontSize: '5rem', opacity: .08, lineHeight: 1 }}>🏋️</div>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8, position: 'relative' }}>VOLUME TOTAL</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.8rem)', color: '#fff', letterSpacing: '-.04em', lineHeight: 1, position: 'relative' }}>124 500 lbs</div>
                      <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.8)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                        <span>↑</span> +8% vs mois dernier
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 5. FLUX D'ACTIVITÉ (heatmap) ── */}
                <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px', overflowX: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>FLUX D'ACTIVITÉ</div>
                    <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6B7280' }}>12 DERNIERS MOIS</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(26, 1fr)', gridTemplateRows: 'repeat(7, 1fr)', gap: 3, width: '100%' }}>
                    {Array.from({ length: 182 }, (_, i) => {
                      const seed = (i * 37 + 13) % 100;
                      const intensity = seed < 30 ? 0 : seed < 50 ? 0.2 : seed < 70 ? 0.45 : seed < 88 ? 0.7 : 1;
                      return (
                        <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: intensity === 0 ? 'rgba(255,255,255,0.04)' : `rgba(178,42,39,${intensity})` }} />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>MOINS</span>
                    {[0.1, 0.3, 0.55, 0.8, 1].map((v, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(178,42,39,${v})` }} />
                    ))}
                    <span style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>PLUS</span>
                  </div>
                </div>

                {/* ── 6. CITATION FINALE ── */}
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=70"
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.22) grayscale(0.3)' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(137,7,14,0.6) 0%, rgba(10,10,10,0.85) 100%)' }} />
                  <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(28px,6vw,52px) clamp(20px,6vw,52px)' }}>
                    <div style={{ fontSize: '2.5rem', color: 'rgba(178,42,39,0.3)', fontFamily: 'Lexend, sans-serif', fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>"</div>
                    <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1rem,3.5vw,1.6rem)', letterSpacing: '-.03em', lineHeight: 1.2, color: '#fff', margin: '0 0 16px', fontStyle: 'italic' }}>
                      LA DISCIPLINE N'EST PAS UNE CONTRAINTE.<br />C'EST UNE LIBERTÉ.
                    </p>
                    <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                      SUNDARAFLOW | PERFORMANCE ÉLITE
                    </div>
                  </div>
                </div>

                {/* ── CONSEILS COACH ── */}
                {displayTips.length > 0 && (
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px' }}>
                    <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 18 }}>CONSEILS DE MON COACH</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {displayTips.map((tip: any) => (
                        <div key={tip.id} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                          <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{CAT_ICON[tip.category] || '💡'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', color: '#e5e2e1' }}>{tip.title}</span>
                              <span style={{ fontSize: '.52rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#b22a27', background: 'rgba(178,42,39,0.1)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>{TIP_CAT_LABEL[tip.category] || 'Conseil'}</span>
                            </div>
                            <p style={{ fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, margin: 0 }}>{tip.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </main>

      </div>

      {/* ══ STYLES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .cl-root {
          display: flex;
          flex-direction: row;
          min-height: 100vh;
          background: #131313;
          color: #e5e2e1;
          overflow-x: hidden;
        }
        @media (max-width: 767px) { .cl-root { flex-direction: column; } }

        /* ── Overlay (legacy, kept for safety) ── */
        .cl-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 49;
        }

        /* ── Main ── */
        .cl-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }
        @media (min-width: 768px) { .cl-main { margin-left: 240px; width: calc(100vw - 240px); } }
        @media (max-width: 767px) {
          .cl-main { margin-left: 0 !important; width: 100% !important; }
        }


        .cl-content {
          padding: 24px 20px 40px;
          max-width: 1100px;
          width: 100%;
        }
        @media (min-width: 769px) { .cl-content { padding: 32px 32px 60px; } }

        /* ── Hero ── */
        .cl-hero {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 24px;
          min-height: 220px;
          display: flex;
          align-items: flex-end;
          background: #2a2a2a;
        }
        .cl-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(137,7,14,0.82) 0%, rgba(19,19,19,0.7) 60%, rgba(19,19,19,0.95) 100%);
          z-index: 1;
        }
        .cl-hero-content {
          position: relative; z-index: 2;
          padding: clamp(20px,4vw,36px);
        }
        .cl-hero-badge {
          font-size: .55rem;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: rgba(229,226,225,0.5);
          margin-bottom: 12px;
        }
        .cl-hero-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: clamp(1.5rem, 4vw, 2.4rem);
          letter-spacing: -.05em;
          line-height: 1.05;
          color: #e5e2e1;
          margin: 0 0 14px;
        }
        .cl-hero-quote {
          font-family: 'Inter', sans-serif;
          font-size: clamp(.65rem, 1.5vw, .78rem);
          color: rgba(229,226,225,0.55);
          font-style: italic;
          margin: 0;
          max-width: 400px;
          line-height: 1.6;
        }

        /* ── 2-col rows ── */
        .cl-row2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (min-width: 700px) {
          .cl-row2 { grid-template-columns: 60fr 38fr; }
        }

        /* ── 3-col row ── */
        .cl-row3 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 700px) {
          .cl-row3 { grid-template-columns: repeat(3, 1fr); }
        }

        /* ── Cards ── */
        .cl-card {
          background: rgba(28,27,27,0.9);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 22px;
        }
        .cl-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .cl-card-label {
          font-size: .58rem;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #9CA3AF;
        }
        .cl-card-sub {
          font-size: .62rem;
          color: #6B7280;
          font-family: 'Inter', sans-serif;
          margin-top: 3px;
        }

        /* ── Energy chart ── */
        .cl-energy-card { display: flex; flex-direction: column; }
        .cl-chart {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 110px;
          flex: 1;
          margin-top: 12px;
        }
        .cl-chart-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          gap: 6px;
        }
        .cl-chart-bar-wrap {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .cl-chart-bar {
          width: 100%;
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          animation: barGrow .9s ease forwards;
          transform-origin: bottom;
        }
        @keyframes barGrow {
          from { height: 0 !important; }
          to { height: var(--target-h, 50%); }
        }
        .cl-chart-label {
          font-size: .52rem;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: #6B7280;
        }
        .cl-chart-label.today { color: #b22a27; }

        /* ── Seance card ── */
        .cl-seance-card {
          position: relative;
          overflow: hidden;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          padding: 0;
        }
        .cl-seance-bg {
          position: absolute; inset: 0;
          background: url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80') center/cover no-repeat;
        }
        .cl-seance-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(19,19,19,0.97) 0%, rgba(19,19,19,0.6) 50%, rgba(19,19,19,0.3) 100%);
        }
        .cl-seance-content {
          position: relative; z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          padding: 22px;
          gap: 16px;
        }
        .cl-seance-badge {
          align-self: flex-start;
          font-size: .5rem;
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #b22a27;
          background: rgba(178,42,39,0.12);
          border: 1px solid rgba(178,42,39,0.25);
          padding: 4px 10px;
          border-radius: 4px;
        }
        .cl-seance-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #89070e, #b22a27);
          border: none;
          border-radius: 8px;
          color: #e5e2e1;
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: .65rem;
          letter-spacing: .14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform .2s, box-shadow .2s;
        }
        .cl-seance-btn:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(178,42,39,0.4); }

        /* ── Fasting card ── */
        .cl-fasting-card { display: flex; flex-direction: column; }
        .cl-fasting-circle-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .cl-fasting-info { display: flex; flex-direction: column; gap: 10px; }
        .cl-fasting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cl-fasting-row:last-child { border-bottom: none; }

        /* ── Nutrition card ── */
        .cl-nut-card { display: flex; flex-direction: column; }

        /* ── Weight trend mini bars ── */
        .cl-weight-card { display: flex; flex-direction: column; }
        .cl-weight-trend {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 44px;
          margin-top: 16px;
        }
        .cl-weight-bar {
          flex: 1;
          border-radius: 3px 3px 0 0;
          min-height: 4px;
        }

        /* ── Activity card ── */
        .cl-activity-card {}

        /* ── Habits card ── */
        .cl-habits-card {}

        /* ── Page header ── */
        .cl-page-header { margin-bottom: 24px; }
        .cl-page-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: clamp(1.4rem, 3.5vw, 2rem);
          letter-spacing: -.05em;
          color: #e5e2e1;
          margin: 0 0 6px;
        }
        .cl-page-sub {
          font-size: .72rem;
          color: #9CA3AF;
          font-family: 'Inter', sans-serif;
          margin: 0;
        }

        /* ── Programmes grid ── */
        .cl-prog-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 600px) { .cl-prog-grid { grid-template-columns: repeat(2, 1fr); } }

        .cl-prog-card {
          background: rgba(28,27,27,0.9);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px;
          transition: border-color .2s, transform .2s, box-shadow .2s;
          cursor: pointer;
        }
        .cl-prog-card:hover {
          border-color: rgba(178,42,39,0.35);
          transform: scale(1.02);
          box-shadow: 0 0 24px rgba(178,42,39,0.12);
        }

        /* ── Nutrition stats ── */
        .cl-nut-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 600px) { .cl-nut-stats { grid-template-columns: repeat(4, 1fr); } }
        .cl-nut-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 14px;
          text-align: center;
        }

        /* ── Stats grid ── */
        .cl-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 600px) { .cl-stats-grid { grid-template-columns: repeat(4, 1fr); } }
        .cl-stat-card {
          background: rgba(28,27,27,0.9);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
        }

        /* ── Spinner ── */
        .cl-spinner {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.07);
          border-top-color: #b22a27;
          animation: spin .8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ProtectedRoute>
  );
}
