'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs, limit,
  doc, getDoc, addDoc, setDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';

/* ══════════════════════════════════════════════════
   MOCK DATA  — affichés si Firestore est vide
══════════════════════════════════════════════════ */
const MOCK_CLIENTS = [
  { id: 'mc1', name: 'Sophie Martin',   userId: 'u1', goal: 'Perte de poids',  progress: 68, sessions: 24, weeks: 8,  initials: 'SM', color: 'linear-gradient(135deg,#9E1B1B,#b91c1c)' },
  { id: 'mc2', name: 'Lucas Dubois',    userId: 'u2', goal: 'Prise de masse',  progress: 45, sessions: 16, weeks: 5,  initials: 'LD', color: 'linear-gradient(135deg,#7a1212,#9E1B1B)' },
  { id: 'mc3', name: 'Emma Petit',      userId: 'u3', goal: 'Remise en forme', progress: 82, sessions: 31, weeks: 11, initials: 'EP', color: 'linear-gradient(135deg,#16a34a,#15803d)'  },
  { id: 'mc4', name: 'Thomas Bernard',  userId: 'u4', goal: 'Performance',     progress: 33, sessions: 9,  weeks: 3,  initials: 'TB', color: 'linear-gradient(135deg,#374151,#4B5563)' },
];
const MOCK_PROGRAMS = [
  { id: 'mp1', title: 'Force & Hypertrophie',       type: 'sport',     icon: '🏋️', weeks: 8,  spw: 4, desc: 'Musculation progressive sur les grands groupes musculaires' },
  { id: 'mp2', title: 'HIIT Brûle-graisses',         type: 'sport',     icon: '🔥', weeks: 4,  spw: 3, desc: 'Séances courtes et intenses pour maximiser la dépense calorique' },
  { id: 'mp3', title: 'Nutrition Optimale 12 sem.',  type: 'nutrition', icon: '🥗', weeks: 12, spw: 0, desc: 'Plan alimentaire complet avec macros et protocole de jeûne' },
];
const MOCK_NUTRITION = { calories: 2200, maintenanceCalories: 2650, protein: 165, carbs: 220, fat: 72, fastingType: '16/8', windowStart: '12:00', windowEnd: '20:00', notes: 'Favoriser les protéines le matin. Éviter les glucides raffinés après 19h.' };
const MOCK_MEALS = [
  { id: 'mm1', emoji: '🥚', name: 'Petit-déjeuner Protéiné', time: '12:00', description: 'Omelette 3 œufs · Avoine 60g · Fruits rouges · Café noir', calories: 520, protein: 38, carbs: 48, fat: 16 },
  { id: 'mm2', emoji: '🍗', name: 'Déjeuner Performance',     time: '15:00', description: 'Poulet 200g · Riz basmati 120g · Brocolis vapeur',          calories: 680, protein: 52, carbs: 72, fat: 18 },
  { id: 'mm3', emoji: '🥜', name: 'Collation Anabolique',     time: '17:30', description: 'Amandes 30g · Yaourt grec 0% · Banane',                     calories: 285, protein: 18, carbs: 26, fat: 12 },
  { id: 'mm4', emoji: '🥑', name: 'Dîner Légèreté',           time: '19:00', description: 'Saumon 180g · Patate douce · Salade · Avocat ¼',            calories: 615, protein: 45, carbs: 52, fat: 24 },
];
const MOCK_TIPS = [
  { id: 'mt1', category: 'lifestyle', title: 'Hydratation optimale',    content: 'Buvez 30-35ml d\'eau par kg de poids corporel par jour. Commencez chaque matin avec 500ml avant café ou thé.', createdAt: null },
  { id: 'mt2', category: 'training',  title: 'Progression des charges', content: 'Augmentez de 2.5kg toutes les 2-3 semaines sur les exercices composés. La progression linéaire est la clé.', createdAt: null },
  { id: 'mt3', category: 'nutrition', title: 'Fenêtre anabolique',       content: 'Consommez 25-40g de protéines dans les 30-60 min après l\'entraînement pour maximiser la synthèse musculaire.', createdAt: null },
  { id: 'mt4', category: 'mindset',   title: 'Qualité du sommeil',       content: 'Dormez 7-9h par nuit. La récupération musculaire se fait à 70% pendant le sommeil profond. Couchez-vous à heure fixe.', createdAt: null },
];
const MOCK_FEED = [
  { icon: '✅', text: 'Sophie Martin a terminé sa séance du lundi',       time: 'il y a 2h' },
  { icon: '📊', text: 'Lucas Dubois a atteint son objectif protéines',    time: 'il y a 4h' },
  { icon: '🏋️', text: 'Emma Petit a commencé sa 11ème semaine',           time: 'hier'      },
  { icon: '⚠️', text: 'Thomas Bernard n\'a pas connecté depuis 3 jours', time: 'il y a 2j' },
  { icon: '💡', text: 'Conseil publié : "Fenêtre anabolique"',            time: 'il y a 3j' },
];
const CHART_BARS = [
  { label: 'Lun', h: 55 }, { label: 'Mar', h: 90 }, { label: 'Mer', h: 68 },
  { label: 'Jeu', h: 100 },{ label: 'Ven', h: 78 }, { label: 'Sam', h: 42 }, { label: 'Dim', h: 28 },
];

