'use client';

import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs, onSnapshot,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  orderBy, limit, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';

import OverviewTab     from '@/components/client/tabs/OverviewTab';
import ProgrammesTab   from '@/components/client/tabs/ProgrammesTab';
import NutritionTab    from '@/components/client/tabs/NutritionTab';
import StatistiquesTab from '@/components/client/tabs/StatistiquesTab';

/* ── Constants (passed as props, never change) ── */
const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  nutrition: { icon: '🥗', label: 'Nutrition', color: '#16a34a' },
  sport:     { icon: '🏋️', label: 'Sport',     color: '#b22a27' },
  business:  { icon: '🧠', label: 'Business',  color: '#6B7280' },
};
const CAT_ICON: Record<string, string>      = { nutrition: '🥗', training: '🏋️', lifestyle: '🌿', mindset: '🧠' };
const TIP_CAT_LABEL: Record<string, string> = { nutrition: 'Nutrition', training: 'Entraînement', lifestyle: 'Lifestyle', mindset: 'Mindset' };
const CIRCLE_R      = 70;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

/* ── Mock fallbacks ── */
const MOCK_PROGRAMS = [
  { id: 'mp1', title: 'Force & Hypertrophie', type: 'sport', assignedAt: null, coachName: 'Thomas Martin', progress: 45, days: 18 },
  { id: 'mp2', title: 'HIIT Brûle-graisses',  type: 'sport', assignedAt: null, coachName: 'Thomas Martin', progress: 0,  days: 0  },
];
const MOCK_NUTRITION = { calories: 2000, maintenanceCalories: 2500, protein: 150, carbs: 200, fat: 65, fastingType: '16/8', windowStart: '12:00', windowEnd: '20:00', notes: '' };
const MOCK_MEALS = [
  { id: 'mm1', emoji: '🥚', name: 'Petit-déjeuner Protéiné', time: '12:00', description: 'Omelette 3 œufs · Avoine 60g', calories: 520, protein: 38, carbs: 48, fat: 16 },
  { id: 'mm2', emoji: '🍗', name: 'Déjeuner Performance',     time: '15:00', description: 'Poulet 200g · Riz basmati',   calories: 680, protein: 52, carbs: 72, fat: 18 },
  { id: 'mm3', emoji: '🥜', name: 'Collation Anabolique',     time: '17:30', description: 'Amandes 30g · Yaourt grec',   calories: 285, protein: 18, carbs: 26, fat: 12 },
  { id: 'mm4', emoji: '🥑', name: 'Dîner Légèreté',           time: '19:00', description: 'Saumon 180g · Patate douce',  calories: 615, protein: 45, carbs: 52, fat: 24 },
];
const MOCK_TIPS = [
  { id: 'mt1', category: 'lifestyle', title: 'Hydratation optimale',    content: 'Buvez 30-35ml d\'eau par kg de poids corporel par jour.' },
  { id: 'mt2', category: 'training',  title: 'Progression des charges', content: 'Augmentez de 2.5kg toutes les 2-3 semaines.' },
  { id: 'mt3', category: 'nutrition', title: 'Fenêtre anabolique',       content: 'Consommez 25-40g de protéines dans les 30-60 min après l\'entraînement.' },
  { id: 'mt4', category: 'mindset',   title: 'Qualité du sommeil',       content: 'Dormez 7-9h par nuit. La récupération se fait à 70% pendant le sommeil.' },
];

