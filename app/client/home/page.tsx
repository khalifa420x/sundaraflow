'use client';

import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, collectionGroup, query, where, getDocs, onSnapshot,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  orderBy, limit, Timestamp, serverTimestamp,
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

const MUSCLE_PHOTO: Record<string, string> = {
  'pectoraux': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=50',
  'épaules':   'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=50',
  'triceps':   'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=50',
  'dos':       'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=400&q=50',
  'biceps':    'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=400&q=50',
  'dorsaux':   'https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?w=400&q=50',
  'quadriceps':'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=50',
  'fessiers':  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=50',
  'mollets':   'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=50',
  'abdominaux':'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=50',
  'core':      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=50',
};

function getMusclePhoto(muscle: string): string {
  const m = (muscle || '').toLowerCase();
  if (m.includes('fessier') || m.includes('quadricep') || m.includes('ischio') || m.includes('jambe'))
    return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=50';
  if (m.includes('pectoral') || m.includes('tricep') || m.includes('épaule') || m.includes('epaule'))
    return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=50';
  if (m.includes('dorsal') || m.includes('bicep') || m.includes('dos') || m.includes('rhombo'))
    return 'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=400&q=50';
  if (m.includes('abdo') || m.includes('oblique') || m.includes('core'))
    return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=50';
  return 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=50';
}

const formatReps = (reps: string) => {
  const num = parseInt(reps);
  if (!isNaN(num) && num >= 120 && reps.includes('s')) return `${Math.round(num / 60)} min`;
  return reps;
};