/* ══ Constants ══ */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#9E1B1B,#b91c1c)',
  'linear-gradient(135deg,#7a1212,#9E1B1B)',
  'linear-gradient(135deg,#16a34a,#15803d)',
  'linear-gradient(135deg,#374151,#4B5563)',
  'linear-gradient(135deg,#1e1e1e,#2a2a2a)',
];
const FASTING_TYPES = [
  { val: 'none', label: 'Pas de jeûne' }, { val: '14/10', label: '14/10 — Débutant' },
  { val: '16/8',  label: '16/8 — Standard' }, { val: '18/6', label: '18/6 — Avancé' },
  { val: '20/4',  label: '20/4 — Expert' },
];
const TIP_CATEGORIES = [
  { val: 'nutrition', label: '🥗 Nutrition' }, { val: 'training', label: '🏋️ Entraînement' },
  { val: 'lifestyle', label: '🌿 Lifestyle' }, { val: 'mindset',  label: '🧠 Mindset' },
];
const CAT_ICON: Record<string, string> = { nutrition: '🥗', training: '🏋️', lifestyle: '🌿', mindset: '🧠' };
const MEAL_EMOJIS = ['🥚','🥗','🍗','🥩','🥑','🥜','🍌','🍎','🫐','🥤','🍽️','🥐','🍳','🥘','🥣','🍱','🥦','🌽'];

const defaultNutForm  = () => ({ calories: 2000, maintenanceCalories: 2500, protein: 150, carbs: 200, fat: 65, fastingType: '16/8', windowStart: '12:00', windowEnd: '20:00', notes: '' });
const defaultTipForm  = () => ({ title: '', category: 'lifestyle', content: '' });
const defaultMealForm = () => ({ emoji: '🍽️', name: '', time: '12:00', description: '', calories: 500, protein: 35, carbs: 55, fat: 15 });

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const greet    = () => { const h = new Date().getHours(); return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; };