/* ── Helpers ── */
const daysSince = (ts: Timestamp | null | undefined): number => {
  if (!ts) return 0;
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
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
const formatReps = (reps: string) => {
  const num = parseInt(reps);
  if (!isNaN(num) && num >= 120 && reps.includes('s')) return `${Math.round(num / 60)} min`;
  return reps;
};

type NavKey = 'overview' | 'programmes' | 'nutrition' | 'statistiques';

interface FoodItem {
  name: string; calories: number; protein: number; carbs: number; fat: number;
  unit: 'g' | 'ml' | 'unité';
  category: 'proteine' | 'glucide' | 'legume' | 'fruit' | 'graisse' | 'laitage';
}

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

  /* UI */
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [activeTab, setActiveTab]     = useState<NavKey>('overview');
  const [statPeriod, setStatPeriod]   = useState('30J');
  const [expandedProgram, setExpandedProgram]           = useState<string | null>(null);
  const [expandedProgSession, setExpandedProgSession]   = useState<string | null>(null);
  const [expandedEx, setExpandedEx]                     = useState<string | null>(null);
  const [acceptedPrograms, setAcceptedPrograms]         = useState<Record<string, boolean>>({});

  /* Nutrition tracking */
  const [foodLogs, setFoodLogs]         = useState<any[]>([]);
  const [hydration, setHydration]       = useState(0);
  const [selectedDate]                  = useState(new Date().toISOString().split('T')[0]);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [activeMealType, setActiveMealType] = useState<string>('breakfast');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity]         = useState(100);

  /* Exercise validation */
  const [completions, setCompletions]           = useState<Record<string, boolean>>({});
  const [completionLogs, setCompletionLogs]     = useState<any[]>([]);
  const [savingCompletion, setSavingCompletion] = useState<string | null>(null);
  const completionUnsubRef = useRef<(() => void) | null>(null);

  /* Computed */
  const displayPrograms = assignments.length > 0 ? assignments : MOCK_PROGRAMS;
  const displayNut      = nutritionPlan || MOCK_NUTRITION;
  const displayMeals    = clientMeals.length > 0 ? clientMeals : MOCK_MEALS;
  const displayTips     = tips.length > 0 ? tips : MOCK_TIPS;
  const firstName       = userName.split(' ')[0] || userName;

  /* Deficit */
  const deficit  = (displayNut.maintenanceCalories || 2500) - (displayNut.calories || 2000);
  const defLabel = deficit > 0 ? `−${deficit} KCAL` : deficit < 0 ? `+${Math.abs(deficit)} KCAL` : 'ÉQUILIBRE';

  /* Fasting */
  const getFastingStatus = () => {
    if (!displayNut.fastingType || displayNut.fastingType === 'none') return null;
    const now = new Date();
    const [sh, sm] = (displayNut.windowStart || '12:00').split(':').map(Number);
    const [eh, em] = (displayNut.windowEnd   || '20:00').split(':').map(Number);
    const startMin = sh * 60 + sm, endMin = eh * 60 + em, nowMin = now.getHours() * 60 + now.getMinutes();
    const inWindow = nowMin >= startMin && nowMin < endMin;
    const totalFastMins   = 1440 - (endMin - startMin);
    const elapsedFastMins = inWindow ? 0 : nowMin < startMin ? (1440 - endMin + nowMin) : (nowMin - endMin);
    return { inWindow, pct: inWindow ? Math.round(((nowMin - startMin) / (endMin - startMin)) * 100) : 0, elapsedH: Math.floor(elapsedFastMins / 60), elapsedM: elapsedFastMins % 60, fastPct: Math.min(100, Math.round((elapsedFastMins / totalFastMins) * 100)) };
  };
  const fastStatus  = getFastingStatus();
  const fastPctVal  = fastStatus?.fastPct ?? 0;
  const dashOffset  = CIRCUMFERENCE - (CIRCUMFERENCE * fastPctVal) / 100;

  /* Nutrition totals */
  const todayTotals = foodLogs.reduce(
    (acc, l: any) => ({ cal: acc.cal + (l.totalCalories || 0), p: acc.p + (l.totalProtein || 0), c: acc.c + (l.totalCarbs || 0), f: acc.f + (l.totalFat || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  /* Stats */
  const statFilteredLogs = (() => {
    if (statPeriod === '7J')  return completionLogs.filter(c => Date.now() - (c.completedAt?.toDate?.().getTime() ?? 0) <= 7  * 86400000);
    if (statPeriod === '30J') return completionLogs.filter(c => Date.now() - (c.completedAt?.toDate?.().getTime() ?? 0) <= 30 * 86400000);
    return completionLogs;
  })();
  const statActiveDays     = new Set(statFilteredLogs.map((c: any) => c.completedAt?.toDate?.()?.toDateString?.() || '').filter(Boolean)).size;
  const statTotalExercises = assignments.reduce((acc: number, a: any) => acc + ((a.sessions || []).reduce((s: number, sess: any) => s + ((sess.exercises || []).length || 0), 0)), 0);
  const statRate           = statTotalExercises > 0 ? Math.min(100, Math.round((statFilteredLogs.length / statTotalExercises) * 100)) : 0;
  const statWeeklyData     = (() => {
    const weeks: Record<string, number> = {};
    statFilteredLogs.forEach((c: any) => {
      const date = c.completedAt?.toDate?.(); if (!date) return;
      const ws = new Date(date); ws.setDate(date.getDate() - date.getDay());
      const key = ws.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      weeks[key] = (weeks[key] || 0) + 1;
    });
    return Object.entries(weeks).slice(-4).map(([label, val]) => ({ label, val }));
  })();
  const statMaxWeek = Math.max(1, ...statWeeklyData.map(d => d.val));
  const CHART_BARS = statWeeklyData.map(w => ({
    label: w.label,
    h: Math.min(100, w.val * 10),
    deficit: w.val,
  }));

  /* Mount */
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  useEffect(() => { return () => { if (completionUnsubRef.current) completionUnsubRef.current(); }; }, []);

  /* Auth + name */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? snap.data() : {};
        setUserName(d.name || d.displayName || u.displayName || u.email?.split('@')[0] || 'vous');
      } catch { setUserName(u.displayName || u.email?.split('@')[0] || 'vous'); }
    });
    return () => unsub();
  }, []);

  /* Fetch all */
  const fetchAll = async (u = user) => {
    if (!u) return;
    setLoading(true);
    try {
      const aSnap = await getDocs(query(collection(db, 'program_assignments'), where('clientId', '==', u.uid), orderBy('assignedAt', 'desc')));
      const progData: any[] = [];
      const acceptedMap: Record<string, boolean> = {};
      for (const docSnap of aSnap.docs) {
        const aData = docSnap.data();
        const pDoc = await getDoc(doc(db, 'programs', aData.programId));
        if (pDoc.exists()) {
          progData.push({ id: docSnap.id, assignedAt: aData.assignedAt, status: aData.status || 'pending', programId: aData.programId, ...pDoc.data() });
          if (aData.status === 'active') acceptedMap[docSnap.id] = true;
        }
      }
      setAssignments(progData);
      setAcceptedPrograms(acceptedMap);
      setupCompletionListener(u);

      const clientSnap = await getDocs(query(collection(db, 'clients'), where('clientUserId', '==', u.uid)));
      if (!clientSnap.empty) {
        const cId = clientSnap.docs[0].data().coachId;
        setCoachId(cId);
        try { const coachDoc = await getDoc(doc(db, 'users', cId)); if (coachDoc.exists()) {} } catch {}
        const nutSnap = await getDocs(query(collection(db, 'nutrition_assignments'), where('clientId', '==', u.uid)));
        setNutritionPlan(nutSnap.empty ? null : { id: nutSnap.docs[0].id, ...nutSnap.docs[0].data() });
        const tipSnap = await getDocs(query(collection(db, 'coach_tips'), where('coachId', '==', cId), limit(10)));
        const tipData = tipSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        tipData.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTips(tipData);
      }
      const mealsSnap = await getDocs(query(collection(db, 'coach_meals'), where('clientId', '==', u.uid)));
      const mealsData = mealsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      mealsData.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      setClientMeals(mealsData);

      const today = new Date().toISOString().split('T')[0];
      try {
        const flSnap = await getDocs(query(collection(db, 'food_logs'), where('clientId', '==', u.uid), where('date', '==', today)));
        setFoodLogs(flSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      try {
        const hDoc = await getDoc(doc(db, 'hydration_logs', `${u.uid}_${today}`));
        setHydration(hDoc.exists() ? hDoc.data().liters || 0 : 0);
      } catch {}
    } catch (e) { console.error(e); fireToast('❌', 'Erreur', 'Impossible de charger vos données.'); }
    setLoading(false);
  };

  const setupCompletionListener = async (u: import('firebase/auth').User) => {
    if (completionUnsubRef.current) completionUnsubRef.current();

    // Preload from sessions collection — stable IDs, no collectionGroup index needed
    try {
      const initSnap = await getDocs(query(collection(db, 'sessions'), where('clientId', '==', u.uid)));
      const initMap: Record<string, boolean> = {};
      const initLogs: any[] = [];
      initSnap.docs.forEach(d => {
        const data = d.data();
        const dateObj = data.date ? new Date(data.date) : data.completedAt ? new Date(data.completedAt) : new Date(0);
        if (Array.isArray(data.exercises)) {
          data.exercises.forEach((ex: any, i: number) => {
            if (ex.completed) {
              initMap[`${data.programId}_${data.dayIndex}_${i}`] = true;
              initLogs.push({ id: `${d.id}_ex${i}`, completedAt: { toDate: () => dateObj } });
            }
          });
        } else {
          Object.entries(data.exerciseCompletions || {}).forEach(([eiStr, done]) => {
            if (done) {
              initMap[`${data.assignmentId}_${data.si}_${eiStr}`] = true;
              initLogs.push({ id: `${d.id}_${eiStr}`, completedAt: { toDate: () => dateObj } });
            }
          });
        }
      });
      setCompletions(initMap);
      setCompletionLogs(initLogs);
    } catch (e) { console.warn('[completions:init]', e); }

    // Real-time listener — sessions collection, stats derived from same source
    const q = query(collection(db, 'sessions'), where('clientId', '==', u.uid));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, boolean> = {};
      const logs: any[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const dateObj = data.date ? new Date(data.date) : data.completedAt ? new Date(data.completedAt) : new Date(0);
        if (Array.isArray(data.exercises)) {
          data.exercises.forEach((ex: any, i: number) => {
            if (ex.completed) {
              map[`${data.programId}_${data.dayIndex}_${i}`] = true;
              logs.push({ id: `${d.id}_ex${i}`, completedAt: { toDate: () => dateObj } });
            }
          });
        } else {
          Object.entries(data.exerciseCompletions || {}).forEach(([eiStr, done]) => {
            if (done) {
              map[`${data.assignmentId}_${data.si}_${eiStr}`] = true;
              logs.push({ id: `${d.id}_${eiStr}`, completedAt: { toDate: () => dateObj } });
            }
          });
        }
      });
      setCompletions(map);
      setCompletionLogs(logs);
    }, (err) => console.error('[sessions:snapshot]', err));
    completionUnsubRef.current = unsub;
  };

  const toggleExercise = async (assignmentId: string, si: number, ei: number, exName?: string, exReps?: string, exSets?: number) => {
    if (!user) return;
    const key = `${assignmentId}_${si}_${ei}`;
    if (savingCompletion === key) return;
    const wasDone = !!completions[key];
    setCompletions(prev => { const n = { ...prev }; if (wasDone) delete n[key]; else n[key] = true; return n; });
    setSavingCompletion(key);

    // Stable session ID — survives page reloads
    const date = new Date().toISOString().split('T')[0];
    const sessionDocId = `${user.uid}_${assignmentId}_s${si}_${date}`;
    const sessionRef = doc(db, 'sessions', sessionDocId);
    const prog = assignments.find((a: any) => a.id === assignmentId);

    try {
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) {
        await setDoc(sessionRef, {
          clientId: user.uid, coachId, assignmentId, si, date,
          exerciseCompletions: { [ei]: !wasDone },
        });
      } else {
        await updateDoc(sessionRef, { [`exerciseCompletions.${ei}`]: !wasDone });
      }
      // Keep exercise_completions for stats backward compat
      const completionRef = doc(db, 'exercise_completions', `${assignmentId}_${si}_${ei}`);
      if (!wasDone) {
        await setDoc(completionRef, { clientId: user.uid, coachId, programId: prog?.programId || '', assignmentId, sessionIndex: si, exerciseName: exName || '', completedAt: serverTimestamp(), sets: exSets ?? 0, reps: exReps || '' });
      } else {
        await deleteDoc(completionRef);
      }
      if (!wasDone) fireToast('✅', 'Exercice validé', '');
    } catch (err) {
      console.error(err);
      setCompletions(prev => { const n = { ...prev }; if (wasDone) n[key] = true; else delete n[key]; return n; });
      fireToast('❌', 'Erreur de synchro', 'Vérifiez votre connexion.');
    }
    setSavingCompletion(null);
  };

  const acceptProgram = async (assignmentId: string) => {
    if (!user) return;
    setAcceptedPrograms(prev => ({ ...prev, [assignmentId]: true }));
    try {
      const ref = doc(db, 'program_assignments', assignmentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) { setAcceptedPrograms(prev => { const n = { ...prev }; delete n[assignmentId]; return n; }); fireToast('❌', 'Erreur', 'Programme introuvable.'); return; }
      await updateDoc(ref, { status: 'active', acceptedAt: serverTimestamp() });
      fireToast('✅', 'Défi accepté !', 'C\'est parti, bon courage !');
      if (user) await fetchAll(user);
    } catch (err) {
      console.error(err);
      setAcceptedPrograms(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
      fireToast('❌', 'Erreur', 'Impossible d\'accepter le programme.');
    }
  };

  const openFoodModal = (mealType: string) => { setActiveMealType(mealType); setSelectedFood(null); setQuantity(100); setShowFoodModal(true); };

  const handleAddFood = async () => {
    if (!user || !selectedFood) return;
    const factor = quantity / 100;
    const item = { name: selectedFood.name, quantity, unit: selectedFood.unit, calories: Math.round(selectedFood.calories * factor), protein: +(selectedFood.protein * factor).toFixed(1), carbs: +(selectedFood.carbs * factor).toFixed(1), fat: +(selectedFood.fat * factor).toFixed(1) };
    const today = selectedDate;
    const logId = `${user.uid}_${today}_${activeMealType}`;
    const ref = doc(db, 'food_logs', logId);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as any;
        const items = [...(data.items || []), item];
        const totals = items.reduce((a, i: any) => ({ c: a.c + i.calories, p: a.p + i.protein, g: a.g + i.carbs, f: a.f + i.fat }), { c: 0, p: 0, g: 0, f: 0 });
        await updateDoc(ref, { items, totalCalories: totals.c, totalProtein: +totals.p.toFixed(1), totalCarbs: +totals.g.toFixed(1), totalFat: +totals.f.toFixed(1) });
      } else {
        await setDoc(ref, { clientId: user.uid, coachId, date: today, mealType: activeMealType, items: [item], totalCalories: item.calories, totalProtein: item.protein, totalCarbs: item.carbs, totalFat: item.fat, createdAt: serverTimestamp() });
      }
      fireToast('✅', 'Aliment ajouté', selectedFood.name);
      setShowFoodModal(false);
      await fetchAll(user);
    } catch (e) { console.error(e); fireToast('❌', 'Erreur', 'Impossible d\'ajouter l\'aliment.'); }
  };

  const handleHydration = async (liters: number) => {
    if (!user) return;
    const next = Math.max(0, Math.min(5, liters));
    setHydration(next);
    try { await setDoc(doc(db, 'hydration_logs', `${user.uid}_${selectedDate}`), { clientId: user.uid, date: selectedDate, liters: next, updatedAt: serverTimestamp() }, { merge: true }); } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) fetchAll(user); }, [user]);
  const handleSignOut = async () => {
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'DELETE' });
    console.log('[logout] Session cookie cleared');
    router.push('/login');
  };
  const navTo = (key: string) => { setActiveTab(key as NavKey); };

  /* ── JSX ── */
  return (
    <ProtectedRoute role="client">
      <Toast />
      <div className="cl-root">
        <Sidebar role="client" activeTab={activeTab} onNavTo={navTo} onSignOut={handleSignOut} />

        <main className="cl-main" style={{ opacity: mounted ? 1 : 0, transition: 'opacity .4s ease' }}>
          <div className="cl-content">

            {activeTab === 'overview' && (
              <OverviewTab
                firstName={firstName}
                displayPrograms={displayPrograms}
                displayNut={displayNut}
                displayMeals={displayMeals}
                displayTips={displayTips}
                defLabel={defLabel}
                fastStatus={fastStatus}
                CIRCLE_R={CIRCLE_R}
                CIRCUMFERENCE={CIRCUMFERENCE}
                dashOffset={dashOffset}
                CHART_BARS={CHART_BARS}
                CAT_ICON={CAT_ICON}
              />
            )}

            {activeTab === 'programmes' && (
              <ProgrammesTab
                clientId={user?.uid || ''}
                coachId={coachId}
                displayPrograms={displayPrograms}
                loading={loading}
                expandedProgram={expandedProgram}
                setExpandedProgram={setExpandedProgram}
                expandedProgSession={expandedProgSession}
                setExpandedProgSession={setExpandedProgSession}
                expandedEx={expandedEx}
                setExpandedEx={setExpandedEx}
                acceptedPrograms={acceptedPrograms}
                acceptProgram={acceptProgram}
                toggleExercise={toggleExercise}
                completions={completions}
                savingCompletion={savingCompletion}
                daysSince={daysSince}
                getSessionPhoto={getSessionPhoto}
                getMusclePhoto={getMusclePhoto}
                formatReps={formatReps}
                TYPE_CONFIG={TYPE_CONFIG}
              />
            )}

            {activeTab === 'nutrition' && (
              <NutritionTab
                displayNut={displayNut}
                todayTotals={todayTotals}
                foodLogs={foodLogs}
                clientMeals={clientMeals}
                hydration={hydration}
                showFoodModal={showFoodModal}
                setShowFoodModal={setShowFoodModal}
                selectedFood={selectedFood}
                setSelectedFood={setSelectedFood}
                quantity={quantity}
                setQuantity={setQuantity}
                activeMealType={activeMealType}
                setActiveMealType={setActiveMealType}
                openFoodModal={openFoodModal}
                handleAddFood={handleAddFood}
                handleHydration={handleHydration}
              />
            )}

            {activeTab === 'statistiques' && (
              <StatistiquesTab
                displayTips={displayTips}
                CAT_ICON={CAT_ICON}
                TIP_CAT_LABEL={TIP_CAT_LABEL}
                completionLogs={completionLogs}
                statPeriod={statPeriod}
                setStatPeriod={setStatPeriod}
                statFilteredLogs={statFilteredLogs}
                statActiveDays={statActiveDays}
                statTotalExercises={statTotalExercises}
                statRate={statRate}
                statWeeklyData={statWeeklyData}
                statMaxWeek={statMaxWeek}
              />
            )}

          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .cl-root { display: flex; flex-direction: row; min-height: 100vh; background: #131313; color: #e5e2e1; overflow-x: hidden; }
        @media (max-width: 767px) { .cl-root { flex-direction: column; } }
        .cl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-x: hidden; }
        @media (min-width: 768px) { .cl-main { margin-left: 240px; width: calc(100vw - 240px); } }
        @media (max-width: 767px) { .cl-main { margin-left: 0 !important; width: 100% !important; padding-top: 56px; } }
        .cl-content { padding: 24px 20px 40px; max-width: 1100px; width: 100%; overflow-x: hidden; }
        @media (min-width: 769px) { .cl-content { padding: 32px 32px 60px; } }
        .cl-hero { position: relative; border-radius: 16px; overflow: hidden; margin-bottom: 24px; min-height: 220px; display: flex; align-items: flex-end; background: #2a2a2a; }
        .cl-hero-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(137,7,14,0.82) 0%, rgba(19,19,19,0.7) 60%, rgba(19,19,19,0.95) 100%); z-index: 1; }
        .cl-hero-content { position: relative; z-index: 2; padding: clamp(20px,4vw,36px); }
        .cl-hero-badge { font-size: .55rem; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(229,226,225,0.5); margin-bottom: 12px; }
        .cl-hero-title { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.5rem, 4vw, 2.4rem); letter-spacing: -.05em; line-height: 1.05; color: #e5e2e1; margin: 0 0 14px; }
        .cl-hero-quote { font-family: 'Inter', sans-serif; font-size: clamp(.65rem, 1.5vw, .78rem); color: rgba(229,226,225,0.55); font-style: italic; margin: 0; max-width: 400px; line-height: 1.6; }
        .cl-row2 { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
        @media (min-width: 700px) { .cl-row2 { grid-template-columns: 60fr 38fr; } }
        .cl-row3 { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 700px) { .cl-row3 { grid-template-columns: repeat(3, 1fr); } }
        .cl-card { background: rgba(28,27,27,0.9); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 22px; }
        .cl-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .cl-card-label { font-size: .58rem; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #9CA3AF; }
        .cl-card-sub { font-size: .62rem; color: #6B7280; font-family: 'Inter', sans-serif; margin-top: 3px; }
        .cl-energy-card { display: flex; flex-direction: column; }
        .cl-chart { display: flex; align-items: flex-end; gap: 6px; height: 110px; flex: 1; margin-top: 12px; }
        .cl-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 6px; }
        .cl-chart-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
        .cl-chart-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; animation: barGrow .9s ease forwards; transform-origin: bottom; }
        @keyframes barGrow { from { height: 0 !important; } to { height: var(--target-h, 50%); } }
        .cl-chart-label { font-size: .52rem; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #6B7280; }
        .cl-chart-label.today { color: #b22a27; }
        .cl-seance-card { position: relative; overflow: hidden; min-height: 220px; display: flex; flex-direction: column; padding: 0; }
        .cl-seance-bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80') center/cover no-repeat; }
        .cl-seance-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(19,19,19,0.97) 0%, rgba(19,19,19,0.6) 50%, rgba(19,19,19,0.3) 100%); }
        .cl-seance-content { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding: 22px; gap: 16px; }
        .cl-seance-badge { align-self: flex-start; font-size: .5rem; font-family: 'Lexend', sans-serif; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #b22a27; background: rgba(178,42,39,0.12); border: 1px solid rgba(178,42,39,0.25); padding: 4px 10px; border-radius: 4px; }
        .cl-seance-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #89070e, #b22a27); border: none; border-radius: 8px; color: #e5e2e1; font-family: 'Lexend', sans-serif; font-weight: 800; font-size: .65rem; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; transition: transform .2s, box-shadow .2s; }
        .cl-seance-btn:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(178,42,39,0.4); }
        .cl-fasting-card { display: flex; flex-direction: column; }
        .cl-fasting-circle-wrap { display: flex; justify-content: center; margin-bottom: 20px; }
        .cl-fasting-info { display: flex; flex-direction: column; gap: 10px; }
        .cl-fasting-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .cl-fasting-row:last-child { border-bottom: none; }
        .cl-nut-card { display: flex; flex-direction: column; }
        .cl-weight-card { display: flex; flex-direction: column; }
        .cl-weight-trend { display: flex; align-items: flex-end; gap: 4px; height: 44px; margin-top: 16px; }
        .cl-weight-bar { flex: 1; border-radius: 3px 3px 0 0; min-height: 4px; }
        .cl-page-header { margin-bottom: 24px; }
        .cl-page-title { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.4rem, 3.5vw, 2rem); letter-spacing: -.05em; color: #e5e2e1; margin: 0 0 6px; }
        .cl-page-sub { font-size: .72rem; color: #9CA3AF; font-family: 'Inter', sans-serif; margin: 0; }
        .cl-prog-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 600px) { .cl-prog-grid { grid-template-columns: repeat(2, 1fr); } }
        .cl-prog-card { background: rgba(28,27,27,0.9); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; transition: border-color .2s, transform .2s, box-shadow .2s; cursor: pointer; }
        .cl-prog-card:hover { border-color: rgba(178,42,39,0.35); transform: scale(1.02); box-shadow: 0 0 24px rgba(178,42,39,0.12); }
        .cl-nut-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        @media (min-width: 600px) { .cl-nut-stats { grid-template-columns: repeat(4, 1fr); } }
        .cl-nut-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; text-align: center; }
        .cl-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        @media (min-width: 600px) { .cl-stats-grid { grid-template-columns: repeat(4, 1fr); } }
        .cl-stat-card { background: rgba(28,27,27,0.9); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; text-align: center; }
        .cl-spinner { width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.07); border-top-color: #b22a27; animation: spin .8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .nut-bubble { width:44px; height:44px; border-radius:50%; cursor:pointer; transition: background .3s, transform .15s; border:1px solid rgba(255,255,255,0.08); }
        .nut-bubble:active { transform: scale(1.1); }
        .nut-meal-card { background:#1c1b1b; border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:hidden; transition: border-color .2s; }
        .nut-meal-card:hover { border-color: rgba(178,42,39,0.3); }
        .nut-add-btn { background: linear-gradient(135deg,#89070e,#b22a27); border:none; color:#fff; padding:10px 16px; border-radius:8px; font-family: 'Lexend', sans-serif; font-weight:800; font-size:.7rem; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; transition: transform .2s, box-shadow .2s; }
        .nut-add-btn:hover { transform: scale(1.02); box-shadow: 0 0 24px rgba(178,42,39,0.35); }
        .nut-input { width:100%; background:#2a2a2a; border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:11px 13px; color:#e5e2e1; font-family:'Inter', sans-serif; font-size:.85rem; outline:none; }
        .nut-input:focus { border-color: rgba(178,42,39,0.5); }
        .nut-pill { padding:7px 13px; border-radius:7px; border:1px solid rgba(255,255,255,0.07); background:#2a2a2a; color:#9CA3AF; font-family:'Lexend', sans-serif; font-weight:700; font-size:.62rem; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; transition: all .2s; }
        .nut-pill.active { background:#b22a27; border-color:#b22a27; color:#fff; }
        .nut-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width:768px){ .nut-grid-2 { grid-template-columns: 1fr; } }
        .st-kpi-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media(min-width:640px){ .st-kpi-grid { grid-template-columns: 1fr 1fr; } }
        @media(min-width:900px){ .st-kpi-grid { grid-template-columns: 2fr 1fr 1fr; } }
        .st-chart-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media(min-width:768px){ .st-chart-grid { grid-template-columns: 1fr 300px; } }
        .st-week-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
        @media(min-width:600px){ .st-week-grid { grid-template-columns: repeat(4,1fr); } }
        @keyframes nutModalIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes nutFadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </ProtectedRoute>
  );
}