function getSessionPhoto(label: string, focus: string): string {
  const text = `${label} ${focus}`.toLowerCase();
  if (text.includes('cardio') || text.includes('hiit') || text.includes('endurance'))
    return 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=50';
  if (text.includes('push') || text.includes('pectoraux') || text.includes('épaules') || text.includes('triceps'))
    return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=50';
  if (text.includes('pull') || text.includes('dos') || text.includes('biceps') || text.includes('tirage'))
    return 'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=400&q=50';
  if (text.includes('leg') || text.includes('jambes') || text.includes('fessiers') || text.includes('cuisses'))
    return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=50';
  if (text.includes('core') || text.includes('abdo') || text.includes('gainage'))
    return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=50';
  return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=50';
}

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
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedProgSession, setExpandedProgSession] = useState<string | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  /* Programme acceptance */
  const [acceptedPrograms, setAcceptedPrograms] = useState<Record<string, boolean>>({});

  /* Validation exercices */
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [savingCompletion, setSavingCompletion] = useState<string | null>(null);
  const completionUnsubRef = useRef<(() => void) | null>(null);

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

  /* Cleanup real-time listener on unmount */
  useEffect(() => {
    return () => { if (completionUnsubRef.current) completionUnsubRef.current(); };
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
      const acceptedMap: Record<string, boolean> = {};
      for (const docSnap of aSnap.docs) {
        const aData = docSnap.data();
        const { programId, assignedAt, status } = aData;
        const pDoc = await getDoc(doc(db, 'programs', programId));
        if (pDoc.exists()) {
          progData.push({ id: docSnap.id, assignedAt, status: status || 'pending', ...pDoc.data() });
          if (status === 'active') acceptedMap[docSnap.id] = true;
        }
      }
      setAssignments(progData);
      setAcceptedPrograms(acceptedMap);
      setupCompletionListener(u);

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

  /** Real-time listener for exercise completions (single source of truth) */
  const setupCompletionListener = (u: import('firebase/auth').User) => {
    if (completionUnsubRef.current) completionUnsubRef.current();
    const q = query(
      collectionGroup(db, 'exercises'),
      where('clientId', '==', u.uid)
    );
    const unsub = onSnapshot(q,
      (snap) => {
        const map: Record<string, boolean> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.completed && data.assignmentId != null && data.si != null && data.ei != null) {
            map[`${data.assignmentId}_${data.si}_${data.ei}`] = true;
          }
        });
        console.log('[onSnapshot:completions] synced', Object.keys(map).length, 'completions');
        setCompletions(map);
      },
      (err) => console.error('[onSnapshot:completions] error:', err)
    );
    completionUnsubRef.current = unsub;
  };

  const toggleExercise = async (assignmentId: string, si: number, ei: number, exName?: string, exReps?: string) => {
    if (!user) return;
    const key = `${assignmentId}_${si}_${ei}`;
    if (savingCompletion === key) return;
    const wasDone = !!completions[key];
    // Optimistic UI — onSnapshot will reconcile later
    setCompletions(prev => {
      const n = { ...prev };
      if (wasDone) delete n[key]; else n[key] = true;
      return n;
    });
    setSavingCompletion(key);
    const ref = doc(db, 'program_assignments', assignmentId, 'sessions', `s${si}`, 'exercises', `e${ei}`);
    try {
      const payload = {
        completed: !wasDone,
        completedAt: !wasDone ? serverTimestamp() : null,
        clientId: user.uid,
        coachId,
        assignmentId,
        sessionId: `s${si}`,
        si,
        ei,
        ...(exName ? { name: exName } : {}),
        ...(exReps ? { reps: exReps } : {}),
      };
      console.log('[toggleExercise]', wasDone ? 'uncomplete' : 'complete', ref.path, { clientId: user.uid, coachId });
      await setDoc(ref, payload, { merge: true });
      if (!wasDone) fireToast('✅', 'Exercice validé', '');
    } catch (err) {
      console.error('[toggleExercise] error:', err);
      // Rollback optimistic update
      setCompletions(prev => {
        const n = { ...prev };
        if (wasDone) n[key] = true; else delete n[key];
        return n;
      });
      fireToast('❌', 'Erreur de synchro', 'Vérifiez votre connexion.');
    }
    setSavingCompletion(null);
  };

  const acceptProgram = async (assignmentId: string) => {
    if (!user) return;
    // Optimistic
    setAcceptedPrograms(prev => ({ ...prev, [assignmentId]: true }));
    try {
      const ref = doc(db, 'program_assignments', assignmentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.error('[acceptProgram] assignment not found:', assignmentId);
        setAcceptedPrograms(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
        fireToast('❌', 'Erreur', 'Programme introuvable.');
        return;
      }
      await updateDoc(ref, { status: 'active', acceptedAt: serverTimestamp() });
      setAssignments(prev => prev.map((a: any) => a.id === assignmentId ? { ...a, status: 'active' } : a));
      console.log('[acceptProgram] status set to active:', assignmentId);
      fireToast('✅', 'Défi accepté !', 'C\'est parti, bon courage !');
    } catch (err) {
      console.error('[acceptProgram] error:', err);
      setAcceptedPrograms(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
      fireToast('❌', 'Erreur', 'Impossible d\'accepter le programme.');
    }
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
                ) : displayPrograms.length === 0 ? (
                  <div style={{ background: '#1c1b1b', borderRadius: 14, padding: '40px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📋</div>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#e5e2e1', marginBottom: 8 }}>Aucun programme assigné</div>
                    <p style={{ fontSize: '.78rem', color: '#6B7280', lineHeight: 1.6 }}>Votre coach n'a pas encore assigné de programme. Contactez-le via la messagerie.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {displayPrograms.map((prog: any) => {
                      const isOpen = expandedProgram === prog.id;
                      const isAccepted = prog.status === 'active' || (!!acceptedPrograms[prog.id] && prog.status !== 'pending');
                      const startDateStr = prog.startDate
                        ? new Date(prog.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                        : prog.assignedAt ? new Date((prog.assignedAt.toDate ? prog.assignedAt.toDate() : prog.assignedAt)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
                      const days = daysSince(prog.assignedAt);
                      const totalEx = (prog.sessions || []).reduce((a: number, s: any) => a + (s.exercises?.length || 0), 0);
                      return (
                        <div key={prog.id} style={{ background: '#1c1b1b', borderRadius: 14, border: `1px solid ${isAccepted ? 'rgba(255,255,255,0.06)' : 'rgba(178,42,39,0.3)'}`, overflow: 'hidden' }}>
                          {/* Accepter le défi banner */}
                          {!isAccepted && (
                            <div style={{ background: 'linear-gradient(135deg,rgba(137,7,14,0.15),rgba(178,42,39,0.08))', borderBottom: '1px solid rgba(178,42,39,0.2)', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                              <div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>Nouveau programme assigné !</div>
                                <div style={{ fontSize: '.64rem', color: '#9CA3AF', marginTop: 3 }}>Votre coach vous a préparé un programme. Prêt à relever le défi ?</div>
                              </div>
                              <button
                                onClick={() => acceptProgram(prog.id)}
                                style={{ background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.06em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' as const }}
                              >
                                ACCEPTER LE DÉFI
                              </button>
                            </div>
                          )}

                          {/* Card header */}
                          <div style={{ padding: '20px 22px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                  <span style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: isAccepted ? '#16a34a' : '#6B7280', background: isAccepted ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 4 }}>{isAccepted ? '● EN COURS' : 'EN ATTENTE'}</span>
                                </div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(.9rem,2.5vw,1.1rem)', color: '#e5e2e1', letterSpacing: '-.03em', marginBottom: 6 }}>{prog.title}</div>
                                <div style={{ fontSize: '.64rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                                  {prog.goal && <span>{prog.goal}</span>}
                                  {prog.level && <span> · {prog.level}</span>}
                                  {prog.durationWeeks && <span> · {prog.durationWeeks} semaines</span>}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.66rem', color: '#9CA3AF', marginBottom: 2 }}>Début</div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.78rem', color: '#e5e2e1' }}>{startDateStr}</div>
                                <div style={{ fontSize: '.6rem', color: '#6B7280', marginTop: 4 }}>{days} jours</div>
                              </div>
                            </div>

                            {/* Quick stats */}
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                              {[
                                { label: 'Séances/sem', val: `${prog.sessionsPerWeek || '—'} x` },
                                { label: 'Exercices', val: String(totalEx) },
                                { label: 'Durée', val: `${prog.durationWeeks || '—'} sem.` },
                              ].map(s => (
                                <div key={s.label}>
                                  <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 2 }}>{s.label}</div>
                                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', color: '#b22a27' }}>{s.val}</div>
                                </div>
                              ))}
                            </div>

                            {/* Progress bar — based on actual completions */}
                            {(() => {
                              const allDone = (prog.sessions || []).reduce((acc: number, s: any, si: number) => acc + ((s.exercises || []) as any[]).filter((_: any, ei: number) => completions[`${prog.id}_${si}_${ei}`]).length, 0);
                              const progPct = totalEx > 0 ? Math.min(100, Math.round((allDone / totalEx) * 100)) : 0;
                              return (
                                <div style={{ marginBottom: 16 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#6B7280' }}>Progression</span>
                                    <span style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: progPct === 100 ? '#16a34a' : '#b22a27' }}>{progPct}%</span>
                                  </div>
                                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progPct}%`, background: progPct === 100 ? 'linear-gradient(90deg,#14532d,#16a34a)' : 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width 1s ease' }} />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Toggle button */}
                            {(prog.sessions?.length > 0 || prog.weeklyMealPlan?.length > 0) && (
                              <button
                                onClick={() => { setExpandedProgram(isOpen ? null : prog.id); setExpandedProgSession(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.62rem', letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#9CA3AF', transition: 'all .15s' }}
                              >
                                {isOpen ? '▲ MASQUER LE DÉTAIL' : '▼ VOIR LE DÉTAIL'}
                              </button>
                            )}
                          </div>

                          {/* Expanded detail */}
                          {isOpen && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              {/* Meal plan */}
                              {prog.weeklyMealPlan?.length > 0 && (
                                <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginBottom: 12 }}>🍽️ Plan repas de la semaine</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                                    {prog.weeklyMealPlan.map((m: any, i: number) => (
                                      <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.66rem', color: '#b22a27', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>{m.meal}</div>
                                        <div style={{ fontSize: '.72rem', color: '#9CA3AF', lineHeight: 1.6 }}>{m.recipe}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Sessions accordion */}
                              {prog.sessions?.length > 0 && (
                                <div style={{ padding: '18px 22px' }}>
                                  <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginBottom: 16 }}>📅 Sessions d'entraînement</div>

                                  {/* ── BARRE DE PROGRESSION SÉANCES ── */}
                                  <div style={{ marginBottom: 20, paddingBottom: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                      {prog.sessions.map((session: any, si: number) => {
                                        const exCount = (session.exercises?.length || 0);
                                        const doneCount = exCount > 0 ? (session.exercises as any[]).filter((_: any, ei: number) => completions[`${prog.id}_${si}_${ei}`]).length : 0;
                                        const status = doneCount >= exCount && exCount > 0 ? 'done' : doneCount > 0 ? 'current' : 'todo';
                                        return (
                                          <div key={si} style={{ display: 'flex', alignItems: 'center' }}>
                                            {si > 0 && <div style={{ width: 12, height: 2, background: status === 'current' ? '#b22a27' : status === 'done' ? '#b22a27' : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: status === 'done' ? '#b22a27' : 'transparent', border: status === 'done' ? 'none' : status === 'current' ? '2px solid #b22a27' : '2px solid rgba(255,255,255,0.18)', fontSize: '.62rem', color: status === 'done' ? '#fff' : status === 'current' ? '#b22a27' : '#6B7280', fontFamily: 'Lexend, sans-serif', fontWeight: 900, transition: 'all .2s' }}>
                                                {status === 'done' ? '✓' : status === 'current' ? '→' : String(si + 1)}
                                              </div>
                                              <div style={{ fontSize: '.48rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.06em', color: status === 'done' ? '#b22a27' : status === 'current' ? '#e5e2e1' : '#6B7280', textAlign: 'center', lineHeight: 1.2 }}>S{si + 1}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* ── SESSION ACCORDIONS ── */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {prog.sessions.map((session: any, si: number) => {
                                      const sessKey = `${prog.id}-${si}`;
                                      const sessOpen = expandedProgSession === sessKey;
                                      const sessionPhoto = getSessionPhoto(session.label || '', session.focus || '');
                                      return (
                                        <div key={si} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sessOpen ? 'rgba(178,42,39,0.22)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color .2s' }}>
                                          {/* Session header */}
                                          <div
                                            onClick={() => { setExpandedProgSession(sessOpen ? null : sessKey); setExpandedEx(null); }}
                                            style={{ display: 'flex', alignItems: 'stretch', cursor: 'pointer', userSelect: 'none' as const, minHeight: 58 }}
                                          >
                                            <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#e5e2e1', letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                  JOUR {session.day} — {session.label}
                                                </div>
                                                {session.focus && <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2 }}>{session.focus}</div>}
                                                <div style={{ fontSize: '.58rem', color: '#6B7280', marginTop: 2 }}>{session.exercises?.length || 0} exercice{(session.exercises?.length || 0) !== 1 ? 's' : ''}</div>
                                              </div>
                                              <span style={{ color: '#b22a27', fontSize: '.78rem', transition: 'transform .2s', transform: sessOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
                                            </div>
                                            {/* Photo strip — hidden < 400px via CSS */}
                                            <div className="cl-sess-photo" style={{ width: 60, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                                              <img src={sessionPhoto} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.28) saturate(0.65)' }} />
                                            </div>
                                          </div>

                                          {/* Session progress bar */}
                                          {session.exercises?.length > 0 && (() => {
                                            const done = (session.exercises as any[]).filter((_, ei) => completions[`${prog.id}_${si}_${ei}`]).length;
                                            const total = session.exercises.length;
                                            const pct = Math.round((done / total) * 100);
                                            return (
                                              <div style={{ padding: '8px 14px 2px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                  <span style={{ fontSize: '0.6rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF', letterSpacing: '.08em' }}>PROGRESSION</span>
                                                  <span style={{ fontSize: '0.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: pct === 100 ? '#16a34a' : '#b22a27' }}>{done}/{total}</span>
                                                </div>
                                                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                                                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#14532d,#16a34a)' : 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width .5s ease' }} />
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {/* Exercises */}
                                          {sessOpen && session.exercises?.length > 0 && (
                                            <div style={{ padding: '0 12px 14px' }}>
                                              {session.exercises.map((ex: any, ei: number) => {
                                                const exKey = `${prog.id}-${si}-${ei}`;
                                                const compKey = `${prog.id}_${si}_${ei}`;
                                                const exIsOpen = expandedEx === exKey;
                                                const isDone = !!completions[compKey];
                                                const isSaving = savingCompletion === compKey;
                                                return (
                                                  <div key={ei} style={{ marginBottom: 8 }}>
                                                    {/* Card FERMÉE */}
                                                    <div
                                                      style={{ background: isDone ? 'rgba(22,163,74,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDone ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: exIsOpen ? '10px 10px 0 0' : 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                                                    >
                                                      {/* Left: expand zone */}
                                                      <div onClick={() => setExpandedEx(exIsOpen ? null : exKey)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                                                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: isDone ? '#86efac' : '#e5e2e1', textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
                                                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>
                                                          {ex.primary_muscle || ex.muscle || '—'} · {ex.sets} séries · {formatReps(String(ex.reps ?? ''))} · repos {ex.rest}
                                                        </div>
                                                      </div>
                                                      {/* Right: validate + expand arrow */}
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                        <button
                                                          onClick={e => { e.stopPropagation(); toggleExercise(prog.id, si, ei, ex.name, String(ex.reps ?? '')); }}
                                                          disabled={isSaving}
                                                          style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${isDone ? '#16a34a' : 'rgba(178,42,39,0.5)'}`, background: isDone ? 'rgba(22,163,74,0.15)' : 'rgba(178,42,39,0.1)', cursor: isSaving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', opacity: isSaving ? 0.6 : 1 }}
                                                          title={isDone ? 'Marquer non fait' : 'Valider'}
                                                        >
                                                          <span style={{ color: isDone ? '#16a34a' : '#b22a27', fontSize: '0.85rem', fontWeight: 700, transition: 'color .15s' }}>{isDone ? '✓' : '+'}</span>
                                                        </button>
                                                        <span onClick={() => setExpandedEx(exIsOpen ? null : exKey)} style={{ color: '#b22a27', fontSize: '0.75rem', transition: 'transform .2s', transform: exIsOpen ? 'rotate(180deg)' : 'none', cursor: 'pointer' }}>▼</span>
                                                      </div>
                                                    </div>

                                                    {/* Card OUVERTE */}
                                                    {exIsOpen && (
                                                      <div style={{ background: '#1c1b1b', border: '1px solid rgba(178,42,39,0.25)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                                                        {/* Photo */}
                                                        <div style={{ position: 'relative', overflow: 'hidden', background: '#111' }}>
                                                          <img
                                                            src={getMusclePhoto(ex.primary_muscle || ex.muscle || '')}
                                                            alt={ex.name || ''}
                                                            style={{ width: '100%', height: 'auto', minHeight: 70, maxHeight: 120, objectFit: 'contain', filter: 'brightness(0.28)', display: 'block' }}
                                                          />
                                                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1c1b1b 0%, transparent 70%)' }} />
                                                          <div style={{ position: 'absolute', bottom: 10, left: 14, fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#fff' }}>{ex.name}</div>
                                                        </div>

                                                        {/* Prescription 3 col */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'rgba(255,255,255,0.03)', padding: 12 }}>
                                                          {[
                                                            { label: 'SÉRIES', val: String(ex.sets ?? '—') },
                                                            { label: 'REPS/DURÉE', val: formatReps(String(ex.reps ?? '—')) },
                                                            { label: 'REPOS', val: ex.rest || '—' },
                                                          ].map(s => (
                                                            <div key={s.label} style={{ textAlign: 'center' }}>
                                                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: '#b22a27', lineHeight: 1 }}>{s.val}</div>
                                                              <div style={{ fontSize: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#9CA3AF', marginTop: 4 }}>{s.label}</div>
                                                            </div>
                                                          ))}
                                                        </div>

                                                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                          {/* MISE EN PLACE */}
                                                          {ex.instructions?.setup && (
                                                            <div>
                                                              <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>MISE EN PLACE</div>
                                                              <p style={{ fontSize: '0.78rem', color: '#e5e2e1', lineHeight: 1.65, margin: 0 }}>{ex.instructions.setup}</p>
                                                            </div>
                                                          )}

                                                          {/* EXÉCUTION */}
                                                          {ex.instructions?.execution && (
                                                            <div>
                                                              <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 10 }}>EXÉCUTION</div>
                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {ex.instructions.execution
                                                                  .split('. ')
                                                                  .filter((phrase: string) => phrase.trim().length > 3)
                                                                  .map((phrase: string, i: number) => (
                                                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#b22a27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 900, color: '#fff', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                                                                      <span style={{ fontSize: '0.78rem', color: '#e5e2e1', lineHeight: 1.65 }}>{phrase}</span>
                                                                    </div>
                                                                  ))}
                                                              </div>
                                                            </div>
                                                          )}

                                                          {/* CONSEILS */}
                                                          {(ex.instructions?.tips?.length ?? 0) > 0 && (
                                                            <div>
                                                              <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>CONSEILS</div>
                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                                {ex.instructions!.tips!.map((tip: string, i: number) => (
                                                                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                                    <span style={{ color: '#16a34a', fontSize: '0.8rem', flexShrink: 0, lineHeight: 1.4 }}>✓</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.55 }}>{tip}</span>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}

                                                          {/* ERREURS */}
                                                          {(ex.instructions?.common_mistakes?.length ?? 0) > 0 && (
                                                            <div>
                                                              <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>ERREURS À ÉVITER</div>
                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                                {ex.instructions!.common_mistakes!.map((m: string, i: number) => (
                                                                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                                    <span style={{ color: '#b22a27', fontSize: '0.8rem', flexShrink: 0, lineHeight: 1.4 }}>✗</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.55 }}>{m}</span>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
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
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,6vw,3rem)', letterSpacing: '-.05em', lineHeight: .92, color: '#e5e2e1', margin: '0 0 8px' }}>MES STATISTIQUES.</h2>
                    <p style={{ fontSize: '.72rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', margin: 0 }}>Période : du 1er au 30 mars 2025 · 30 jours de suivi</p>
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
                <style>{`
                  .st-kpi-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
                  @media(min-width:640px){ .st-kpi-grid { grid-template-columns: 1fr 1fr; } }
                  @media(min-width:900px){ .st-kpi-grid { grid-template-columns: 2fr 1fr 1fr; } }
                  .st-chart-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
                  @media(min-width:768px){ .st-chart-grid { grid-template-columns: 1fr 300px; } }
                  .st-week-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
                  @media(min-width:600px){ .st-week-grid { grid-template-columns: repeat(4,1fr); } }
                `}</style>
                <div className="st-kpi-grid">

                  {/* Card 1 — Performance du mois */}
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27' }}>PERFORMANCE DU MOIS</div>
                    <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: 'clamp(1rem,2.5vw,1.25rem)', color: '#e5e2e1', lineHeight: 1.3, margin: 0 }}>
                      Vous avez complété <span style={{ color: '#b22a27' }}>12 séances</span> ce mois.
                    </p>
                    <div style={{ padding: '10px 14px', background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.15)', borderRadius: 8, fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.65 }}>
                      💡 <em>Conseil coach : Vos temps de récupération s'améliorent. Augmentez l'intensité lors de votre prochain cycle.</em>
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {['−2.8 kg', '89% assiduité', '420 kcal moy.'].map(pill => (
                        <span key={pill} style={{ background: 'rgba(178,42,39,0.12)', borderRadius: 6, padding: '4px 10px', fontSize: '.62rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#e3beb8', letterSpacing: '.04em' }}>{pill}</span>
                      ))}
                    </div>
                  </div>

                  {/* Card 2 — Séances ce mois */}
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏆</div>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.8rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>12</div>
                    <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b22a27' }}>SÉANCES CE MOIS</div>
                    <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: '#16a34a', fontWeight: 600 }}>↑ +3 vs mois dernier</div>
                  </div>

                  {/* Card 3 — Jours actifs */}
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔥</div>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.8rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>18</div>
                    <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b22a27' }}>JOURS ACTIFS</div>
                    <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Meilleure série : 22 jours</div>
                  </div>

                </div>

                {/* ── 3+4. GRAPHIQUE + COMPOSITION ── */}
                <div className="st-chart-grid">

                  {/* Graphique barres double avec axe Y + valeurs */}
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px', overflowX: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>PROGRESSION FORCE</div>
                      <div style={{ display: 'flex', gap: 14 }}>
                        {[{ label: 'SQUAT', color: '#b22a27' }, { label: 'SOULEVÉ DE TERRE', color: '#4a4949' }].map(l => (
                          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', color: '#6B7280' }}>{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Chart area avec axe Y */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                      {/* Axe Y */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 22, flexShrink: 0 }}>
                        {['120', '80', '40', '0'].map(v => (
                          <span key={v} style={{ fontSize: '.52rem', fontFamily: 'Inter, sans-serif', color: '#6B7280', lineHeight: 1 }}>{v}</span>
                        ))}
                      </div>
                      {/* Barres */}
                      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                        {[
                          { label: 'SEM 01', squat: 67, sdt: 83, sqKg: '80kg', sdtKg: '100kg' },
                          { label: 'SEM 02', squat: 71, sdt: 92, sqKg: '85kg', sdtKg: '110kg' },
                          { label: 'SEM 03', squat: 75, sdt: 96, sqKg: '90kg', sdtKg: '115kg' },
                          { label: 'SEM 04', squat: 79, sdt: 100, sqKg: '95kg', sdtKg: '120kg' },
                        ].map(w => (
                          <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                            {/* Valeurs au-dessus */}
                            <div style={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
                              <span style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27', flex: 1, textAlign: 'center' }}>{w.sqKg}</span>
                              <span style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#9CA3AF', flex: 1, textAlign: 'center' }}>{w.sdtKg}</span>
                            </div>
                            {/* Barres */}
                            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 110 }}>
                              <div style={{ flex: 1, background: '#b22a27', borderRadius: '3px 3px 0 0', height: `${w.squat}%`, transition: 'height 1s ease' }} />
                              <div style={{ flex: 1, background: '#4a4949', borderRadius: '3px 3px 0 0', height: `${w.sdt}%`, transition: 'height 1s ease' }} />
                            </div>
                            <div style={{ fontSize: '.5rem', fontFamily: 'Lexend, sans-serif', fontWeight: 600, color: '#6B7280', letterSpacing: '.06em', textAlign: 'center' }}>{w.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Composition corporelle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px', flex: 1 }}>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 18 }}>COMPOSITION CORPORELLE</div>
                      {/* Poids */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                          <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Progression du poids</span>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>−2.8 kg</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: '56%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
                        </div>
                        <div style={{ fontSize: '.6rem', fontFamily: 'Inter, sans-serif', color: '#16a34a' }}>Objectif final : −5 kg · En bonne voie ✓</div>
                      </div>
                      {/* Masse grasse */}
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                          <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Indice de masse grasse</span>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>−1.8%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: '45%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
                        </div>
                        <div style={{ fontSize: '.6rem', fontFamily: 'Inter, sans-serif', color: '#16a34a' }}>Objectif final : −4% · En bonne voie ✓</div>
                      </div>
                    </div>
                    {/* Volume soulevé */}
                    <div style={{ background: 'linear-gradient(135deg,#89070e,#b22a27)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: -18, right: -8, fontSize: '4.5rem', opacity: .08, lineHeight: 1, pointerEvents: 'none' }}>🏋️</div>
                      <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8, position: 'relative' }}>VOLUME SOULEVÉ CE MOIS</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.3rem,3vw,1.7rem)', color: '#fff', letterSpacing: '-.04em', lineHeight: 1, position: 'relative' }}>56 500 kg</div>
                      <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.8)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, position: 'relative' }}>
                        <span>↑</span> +8% vs mois dernier
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 5. ASSIDUITÉ HEBDOMADAIRE ── */}
                <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px', overflowX: 'hidden' }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em', marginBottom: 18 }}>MON ASSIDUITÉ</div>

                  {/* Barre de progression mensuelle */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Séances complétées ce mois</span>
                      <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>12 / 16</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 7 }}>
                      <div style={{ height: '100%', width: '75%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
                    </div>
                    <div style={{ fontSize: '.65rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>Il vous reste 4 séances pour atteindre votre objectif ce mois</div>
                  </div>

                  {/* Grille semaines */}
                  <div className="st-week-grid">
                    {[
                      { label: 'SEM 01', days: ['✓','-','✓','✓','-','✓','-'] },
                      { label: 'SEM 02', days: ['✓','✓','-','✓','✓','-','-'] },
                      { label: 'SEM 03', days: ['-','✓','✓','-','✓','✓','-'] },
                      { label: 'SEM 04', days: ['✓','✓','-','✓','-','-','-'] },
                    ].map(week => (
                      <div key={week.label}>
                        <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8, textAlign: 'center' }}>{week.label}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                          {(['L','M','Me','J','V','S','D'] as const).map((day, di) => {
                            const state = week.days[di];
                            return (
                              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ fontSize: '.42rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>{day}</div>
                                <div style={{
                                  width: '100%', aspectRatio: '1', borderRadius: 3,
                                  background: state === '✓' ? '#b22a27' : 'rgba(255,255,255,0.05)',
                                  border: state === 'M' ? '1px dashed rgba(178,42,39,0.5)' : '1px solid transparent',
                                }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Légende */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                    {[
                      { color: '#b22a27', border: 'none', label: 'Séance effectuée' },
                      { color: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', label: 'Repos' },
                      { color: 'transparent', border: '1px dashed rgba(178,42,39,0.5)', label: 'Séance manquée' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, border: item.border, flexShrink: 0 }} />
                        <span style={{ fontSize: '.62rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 6. OBJECTIFS DU MOIS ── */}
                <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px' }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em', marginBottom: 20 }}>MES OBJECTIFS DU MOIS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {[
                      { label: 'Séances complétées',               val: '12 / 16',              pct: 75,  sub: null },
                      { label: 'Jours objectif protéines atteint', val: '22 / 30 jours',        pct: 73,  sub: null },
                      { label: 'Déficit calorique cumulé',         val: '14 200 / 15 000 kcal', pct: 95,  sub: 'Quasi atteint 🎯' },
                    ].map(obj => (
                      <div key={obj.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '.78rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF', fontWeight: 500 }}>{obj.label}</span>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.78rem', color: '#e5e2e1', flexShrink: 0, marginLeft: 12 }}>{obj.val}</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: obj.sub ? 6 : 0 }}>
                          <div style={{ height: '100%', width: `${obj.pct}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
                        </div>
                        {obj.sub && <div style={{ fontSize: '.65rem', fontFamily: 'Inter, sans-serif', color: '#b22a27', fontWeight: 600 }}>{obj.sub}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── 7. CITATION FINALE ── */}
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=70"
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.22) grayscale(0.3)' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(137,7,14,0.6) 0%,rgba(10,10,10,0.85) 100%)' }} />
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