/* ════════════════════════════════════════════════
   COACH HOME
════════════════════════════════════════════════ */
export default function CoachHome() {
  const router = useRouter();

  /* Auth */
  const [user, setUser]         = useState<import('firebase/auth').User | null>(null);
  const [userName, setUserName] = useState('');

  /* Firestore data */
  const [clients, setClients]               = useState<any[]>([]);
  const [programs, setPrograms]             = useState<any[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<any[]>([]);
  const [meals, setMeals]                   = useState<any[]>([]);
  const [tips, setTips]                     = useState<any[]>([]);

  /* UI */
  const [activeTab, setActiveTab] = useState<'overview'|'clients'|'nutrition'|'conseils'|'analyses'>('overview');
  const [selClient, setSelClient] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [mounted, setMounted]     = useState(false);
  const [clock, setClock]         = useState('');

  /* Forms */
  const [nutForm, setNutForm]       = useState(defaultNutForm());
  const [tipForm, setTipForm]       = useState(defaultTipForm());
  const [mealForm, setMealForm]     = useState(defaultMealForm());
  const [showNutForm, setShowNutForm]   = useState(false);
  const [showTipForm, setShowTipForm]   = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [savingNut, setSavingNut]   = useState(false);
  const [savingTip, setSavingTip]   = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [deletingMeal, setDeletingMeal] = useState('');

  /* Computed: real data or mock fallback */
  const displayClients  = clients.length  > 0 ? clients  : MOCK_CLIENTS;
  const displayPrograms = programs.length > 0 ? programs : MOCK_PROGRAMS;
  const displayTips     = tips.length     > 0 ? tips     : MOCK_TIPS;
  const selectedNutPlan = selClient ? nutritionPlans.find(n => n.clientId === selClient.userId) || null : null;
  const displayNutData  = selectedNutPlan || MOCK_NUTRITION;
  const displayMeals    = meals.length > 0
    ? meals.filter(m => !selClient || m.clientId === selClient.userId)
    : MOCK_MEALS;

  /* Deficit */
  const deficit   = (displayNutData.maintenanceCalories || 2500) - (displayNutData.calories || 2000);
  const weeklyKg  = (deficit * 7 / 7700).toFixed(2);
  const defColor  = deficit > 0 ? '#16a34a' : deficit < 0 ? '#f87171' : '#9CA3AF';

  /* Clock */
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setClock(n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
        setUserName(d.name || d.displayName || u.displayName || u.email?.split('@')[0] || 'Coach');
      } catch {
        setUserName(u.displayName || u.email?.split('@')[0] || 'Coach');
      }
    });
    return () => unsub();
  }, []);

  /* Fetch all */
  const fetchAll = useCallback(async (u = user) => {
    if (!u) return;
    setLoading(true);
    try {
      const cSnap = await getDocs(query(collection(db, 'clients'), where('coachId', '==', u.uid)));
      const clientData: any[] = [];
      for (const d of cSnap.docs) {
        const cd = d.data();
        let cName = cd.name || '';
        if (!cName && cd.clientUserId) {
          try {
            const uDoc = await getDoc(doc(db, 'users', cd.clientUserId));
            if (uDoc.exists()) cName = uDoc.data().name || uDoc.data().email || 'Client';
          } catch {}
        }
        clientData.push({ id: d.id, ...cd, name: cName, initials: initials(cName || 'C'), color: AVATAR_COLORS[clientData.length % AVATAR_COLORS.length] });
      }
      setClients(clientData);
      if (clientData.length > 0 && !selClient) setSelClient(clientData[0]);

      const pSnap = await getDocs(query(collection(db, 'programs'), where('coachId', '==', u.uid)));
      setPrograms(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const nSnap = await getDocs(query(collection(db, 'nutrition_assignments'), where('coachId', '==', u.uid)));
      setNutritionPlans(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const mSnap = await getDocs(query(collection(db, 'coach_meals'), where('coachId', '==', u.uid)));
      const mData = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      mData.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      setMeals(mData);

      const tSnap = await getDocs(query(collection(db, 'coach_tips'), where('coachId', '==', u.uid), limit(20)));
      const tData = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      tData.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTips(tData);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', 'Impossible de charger les données.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchAll(user); }, [user]);

  useEffect(() => {
    if (!selClient) return;
    const plan = nutritionPlans.find(n => n.clientId === selClient.userId);
    if (plan) {
      setNutForm({
        calories: plan.calories || 2000, maintenanceCalories: plan.maintenanceCalories || 2500,
        protein: plan.protein || 150, carbs: plan.carbs || 200, fat: plan.fat || 65,
        fastingType: plan.fastingType || '16/8', windowStart: plan.windowStart || '12:00',
        windowEnd: plan.windowEnd || '20:00', notes: plan.notes || '',
      });
    } else {
      setNutForm(defaultNutForm());
    }
  }, [selClient, nutritionPlans]);

  /* Handlers */
  const handleSaveNut = async () => {
    if (!user || !selClient) return;
    setSavingNut(true);
    try {
      await setDoc(doc(db, 'nutrition_assignments', `${user.uid}_${selClient.userId}`), {
        coachId: user.uid, clientId: selClient.userId, ...nutForm, updatedAt: Timestamp.now(),
      }, { merge: true });
      fireToast('✅', 'Sauvegardé', `Plan nutritionnel de ${selClient.name} mis à jour.`);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible de sauvegarder.'); }
    setSavingNut(false);
  };

  const handleAddTip = async () => {
    if (!user || !tipForm.title || !tipForm.content) return;
    setSavingTip(true);
    try {
      await addDoc(collection(db, 'coach_tips'), { coachId: user.uid, ...tipForm, createdAt: Timestamp.now() });
      fireToast('💡', 'Conseil ajouté', tipForm.title);
      setTipForm(defaultTipForm());
      setShowTipForm(false);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible d\'ajouter le conseil.'); }
    setSavingTip(false);
  };

  const handleAddMeal = async () => {
    if (!user || !selClient || !mealForm.name) return;
    setSavingMeal(true);
    try {
      await addDoc(collection(db, 'coach_meals'), {
        coachId: user.uid, clientId: selClient.userId, clientName: selClient.name,
        ...mealForm, createdAt: Timestamp.now(),
      });
      fireToast('🍽️', 'Repas ajouté', mealForm.name);
      setMealForm(defaultMealForm());
      setShowMealForm(false);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible d\'ajouter le repas.'); }
    setSavingMeal(false);
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return;
    setDeletingMeal(mealId);
    try {
      await deleteDoc(doc(db, 'coach_meals', mealId));
      fireToast('🗑️', 'Repas supprimé', '');
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible de supprimer.'); }
    setDeletingMeal('');
  };

  const handleSignOut = async () => { await signOut(auth); router.push('/login'); };

  /* ── Inline helpers ── */
  const Spin = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: '.73rem', color: '#9CA3AF' }}>Chargement…</p>
    </div>
  );

  const NInput = ({ label, type='number', val, set, min, max }: any) => (
    <div className="fld">
      <label>{label}</label>
      <input type={type} value={val} min={min} max={max} onChange={e => set(type==='number'?Number(e.target.value):e.target.value)} />
    </div>
  );

  /* ════════════════════ TABS ════════════════════ */
  const TABS = [
    { key: 'overview',   icon: '🏠', label: 'Vue d\'ensemble' },
    { key: 'clients',    icon: '👥', label: 'Membres' },
    { key: 'nutrition',  icon: '🥗', label: 'Nutrition'  },
    { key: 'conseils',   icon: '💡', label: 'Conseils'   },
    { key: 'analyses',   icon: '📈', label: 'Analyses'   },
  ] as const;

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
    <ProtectedRoute role="coach">
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
            <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '.06em', cursor: 'pointer', textTransform: 'uppercase' }} onClick={() => router.push('/')}>
              SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(178,42,39,0.15)', borderRadius: 4, padding: '4px 12px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#e3beb8' }}>🏆 Coach</div>
              <span style={{ fontSize: '.72rem', color: '#9CA3AF' }}>{userName || user?.email}</span>
              <button style={S.ghostBtn} onClick={() => router.push('/coach')}>Dashboard →</button>
              <button style={{ ...S.ghostBtn, borderColor: 'rgba(255,255,255,0.06)', color: '#6B7280' }} onClick={handleSignOut}>Déconnexion</button>
            </div>
          </header>

          {/* ══ HERO ══ */}
          <section style={{ position: 'relative', height: 'clamp(400px,52vh,660px)', overflow: 'hidden' }}>
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.3) saturate(0.8)' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.95) 0%, rgba(19,19,19,0.6) 55%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, #131313, transparent)' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #b22a27, #89070e, transparent)' }} />
            <div style={{
              position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              padding: 'clamp(24px,5vw,60px)', maxWidth: 1200, margin: '0 auto',
              opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(28px)', transition: 'opacity .65s ease, transform .65s ease',
            }}>
              <span style={S.tag}>{greet()}, {userName || 'Coach'} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(2.6rem,6.5vw,5.2rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .88, marginBottom: 18, color: '#e5e2e1' }}>
                VOTRE TABLEAU<br /><span style={{ color: '#b22a27' }}>DE BORD.</span>
              </h1>
              <p style={{ fontSize: 'clamp(.85rem,1.5vw,.98rem)', color: '#9CA3AF', marginBottom: 26, maxWidth: 500, lineHeight: 1.8 }}>
                {loading ? 'Chargement de vos données…' : `${displayClients.length} membre${displayClients.length !== 1 ? 's' : ''} · ${displayPrograms.length} programme${displayPrograms.length !== 1 ? 's' : ''} · ${displayTips.length} conseil${displayTips.length !== 1 ? 's' : ''}`}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button style={{ ...S.gradBtn, padding: '14px 32px', fontSize: '.78rem' }} onClick={() => router.push('/coach')}>Dashboard complet →</button>
                <button style={{ background: 'transparent', color: '#e3beb8', border: '1px solid rgba(227,190,184,0.2)', borderRadius: 6, padding: '14px 24px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => setActiveTab('clients')}>
                  Voir mes membres ↓
                </button>
              </div>
            </div>
          </section>

          {/* ══ KPI ROW ══ */}
          <section style={{ background: '#1c1b1b', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: mounted ? 1 : 0, transition: 'opacity .5s ease .1s' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }} className="kpi-row">
              {[
                { icon: '👥', label: 'Membres actifs',   val: loading ? '—' : displayClients.length,  sub: '+2 ce mois' },
                { icon: '📋', label: 'Programmes',        val: loading ? '—' : displayPrograms.length, sub: '+1 ce mois' },
                { icon: '📊', label: 'Progression moy.',  val: `${Math.round(displayClients.reduce((a: number, c: any) => a + (c.progress || 0), 0) / Math.max(displayClients.length, 1))}%`, sub: 'ensemble membres' },
                { icon: '💡', label: 'Conseils publiés',  val: loading ? '—' : displayTips.length,    sub: 'disponibles' },
              ].map((k, i) => (
                <div key={k.label} style={{ padding: '26px 28px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ ...S.label, marginBottom: 8 }}>{k.icon} {k.label}</div>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: '.62rem', color: '#9CA3AF', marginTop: 6 }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ══ MAIN CONTENT ══ */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(24px,4vw,56px) clamp(16px,4vw,48px) 80px', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity .5s ease .2s, transform .5s ease .2s' }}>

            {/* ── APP SHELL ── */}
            <div style={{ background: '#1c1b1b', borderRadius: 14, overflow: 'hidden', marginBottom: 56 }}>

              {/* Titlebar */}
              <div style={{ background: '#161515', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#e5e2e1' }}>
                    SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
                    <span style={{ fontSize: '.6rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', fontWeight: 400, marginLeft: 10, letterSpacing: '.03em', textTransform: 'none' }}>— Coach Dashboard</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '.65rem', color: '#9CA3AF' }}>🕐 {clock}</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#89070e,#b22a27)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.58rem', fontWeight: 700, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif' }}>
                    {initials(userName || 'Co')}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                    padding: '13px 18px', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.66rem', letterSpacing: '.1em', textTransform: 'uppercase',
                    color: activeTab === t.key ? '#e5e2e1' : '#6B7280',
                    borderBottom: activeTab === t.key ? '2px solid #b22a27' : '2px solid transparent',
                    transition: 'all .2s ease', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {t.icon} {t.label}
                    {t.key === 'clients' && <span style={{ background: '#b22a27', color: '#e5e2e1', borderRadius: 10, padding: '1px 6px', fontSize: '.52rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>{displayClients.length}</span>}
                    {t.key === 'conseils' && displayTips.length > 0 && <span style={{ background: 'rgba(178,42,39,0.3)', color: '#e3beb8', borderRadius: 10, padding: '1px 6px', fontSize: '.52rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>{displayTips.length}</span>}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              <div style={{ padding: '26px 24px', minHeight: 460 }}>

                {/* ── OVERVIEW ── */}
                {activeTab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 26 }}>
                      {[
                        { icon: '👥', label: 'Total membres',     val: displayClients.length,  change: '+2 ce mois', up: true },
                        { icon: '📋', label: 'Programmes actifs', val: displayPrograms.length, change: '+1 ce mois', up: true },
                        { icon: '📊', label: 'Taux rétention',    val: '89%',                   change: '+3%', up: true },
                        { icon: '⏱️', label: 'Durée moy. suivi',  val: '7 sem.',               change: 'Stable', up: false },
                      ].map(k => (
                        <div key={k.label} style={S.card}>
                          <div style={{ ...S.label, marginBottom: 8 }}>{k.icon} {k.label}</div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, marginBottom: 6 }}>{loading ? '—' : k.val}</div>
                          <div style={{ fontSize: '.62rem', color: k.up ? '#16a34a' : '#9CA3AF' }}>{k.change}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }} className="ov-grid">
                      <div>
                        <div style={{ ...S.label, marginBottom: 14 }}>Progression membres</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {loading ? <Spin /> : displayClients.map((c: any, i: number) => (
                            <div key={c.id} onClick={() => { setSelClient(c); setActiveTab('nutrition'); }}
                              style={{ background: '#2a2a2a', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background .2s', animationDelay: `${i * 60}ms` }}
                            >
                              <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.68rem', fontWeight: 700, color: '#131313', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>
                                {c.initials || initials(c.name || 'C')}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem' }}>{c.name}</span>
                                  {c.goal && <span style={S.badge}>{c.goal}</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.4s ease' }} />
                                  </div>
                                  <span style={{ fontFamily: 'Lexend, sans-serif', fontSize: '.72rem', fontWeight: 700, color: '#b22a27', minWidth: 32, textAlign: 'right' }}>{c.progress || 0}%</span>
                                </div>
                              </div>
                              <span style={{ color: '#6B7280' }}>→</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ ...S.label, marginBottom: 14 }}>Activité récente</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {MOCK_FEED.map((f, i) => (
                            <div key={i} style={{ background: '#2a2a2a', borderRadius: 8, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{f.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '.76rem', color: '#e5e2e1', lineHeight: 1.5 }}>{f.text}</div>
                                <div style={{ fontSize: '.6rem', color: '#6B7280', marginTop: 3 }}>{f.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CLIENTS ── */}
                {activeTab === 'clients' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                      <div style={S.label}>{displayClients.length} membre{displayClients.length !== 1 ? 's' : ''} suivis</div>
                      <button style={S.gradBtn} onClick={() => router.push('/coach')}>+ Ajouter un membre →</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                      {loading ? <Spin /> : displayClients.map((c: any, i: number) => (
                        <div key={c.id} onClick={() => { setSelClient(c); setActiveTab('nutrition'); }}
                          style={{ background: '#2a2a2a', borderRadius: 12, padding: '20px', cursor: 'pointer', transition: 'background .2s' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.76rem', fontWeight: 700, color: '#131313', fontFamily: 'Lexend, sans-serif' }}>
                              {c.initials || initials(c.name || 'C')}
                            </div>
                            <span style={{ ...S.badge, background: c.status === 'online' ? 'rgba(22,163,74,0.15)' : undefined, color: c.status === 'online' ? '#16a34a' : undefined }}>
                              {c.status === 'online' ? '● Actif' : '○ Hors ligne'}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em', marginBottom: 3 }}>{c.name}</div>
                          <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginBottom: 14 }}>{c.goal || 'Coaching personnalisé'}</div>
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={S.label}>Progression</span>
                              <span style={{ fontSize: '.72rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27' }}>{c.progress || 0}%</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.4s ease' }} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                            {[{ val: c.sessions || '—', label: 'Séances' }, { val: c.weeks || '—', label: 'Semaines' }, { val: `${c.progress || 0}%`, label: 'Taux' }].map(s => (
                              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '7px', textAlign: 'center' }}>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.88rem', color: '#e5e2e1' }}>{s.val}</div>
                                <div style={{ fontSize: '.52rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 1 }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 7 }}>
                            <button style={{ flex: 1, background: 'rgba(178,42,39,0.1)', border: 'none', borderRadius: 6, padding: '8px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#e3beb8', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setSelClient(c); setActiveTab('nutrition'); }}>🥗 Nutrition</button>
                            <button style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 6, padding: '8px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9CA3AF', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); router.push('/coach'); }}>📋 Programmes</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <button style={S.ghostBtn} onClick={() => router.push('/coach')}>Gérer tous les membres dans le dashboard →</button>
                    </div>
                  </div>
                )}

                {/* ── NUTRITION ── */}
                {activeTab === 'nutrition' && (
                  <div>
                    {/* Member selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                      <span style={S.label}>Membre :</span>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {displayClients.map((c: any) => (
                          <button key={c.id} onClick={() => setSelClient(c)} style={{
                            padding: '7px 13px', borderRadius: 6, fontSize: '.74rem', cursor: 'pointer', transition: 'all .2s ease',
                            border: `1px solid ${selClient?.id === c.id ? 'rgba(178,42,39,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            background: selClient?.id === c.id ? 'rgba(178,42,39,0.1)' : '#2a2a2a',
                            color: selClient?.id === c.id ? '#e3beb8' : '#9CA3AF',
                            fontFamily: 'Lexend, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7,
                          }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem', fontWeight: 700, color: '#131313', fontFamily: 'Lexend, sans-serif' }}>{c.initials || initials(c.name || 'C')}</span>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fasting widget */}
                    <div style={{ background: '#2a2a2a', borderRadius: 10, padding: '18px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', minWidth: 75 }}>{displayNutData.fastingType || '—'}</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', marginBottom: 5 }}>Jeûne Intermittent {displayNutData.fastingType || 'Non défini'}</h4>
                        <p style={{ fontSize: '.76rem', color: '#9CA3AF', marginBottom: 10 }}>Fenêtre : <strong style={{ color: '#e3beb8' }}>{displayNutData.windowStart} – {displayNutData.windowEnd}</strong> · Membre : <strong style={{ color: '#e5e2e1' }}>{selClient?.name || 'Aucun sélectionné'}</strong></p>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '45%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10 }} />
                        </div>
                      </div>
                    </div>

                    {/* Macro cards */}
                    <div className="macro-grid" style={{ marginBottom: 14 }}>
                      {[
                        { icon: '🔥', label: 'Objectif calorique', val: displayNutData.calories?.toLocaleString('fr-FR'), unit: 'kcal/j', pct: 100 },
                        { icon: '🥩', label: 'Protéines', val: displayNutData.protein, unit: 'g', pct: Math.round(((displayNutData.protein || 0) * 4 / (displayNutData.calories || 2000)) * 100) },
                        { icon: '🌾', label: 'Glucides',  val: displayNutData.carbs,   unit: 'g', pct: Math.round(((displayNutData.carbs || 0) * 4 / (displayNutData.calories || 2000)) * 100) },
                        { icon: '🥑', label: 'Lipides',   val: displayNutData.fat,     unit: 'g', pct: Math.round(((displayNutData.fat || 0) * 9 / (displayNutData.calories || 2000)) * 100) },
                      ].map(m => (
                        <div key={m.label} style={{ background: '#2a2a2a', borderRadius: 8, padding: '16px' }}>
                          <div style={{ fontSize: '1.2rem', marginBottom: 7 }}>{m.icon}</div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.45rem', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1 }}>{m.val}</div>
                          <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2, marginBottom: 8 }}>{m.unit} · {m.label}</div>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(m.pct, 100)}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10 }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Deficit banner */}
                    <div style={{ background: deficit > 0 ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)', borderRadius: 10, padding: '16px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ ...S.label, marginBottom: 5 }}>{deficit > 0 ? 'Déficit calorique' : 'Surplus calorique'}</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, letterSpacing: '-.04em', color: defColor, lineHeight: 1 }}>
                          {deficit > 0 ? `−${deficit}` : `+${Math.abs(deficit)}`} kcal
                        </div>
                        <div style={{ fontSize: '.68rem', color: '#9CA3AF', marginTop: 5 }}>Maintenance {(displayNutData.maintenanceCalories || 2500).toLocaleString('fr-FR')} → Objectif {(displayNutData.calories || 2000).toLocaleString('fr-FR')} kcal</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ ...S.label, marginBottom: 4 }}>Estimation / semaine</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-.04em', color: defColor }}>{deficit > 0 ? '−' : '+'}{Math.abs(parseFloat(weeklyKg))} kg</div>
                      </div>
                    </div>

                    {/* Meals section */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={S.label}>Plan repas — {selClient?.name || 'Exemple'}</div>
                      <button style={S.ghostBtn} onClick={() => setShowMealForm(f => !f)}>
                        {showMealForm ? '✕ Annuler' : '+ Ajouter un repas'}
                      </button>
                    </div>

                    {showMealForm && (
                      <div style={{ background: '#2a2a2a', borderRadius: 10, padding: '18px', marginBottom: 14 }}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ ...S.label, marginBottom: 8 }}>Emoji</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {MEAL_EMOJIS.map(em => (
                              <span key={em} onClick={() => setMealForm(f => ({ ...f, emoji: em }))}
                                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${mealForm.emoji === em ? 'rgba(178,42,39,0.5)' : 'rgba(255,255,255,0.06)'}`, background: mealForm.emoji === em ? 'rgba(178,42,39,0.12)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '1rem' }}>
                                {em}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="form-row">
                          <NInput label="Nom du repas" type="text" val={mealForm.name} set={(v: string) => setMealForm(f => ({ ...f, name: v }))} />
                          <NInput label="Heure" type="time" val={mealForm.time} set={(v: string) => setMealForm(f => ({ ...f, time: v }))} />
                        </div>
                        <div className="fld" style={{ marginBottom: 10 }}>
                          <label>Description / aliments</label>
                          <textarea rows={2} value={mealForm.description} onChange={e => setMealForm(f => ({ ...f, description: e.target.value }))} placeholder="Poulet 200g · Riz 120g · Légumes" />
                        </div>
                        <div className="form-row">
                          <NInput label="Calories (kcal)" val={mealForm.calories} set={(v: number) => setMealForm(f => ({ ...f, calories: v }))} min={0} />
                          <NInput label="Protéines (g)"   val={mealForm.protein}  set={(v: number) => setMealForm(f => ({ ...f, protein: v }))}  min={0} />
                          <NInput label="Glucides (g)"    val={mealForm.carbs}    set={(v: number) => setMealForm(f => ({ ...f, carbs: v }))}    min={0} />
                          <NInput label="Lipides (g)"     val={mealForm.fat}      set={(v: number) => setMealForm(f => ({ ...f, fat: v }))}      min={0} />
                        </div>
                        <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 6, opacity: savingMeal || !mealForm.name ? .55 : 1 }} onClick={handleAddMeal} disabled={savingMeal || !mealForm.name}>
                          {savingMeal ? <><span className="spin-sm" /> Ajout…</> : `Ajouter pour ${selClient?.name || 'membre'} →`}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {displayMeals.map((m: any, i: number) => (
                        <div key={m.id} style={{ background: '#2a2a2a', borderRadius: 8, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{m.emoji || '🍽️'}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>{m.name}</div>
                            {m.description && <div style={{ fontSize: '.7rem', color: '#9CA3AF', marginBottom: 5 }}>{m.description}</div>}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {m.calories && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🔥 <strong>{m.calories}</strong> kcal</span>}
                              {m.protein  && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🥩 <strong>{m.protein}g</strong></span>}
                              {m.carbs    && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🌾 <strong>{m.carbs}g</strong></span>}
                              {m.fat      && <span style={{ fontSize: '.64rem', color: '#e3beb8' }}>🥑 <strong>{m.fat}g</strong></span>}
                            </div>
                          </div>
                          {m.time && <div style={{ fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 700, flexShrink: 0 }}>{m.time}</div>}
                          {!m.id.startsWith('mm') && (
                            <button style={{ background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} disabled={deletingMeal === m.id} onClick={() => handleDeleteMeal(m.id)}>
                              {deletingMeal === m.id ? <span className="spin-sm" /> : '🗑️'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Nutrition plan form */}
                    <div style={{ background: '#2a2a2a', borderRadius: 10, padding: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: showNutForm ? 16 : 0 }} onClick={() => setShowNutForm(f => !f)}>
                        <span style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(178,42,39,0.1)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</span>
                        <div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.84rem' }}>Modifier le plan nutritionnel</div>
                          <div style={{ fontSize: '.68rem', color: '#9CA3AF' }}>Calories, macros, jeûne, fenêtre alimentaire</div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: '#9CA3AF', transition: 'transform .2s ease', transform: showNutForm ? 'rotate(180deg)' : 'none' }}>▼</span>
                      </div>
                      {showNutForm && (
                        <div>
                          <div className="form-row">
                            <NInput label="Calories objectif"    val={nutForm.calories}            set={(v: number) => setNutForm(f => ({ ...f, calories: v }))}            min={1000} max={6000} />
                            <NInput label="Calories maintenance" val={nutForm.maintenanceCalories} set={(v: number) => setNutForm(f => ({ ...f, maintenanceCalories: v }))} min={1000} max={6000} />
                          </div>
                          <div className="form-row">
                            <NInput label="Protéines (g)" val={nutForm.protein} set={(v: number) => setNutForm(f => ({ ...f, protein: v }))} min={0} />
                            <NInput label="Glucides (g)"  val={nutForm.carbs}   set={(v: number) => setNutForm(f => ({ ...f, carbs: v }))}   min={0} />
                            <NInput label="Lipides (g)"   val={nutForm.fat}     set={(v: number) => setNutForm(f => ({ ...f, fat: v }))}     min={0} />
                          </div>
                          <div className="form-row" style={{ marginBottom: 10 }}>
                            <div className="fld">
                              <label>Type de jeûne</label>
                              <select value={nutForm.fastingType} onChange={e => setNutForm(f => ({ ...f, fastingType: e.target.value }))}>
                                {FASTING_TYPES.map(ft => <option key={ft.val} value={ft.val}>{ft.label}</option>)}
                              </select>
                            </div>
                            <NInput label="Début fenêtre" type="time" val={nutForm.windowStart} set={(v: string) => setNutForm(f => ({ ...f, windowStart: v }))} />
                            <NInput label="Fin fenêtre"   type="time" val={nutForm.windowEnd}   set={(v: string) => setNutForm(f => ({ ...f, windowEnd: v }))}   />
                          </div>
                          <div className="fld" style={{ marginBottom: 14 }}>
                            <label>Notes pour le membre</label>
                            <textarea rows={3} value={nutForm.notes} onChange={e => setNutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Conseils alimentaires spécifiques…" />
                          </div>
                          <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 6, opacity: savingNut || !selClient ? .55 : 1 }} onClick={handleSaveNut} disabled={savingNut || !selClient}>
                            {savingNut ? <><span className="spin-sm" /> Sauvegarde…</> : `Sauvegarder pour ${selClient?.name || 'le membre'} →`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── CONSEILS ── */}
                {activeTab === 'conseils' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                      <div style={S.label}>{displayTips.length} conseil{displayTips.length !== 1 ? 's' : ''} publiés</div>
                      <button style={S.ghostBtn} onClick={() => setShowTipForm(f => !f)}>
                        {showTipForm ? '✕ Annuler' : '+ Nouveau conseil'}
                      </button>
                    </div>

                    {showTipForm && (
                      <div style={{ background: '#2a2a2a', borderRadius: 10, padding: '18px', marginBottom: 18 }}>
                        <div className="form-row" style={{ marginBottom: 10 }}>
                          <NInput label="Titre du conseil" type="text" val={tipForm.title} set={(v: string) => setTipForm(f => ({ ...f, title: v }))} />
                          <div className="fld">
                            <label>Catégorie</label>
                            <select value={tipForm.category} onChange={e => setTipForm(f => ({ ...f, category: e.target.value }))}>
                              {TIP_CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="fld" style={{ marginBottom: 12 }}>
                          <label>Contenu du conseil</label>
                          <textarea rows={4} value={tipForm.content} onChange={e => setTipForm(f => ({ ...f, content: e.target.value }))} placeholder="Rédigez votre conseil…" />
                        </div>
                        <button style={{ ...S.gradBtn, opacity: savingTip || !tipForm.title || !tipForm.content ? .55 : 1 }} onClick={handleAddTip} disabled={savingTip || !tipForm.title || !tipForm.content}>
                          {savingTip ? <><span className="spin-sm" /> Publication…</> : 'Publier ce conseil →'}
                        </button>
                      </div>
                    )}

                    {displayTips.length > 0 && (
                      <div style={{ background: 'linear-gradient(135deg,rgba(137,7,14,0.12),rgba(20,18,18,0.95))', borderRadius: 12, padding: '22px', marginBottom: 20, borderLeft: '3px solid #b22a27' }}>
                        <div style={{ fontSize: '2.5rem', color: 'rgba(178,42,39,0.35)', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 6 }}>"</div>
                        <div style={{ ...S.label, color: '#b22a27', marginBottom: 10 }}>{CAT_ICON[displayTips[0].category] || '💡'} {displayTips[0].category} — Dernier conseil</div>
                        <p style={{ fontSize: '.9rem', color: '#e5e2e1', lineHeight: 1.8, marginBottom: 10 }}>{displayTips[0].content}</p>
                        <div style={{ fontSize: '.7rem', color: '#9CA3AF' }}>— {displayTips[0].title} · <span style={{ color: '#b22a27' }}>{userName || 'Votre coach'}</span></div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                      {displayTips.map((t: any, i: number) => (
                        <div key={t.id} style={{ background: '#2a2a2a', borderRadius: 10, padding: '18px' }}>
                          <div style={{ fontSize: '1.4rem', marginBottom: 9 }}>{CAT_ICON[t.category] || '💡'}</div>
                          <h4 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', letterSpacing: '-.02em', marginBottom: 7, color: '#e5e2e1' }}>{t.title}</h4>
                          <p style={{ fontSize: '.78rem', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 10 }}>{t.content}</p>
                          <span style={S.badge}>{TIP_CATEGORIES.find(c => c.val === t.category)?.label || t.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── ANALYSES ── */}
                {activeTab === 'analyses' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 12, marginBottom: 22 }}>
                      {[
                        { label: 'Total membres',       val: displayClients.length,       sub: 'actifs' },
                        { label: 'Taux de rétention',   val: '89%',                        sub: '+3% vs mois dernier' },
                        { label: 'Durée moy. coaching', val: '7,2 sem.',                  sub: 'par membre' },
                        { label: 'Séances cette sem.',  val: '24',                        sub: '↑ vs sem. passée' },
                        { label: 'Conseils publiés',    val: displayTips.length,          sub: 'total' },
                        { label: 'Plans nutrition',     val: nutritionPlans.length || 4,  sub: 'actifs' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#2a2a2a', borderRadius: 8, padding: '16px' }}>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,2.8vw,2rem)', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, marginBottom: 5 }}>{s.val}</div>
                          <div style={S.label}>{s.label}</div>
                          <div style={{ fontSize: '.58rem', color: '#9CA3AF', marginTop: 3, opacity: .75 }}>{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: '#2a2a2a', borderRadius: 12, padding: '20px', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>📊 Séances par jour — Cette semaine</div>
                          <div style={{ fontSize: '.66rem', color: '#9CA3AF' }}>Total : 45 séances · Moy. : 6.4/jour</div>
                        </div>
                        <span style={{ ...S.badge, background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>+12% vs sem. passée</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
                        {CHART_BARS.map((b, i) => (
                          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ width: '100%', background: 'linear-gradient(to top,#89070e,#b22a27)', borderRadius: '4px 4px 0 0', height: `${b.h}%`, transition: 'height 1s ease' }} />
                            <div style={{ fontSize: '.58rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{b.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: '#2a2a2a', borderRadius: 12, padding: '20px', marginBottom: 14 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 14, color: '#e5e2e1' }}>👥 Progression par membre</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {displayClients.map((c: any) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.58rem', fontWeight: 700, color: '#131313', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>{c.initials || initials(c.name || 'C')}</div>
                            <div style={{ width: 96, fontSize: '.76rem', fontFamily: 'Lexend, sans-serif', fontWeight: 600, flexShrink: 0 }}>{c.name}</div>
                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.5s ease' }} />
                            </div>
                            <span style={{ fontSize: '.7rem', color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{c.progress || 0}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 16px', fontSize: '.73rem', color: '#9CA3AF', textAlign: 'center', borderLeft: '2px solid rgba(178,42,39,0.3)' }}>
                      <span style={{ color: '#b22a27' }}>📈 Prochainement :</span> Graphiques de revenus, taux d&apos;adhérence, comparaisons mensuelles, exports PDF.
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ══ MES MEMBRES ══ */}
            <section style={{ marginBottom: 60 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
                <div>
                  <span style={S.tag}>👥 Suivi membres</span>
                  <h2 style={S.sectionTitle}>MES <span style={{ color: '#b22a27' }}>MEMBRES.</span></h2>
                </div>
                <button style={S.ghostBtn} onClick={() => setActiveTab('clients')}>Voir tous →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayClients.slice(0, 4).map((c: any, i: number) => (
                  <div key={c.id} onClick={() => { setSelClient(c); setActiveTab('nutrition'); }}
                    style={{ background: '#1c1b1b', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background .2s' }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', fontWeight: 900, color: '#131313', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>
                      {c.initials || initials(c.name || 'C')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.92rem', letterSpacing: '-.02em' }}>{c.name}</span>
                        {c.goal && <span style={S.badge}>{c.goal}</span>}
                        {c.sessions && <span style={S.badge}>⚡ {c.sessions} séances</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.4s ease' }} />
                        </div>
                        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: '#b22a27', flexShrink: 0 }}>{c.progress || 0}%</span>
                      </div>
                    </div>
                    <span style={{ color: '#6B7280' }}>→</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ PROGRAMMES RÉCENTS ══ */}
            <section style={{ marginBottom: 60 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
                <div>
                  <span style={S.tag}>📋 Bibliothèque</span>
                  <h2 style={S.sectionTitle}>PROGRAMMES <span style={{ color: '#b22a27' }}>RÉCENTS.</span></h2>
                </div>
                <button style={S.ghostBtn} onClick={() => router.push('/coach')}>Dashboard →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="prog-grid">
                {displayPrograms.slice(0, 2).map((p: any, i: number) => (
                  <div key={p.id} onClick={() => router.push('/coach')}
                    style={{ position: 'relative', background: '#1c1b1b', borderRadius: 12, padding: '24px 20px', cursor: 'pointer', overflow: 'hidden', minHeight: 155, transition: 'background .2s' }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(to bottom,#b22a27,transparent)' }} />
                    <div style={{ fontSize: '1.9rem', marginBottom: 10 }}>{p.icon || '📋'}</div>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(.95rem,2.5vw,1.2rem)', letterSpacing: '-.03em', lineHeight: 1.1, marginBottom: 7, color: '#e5e2e1' }}>{p.title}</div>
                    <p style={{ fontSize: '.73rem', color: '#9CA3AF', lineHeight: 1.65, marginBottom: 12 }}>{p.desc || 'Programme d\'entraînement personnalisé'}</p>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ ...S.badge, background: 'rgba(178,42,39,0.1)', color: '#e3beb8' }}>{p.weeks}sem</span>
                      {p.spw > 0 && <span style={S.badge}>{p.spw}x/sem</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ CTA ══ */}
            <div style={{ background: 'linear-gradient(135deg,#89070e 0%,#0e0e0e 100%)', borderRadius: 16, padding: 'clamp(30px,5vw,52px)', textAlign: 'center' }}>
              <span style={{ ...S.tag, color: '#e3beb8', display: 'inline-block', marginBottom: 16 }}>⚡ Dashboard Complet</span>
              <h2 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.6rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .92, marginBottom: 16, color: '#e5e2e1' }}>
                GÉREZ TOUT DEPUIS<br />VOTRE DASHBOARD.
              </h2>
              <p style={{ fontSize: 'clamp(.82rem,1.4vw,.94rem)', color: 'rgba(227,190,184,.8)', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.8 }}>
                Créez des programmes, assignez des membres, gérez les abonnements et accédez à toutes les fonctionnalités avancées.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={{ background: 'rgba(229,226,225,0.14)', backdropFilter: 'blur(10px)', border: '1px solid rgba(229,226,225,0.2)', borderRadius: 6, padding: '14px 36px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#e5e2e1', cursor: 'pointer' }} onClick={() => router.push('/coach')}>
                  🏆 Ouvrir le dashboard →
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
          .sf-page-root input, .sf-page-root textarea, .sf-page-root select {
            font-family: 'Inter', sans-serif !important; color: #e5e2e1 !important;
            background: #353534 !important; border: 1px solid rgba(255,255,255,0.07) !important;
            border-radius: 7px !important; padding: 9px 12px !important; width: 100%; outline: none !important; font-size: .84rem !important;
          }
          .sf-page-root input:focus, .sf-page-root textarea:focus, .sf-page-root select:focus {
            border-color: rgba(178,42,39,0.5) !important; box-shadow: 0 0 0 3px rgba(178,42,39,0.09) !important;
          }
          .sf-page-root select option { background: #2a2a2a; color: #e5e2e1; }
          .fld { display: flex; flex-direction: column; gap: 6px; }
          .fld label { font-family: 'Inter', sans-serif !important; font-size: .58rem !important; font-weight: 600 !important; letter-spacing: .14em !important; text-transform: uppercase !important; color: #9CA3AF !important; }
          .form-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 10px; margin-bottom: 10px; }
          .macro-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
          .spin-sm { width:13px; height:13px; border:2px solid rgba(255,255,255,.07); border-top-color:#b22a27; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; flex-shrink:0; vertical-align:middle; }
          @keyframes spin { to { transform:rotate(360deg); } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
          .ov-grid { grid-template-columns: 1fr 300px !important; }
          .kpi-row { grid-template-columns: repeat(4,1fr) !important; }
          @media(max-width:960px) {
            .ov-grid { grid-template-columns: 1fr !important; }
            .kpi-row { grid-template-columns: repeat(2,1fr) !important; }
            .prog-grid { grid-template-columns: 1fr !important; }
          }
          @media(max-width:600px) {
            .macro-grid { grid-template-columns: 1fr 1fr !important; }
            .form-row { grid-template-columns: 1fr !important; }
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
