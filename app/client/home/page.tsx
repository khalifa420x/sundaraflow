'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs,
  doc, getDoc, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';

/* ══════════════════════════════════════════════════
   MOCK DATA  — affichés si Firestore est vide
══════════════════════════════════════════════════ */
const MOCK_PROGRAMS = [
  { id: 'mp1', title: 'Force & Hypertrophie', type: 'sport', assignedAt: null, coachName: 'Thomas Martin', progress: 45, days: 18 },
  { id: 'mp2', title: 'HIIT Brûle-graisses',  type: 'sport', assignedAt: null, coachName: 'Thomas Martin', progress: 0,  days: 0  },
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
  const [user, setUser]         = useState<User | null>(null);
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
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

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
  const fetchAll = async (u: User | null = user) => {
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
      {/* … Le reste de ton JSX est inchangé … */}
    </ProtectedRoute>
  );
}