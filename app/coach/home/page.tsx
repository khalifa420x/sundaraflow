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
import CalorieCalculator from '@/components/CalorieCalculator';
import Sidebar from '@/components/Sidebar';

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
  { id: 'mp1', title: 'Force & Hypertrophie',       type: 'sport',     icon: '🏋️', weeks: 8,  spw: 4, clients: 42, desc: 'Musculation progressive sur les grands groupes musculaires', trend: '+8.2% popularité' },
  { id: 'mp2', title: 'HIIT Brûle-graisses',         type: 'sport',     icon: '🔥', weeks: 4,  spw: 3, clients: 31, desc: 'Séances courtes et intenses pour maximiser la dépense calorique', trend: 'Stable' },
  { id: 'mp3', title: 'Nutrition Optimale 12 sem.',  type: 'nutrition', icon: '🥗', weeks: 12, spw: 0, clients: 75, desc: 'Plan alimentaire complet avec macros et protocole de jeûne', trend: '🔥 Programme phare' },
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
  { initials: 'SM', name: 'Sophie Martin', action: 'a terminé sa séance du lundi',   program: 'Force & Hypertrophie', time: 'il y a 2h',  color: 'linear-gradient(135deg,#9E1B1B,#b91c1c)' },
  { initials: 'LD', name: 'Lucas Dubois',  action: 'a atteint son objectif protéines', program: 'Nutrition Optimale',   time: 'il y a 4h',  color: 'linear-gradient(135deg,#7a1212,#9E1B1B)' },
  { initials: 'EP', name: 'Emma Petit',    action: 'a commencé sa 11ème semaine',     program: 'HIIT Brûle-graisses',  time: 'hier',       color: 'linear-gradient(135deg,#16a34a,#15803d)' },
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
  const [showCalcModal, setShowCalcModal] = useState(false);

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

  /* Computed */
  const displayClients  = clients.length  > 0 ? clients  : MOCK_CLIENTS;
  const displayPrograms = programs.length > 0 ? programs : MOCK_PROGRAMS;
  const displayTips     = tips.length     > 0 ? tips     : MOCK_TIPS;
  const selectedNutPlan = selClient ? nutritionPlans.find(n => n.clientId === selClient.userId) || null : null;
  const displayNutData  = selectedNutPlan || MOCK_NUTRITION;
  const displayMeals    = meals.length > 0 ? meals.filter(m => !selClient || m.clientId === selClient.userId) : MOCK_MEALS;
  const deficit         = (displayNutData.maintenanceCalories || 2500) - (displayNutData.calories || 2000);
  const weeklyKg        = (deficit * 7 / 7700).toFixed(2);
  const defColor        = deficit > 0 ? '#16a34a' : deficit < 0 ? '#f87171' : '#9CA3AF';
  const avgProgress     = Math.round(displayClients.reduce((a: number, c: any) => a + (c.progress || 0), 0) / Math.max(displayClients.length, 1));

  /* Clock */
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

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
        setUserName(d.name || d.displayName || u.displayName || u.email?.split('@')[0] || 'Coach');
      } catch { setUserName(u.displayName || u.email?.split('@')[0] || 'Coach'); }
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
        const cd = d.data(); let cName = cd.name || '';
        if (!cName && cd.clientUserId) {
          try { const uDoc = await getDoc(doc(db, 'users', cd.clientUserId)); if (uDoc.exists()) cName = uDoc.data().name || uDoc.data().email || 'Client'; } catch {}
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
    } catch (e) { console.error(e); fireToast('❌', 'Erreur', 'Impossible de charger les données.'); }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchAll(user); }, [user]);
  useEffect(() => {
    if (!selClient) return;
    const plan = nutritionPlans.find(n => n.clientId === selClient.userId);
    if (plan) setNutForm({ calories: plan.calories||2000, maintenanceCalories: plan.maintenanceCalories||2500, protein: plan.protein||150, carbs: plan.carbs||200, fat: plan.fat||65, fastingType: plan.fastingType||'16/8', windowStart: plan.windowStart||'12:00', windowEnd: plan.windowEnd||'20:00', notes: plan.notes||'' });
    else setNutForm(defaultNutForm());
  }, [selClient, nutritionPlans]);

  /* Handlers */
  const handleSaveNut = async () => {
    if (!user || !selClient) return; setSavingNut(true);
    try { await setDoc(doc(db, 'nutrition_assignments', `${user.uid}_${selClient.userId}`), { coachId: user.uid, clientId: selClient.userId, ...nutForm, updatedAt: Timestamp.now() }, { merge: true }); fireToast('✅', 'Sauvegardé', `Plan de ${selClient.name} mis à jour.`); await fetchAll(user); } catch { fireToast('❌', 'Erreur', 'Impossible de sauvegarder.'); }
    setSavingNut(false);
  };
  const handleAddTip = async () => {
    if (!user || !tipForm.title || !tipForm.content) return; setSavingTip(true);
    try { await addDoc(collection(db, 'coach_tips'), { coachId: user.uid, ...tipForm, createdAt: Timestamp.now() }); fireToast('💡', 'Conseil ajouté', tipForm.title); setTipForm(defaultTipForm()); setShowTipForm(false); await fetchAll(user); } catch { fireToast('❌', 'Erreur', 'Impossible d\'ajouter.'); }
    setSavingTip(false);
  };
  const handleAddMeal = async () => {
    if (!user || !selClient || !mealForm.name) return; setSavingMeal(true);
    try { await addDoc(collection(db, 'coach_meals'), { coachId: user.uid, clientId: selClient.userId, clientName: selClient.name, ...mealForm, createdAt: Timestamp.now() }); fireToast('🍽️', 'Repas ajouté', mealForm.name); setMealForm(defaultMealForm()); setShowMealForm(false); await fetchAll(user); } catch { fireToast('❌', 'Erreur', 'Impossible d\'ajouter.'); }
    setSavingMeal(false);
  };
  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return; setDeletingMeal(mealId);
    try { await deleteDoc(doc(db, 'coach_meals', mealId)); fireToast('🗑️', 'Repas supprimé', ''); await fetchAll(user); } catch { fireToast('❌', 'Erreur', 'Impossible de supprimer.'); }
    setDeletingMeal('');
  };
  const handleSignOut = async () => { await signOut(auth); router.push('/login'); };

  /* Helpers */
  const Spin = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
      <p style={{ fontSize: '.72rem', color: '#9CA3AF' }}>Chargement…</p>
    </div>
  );
  const NInput = ({ label, type='number', val, set, min, max }: any) => (
    <div className="fld"><label>{label}</label><input type={type} value={val} min={min} max={max} onChange={e => set(type==='number'?Number(e.target.value):e.target.value)} /></div>
  );

  const navTo = (key: string) => { setActiveTab(key as typeof activeTab); };

  /* Shared styles */
  const S = {
    label: { fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF' },
    badge: { fontSize: '.56rem', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 7px', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const },
    gradBtn: { background: 'linear-gradient(135deg,#89070e,#0e0e0e)', color: '#e5e2e1', border: 'none', borderRadius: 6, padding: '11px 22px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all .2s' },
    ghostBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '10px 18px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9CA3AF', cursor: 'pointer', transition: 'all .2s' },
    sectionHead: { fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .9, color: '#e5e2e1', margin: 0 } as React.CSSProperties,
    tag: { fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase' as const, color: '#b22a27', display: 'block', marginBottom: 8 },
  };

  const NAV_ITEMS = [
    { key: 'overview',  icon: '🏠', label: 'Tableau de bord' },
    { key: 'clients',   icon: '👥', label: 'Membres' },
    { key: 'nutrition', icon: '🥗', label: 'Nutrition' },
    { key: 'conseils',  icon: '💡', label: 'Conseils' },
    { key: 'analyses',  icon: '📈', label: 'Statistiques' },
  ] as const;

  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />
        <div className="ch-root" style={{ display: 'flex', minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

          <Sidebar role="coach" activeTab={activeTab} onNavTo={navTo} onSignOut={handleSignOut} />

          {/* ══ MAIN ══ */}
          <main className="ch-main">

            {/* ══ OVERVIEW ══ */}
            {activeTab === 'overview' && (
              <>
                {/* HÉRO */}
                <section style={{ position: 'relative', height: 'clamp(260px,36vh,400px)', overflow: 'hidden', flexShrink: 0 }}>
                  <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.32) saturate(0.7) grayscale(0.2)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,19,19,0.75)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.9) 0%, transparent 70%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, #131313, transparent)' }} />
                  <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(18px,4vw,40px)', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity .6s ease, transform .6s ease' }}>
                    <span style={S.tag}>{greet()}, {userName || 'Coach'} — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.8rem,4.5vw,3.6rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .88, marginBottom: 12, color: '#e5e2e1' }}>
                      COACH <span style={{ color: '#b22a27', fontStyle: 'italic' }}>BIENVENUE.</span>
                    </h1>
                    <p style={{ fontSize: 'clamp(.82rem,1.5vw,.92rem)', color: '#9CA3AF', marginBottom: 18, maxWidth: 460, lineHeight: 1.75 }}>
                      Votre équipe est opérationnelle. Gérez vos membres et programmes depuis votre tableau de bord.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button style={S.gradBtn} onClick={() => navTo('analyses')}>VOIR LES STATISTIQUES →</button>
                      <button style={S.ghostBtn} onClick={() => router.push('/coach')}>AJOUTER UN MEMBRE</button>
                    </div>
                  </div>
                </section>

                {/* KPI ROW */}
                <section style={{ background: '#1c1b1b', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: mounted ? 1 : 0, transition: 'opacity .4s ease .1s' }}>
                  <div className="ch-kpi-grid">
                    {[
                      { label: 'Programmes créés',     val: loading ? '—' : displayPrograms.length, sub: '+1 ce mois', bar: 60 },
                      { label: 'Membres actifs',        val: loading ? '—' : displayClients.length,  sub: '+2 ce mois', bar: 75 },
                      { label: 'Assignations ce mois',  val: loading ? '—' : nutritionPlans.length || 8, sub: 'plans nutrition', bar: 85 },
                      { label: 'Taux de rétention',     val: '89%',                                  sub: '↑ vs mois précédent', bar: 89 },
                    ].map((k, i, arr) => (
                      <div key={k.label} style={{ padding: 'clamp(14px,2vw,22px) clamp(14px,2vw,24px)', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div style={{ ...S.label, marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.5rem,2.8vw,2.4rem)', fontWeight: 900, letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, marginBottom: 5 }}>{k.val}</div>
                        <div style={{ fontSize: '.58rem', color: '#9CA3AF', marginBottom: 8 }}>{k.sub}</div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${k.bar}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width 1.2s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* CONTENT GRID */}
                <div style={{ flex: 1, padding: 'clamp(16px,2.5vw,32px)', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'opacity .4s ease .2s, transform .4s ease .2s' }}>
                  <div className="ch-content-grid">

                    {/* LEFT COLUMN */}
                    <div style={{ minWidth: 0 }}>
                      {/* Programmes actifs */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                        <h2 style={S.sectionHead}>PROGRAMMES <span style={{ color: '#b22a27' }}>ACTIFS.</span></h2>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#b22a27', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => router.push('/coach/programmes')}>TOUT GÉRER →</button>
                      </div>
                      <div className="ch-prog-grid" style={{ marginBottom: 36 }}>
                        {displayPrograms.slice(0, 3).map((p: any, i: number) => (
                          <div key={p.id} className="ch-prog-card" onClick={() => router.push('/coach/programmes')}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(178,42,39,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: 14 }}>{p.icon || '📋'}</div>
                            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.95rem', letterSpacing: '-.02em', marginBottom: 7, color: '#e5e2e1', lineHeight: 1.2 }}>{p.title}</div>
                            <p style={{ fontSize: '.74rem', color: '#9CA3AF', lineHeight: 1.65, marginBottom: 14, flex: 1 }}>{p.desc || 'Programme personnalisé'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.66rem' }}>
                              <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#e5e2e1' }}>{p.clients || p.spw || 0} {p.clients ? 'membres' : 'x/sem'}</span>
                              <span style={{ color: i === 2 ? '#b22a27' : '#9CA3AF', fontWeight: 600 }}>{p.trend || 'Stable'}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Activité récente */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                        <h2 style={S.sectionHead}>ACTIVITÉ <span style={{ color: '#b22a27' }}>RÉCENTE.</span></h2>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {loading ? <Spin /> : (MOCK_FEED.map((f, i) => (
                          <div key={i} className="ch-feed-row">
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.66rem', fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>{f.initials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '.82rem', color: '#e5e2e1', lineHeight: 1.4, margin: 0 }}>
                                <strong style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700 }}>{f.name}</strong>
                                <span style={{ color: '#9CA3AF' }}> {f.action} </span>
                                <span style={{ color: '#b22a27', fontWeight: 600 }}>{f.program}</span>
                              </p>
                              <p style={{ fontSize: '.6rem', color: '#6B7280', marginTop: 3, margin: '3px 0 0' }}>{f.time}</p>
                            </div>
                            <span style={{ color: '#6B7280', fontSize: '.9rem', flexShrink: 0 }}>›</span>
                          </div>
                        )))}
                        {!loading && MOCK_FEED.length === 0 && (
                          <div style={{ background: '#1c1b1b', borderRadius: 10, padding: '20px', textAlign: 'center', fontSize: '.8rem', color: '#9CA3AF' }}>
                            Aucune activité — invitez vos premiers membres.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="ch-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Progression des membres */}
                      <div style={{ background: '#1c1b1b', borderRadius: 14, padding: 22 }}>
                        <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em', marginBottom: 20, color: '#e5e2e1' }}>Progression des membres</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {displayClients.slice(0, 3).map((c: any) => (
                            <div key={c.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '.78rem' }}>
                                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 600, color: '#e5e2e1' }}>{c.name}</span>
                                <span style={{ color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 700 }}>{c.progress || 0}%</span>
                              </div>
                              <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width 1.4s ease' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button style={{ ...S.ghostBtn, width: '100%', marginTop: 16, justifyContent: 'center', display: 'flex' }} onClick={() => navTo('clients')}>VOIR TOUS LES MEMBRES</button>
                      </div>

                      {/* Conseil Pro */}
                      {displayTips.length > 0 && (
                        <div style={{ background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.2)', borderRadius: 14, padding: 20 }}>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', color: '#b22a27', marginBottom: 10 }}>💡 Conseil Pro</div>
                          <p style={{ fontSize: '.78rem', color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>{displayTips[0].content}</p>
                          <div style={{ marginTop: 10, fontSize: '.62rem', color: '#6B7280' }}>— {displayTips[0].title}</div>
                        </div>
                      )}

                      {/* En attente de révision */}
                      <div style={{ background: '#1c1b1b', borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(178,42,39,0.12)', borderRadius: '50%', filter: 'blur(20px)' }} />
                        <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.95rem', letterSpacing: '-.02em', marginBottom: 10, color: '#e5e2e1' }}>En Attente de Révision</h3>
                        <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginBottom: 16, lineHeight: 1.65 }}>
                          {nutritionPlans.length > 0 ? `${nutritionPlans.length} plan${nutritionPlans.length > 1 ? 's' : ''} nutrition` : `${displayClients.length} membres`} en attente de votre validation.
                        </p>
                        <button style={{ ...S.gradBtn, width: '100%', textAlign: 'center', display: 'block' }} onClick={() => navTo('nutrition')}>RÉVISER →</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ OUTILS DU COACH ══ */}
                <div style={{ marginTop: 36, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ marginBottom: 20 }}>
                    <span style={S.tag}>⚙️ Gestion avancée</span>
                    <h2 style={S.sectionHead}>CALCULATEUR <span style={{ color: '#b22a27' }}>MEMBRES.</span></h2>
                    <p style={{ fontSize: '.8rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.65, marginTop: 10, maxWidth: 480 }}>
                      Calculez et gérez les besoins caloriques de chacun de vos membres.
                    </p>
                  </div>
                  <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '.82rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.7, margin: 0, flex: 1, minWidth: 200 }}>
                      Estimez le déficit calorique, les macros et le protocole de jeûne recommandé pour n'importe quel profil membre.
                    </p>
                    <button style={{ ...S.gradBtn, flexShrink: 0 }} onClick={() => setShowCalcModal(true)}>
                      OUVRIR LE CALCULATEUR →
                    </button>
                  </div>
                </div>
            </>
            )}

            {/* ══ MEMBRES ══ */}
            {activeTab === 'clients' && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={S.tag}>👥 Suivi</span>
                    <h2 style={S.sectionHead}>MES <span style={{ color: '#b22a27' }}>MEMBRES.</span></h2>
                  </div>
                  <button style={S.gradBtn} onClick={() => router.push('/coach')}>+ AJOUTER UN MEMBRE →</button>
                </div>
                {loading ? <Spin /> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                    {displayClients.map((c: any) => (
                      <div key={c.id} className="ch-member-card" onClick={() => { setSelClient(c); navTo('nutrition'); }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ width: 46, height: 46, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.76rem', fontWeight: 700, color: '#fff', fontFamily: 'Lexend, sans-serif' }}>{c.initials || initials(c.name || 'C')}</div>
                        </div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>{c.name}</div>
                        <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginBottom: 14 }}>{c.goal || 'Coaching personnalisé'}</div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
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
                              <div style={{ ...S.label, marginTop: 1 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 7 }}>
                          <button style={{ flex: 1, background: 'rgba(178,42,39,0.1)', border: 'none', borderRadius: 6, padding: '8px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#e3beb8', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setSelClient(c); navTo('nutrition'); }}>🥗 Nutrition</button>
                          <button style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 6, padding: '8px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9CA3AF', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); router.push('/coach/programmes'); }}>📋 Programmes</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ NUTRITION ══ */}
            {activeTab === 'nutrition' && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
                <div style={{ marginBottom: 22 }}>
                  <span style={S.tag}>🥗 Plans</span>
                  <h2 style={S.sectionHead}>NUTRITION <span style={{ color: '#b22a27' }}>MEMBRES.</span></h2>
                </div>
                {/* Member selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <span style={S.label}>Membre :</span>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {displayClients.map((c: any) => (
                      <button key={c.id} onClick={() => setSelClient(c)} style={{ padding: '7px 13px', borderRadius: 6, fontSize: '.74rem', cursor: 'pointer', transition: 'all .2s', border: `1px solid ${selClient?.id === c.id ? 'rgba(178,42,39,0.4)' : 'rgba(255,255,255,0.06)'}`, background: selClient?.id === c.id ? 'rgba(178,42,39,0.1)' : '#2a2a2a', color: selClient?.id === c.id ? '#e3beb8' : '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem', fontWeight: 700, color: '#fff', fontFamily: 'Lexend, sans-serif' }}>{c.initials || initials(c.name || 'C')}</span>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Macro cards */}
                <div className="macro-grid" style={{ marginBottom: 16 }}>
                  {[
                    { icon: '🔥', label: 'Objectif calorique', val: displayNutData.calories?.toLocaleString('fr-FR'), unit: 'kcal/j', pct: 100 },
                    { icon: '🥩', label: 'Protéines', val: displayNutData.protein, unit: 'g', pct: Math.round(((displayNutData.protein || 0) * 4 / (displayNutData.calories || 2000)) * 100) },
                    { icon: '🌾', label: 'Glucides',  val: displayNutData.carbs,   unit: 'g', pct: Math.round(((displayNutData.carbs || 0) * 4 / (displayNutData.calories || 2000)) * 100) },
                    { icon: '🥑', label: 'Lipides',   val: displayNutData.fat,     unit: 'g', pct: Math.round(((displayNutData.fat || 0) * 9 / (displayNutData.calories || 2000)) * 100) },
                  ].map(m => (
                    <div key={m.label} style={{ background: '#1c1b1b', borderRadius: 10, padding: '16px' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: 7 }}>{m.icon}</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1 }}>{m.val}</div>
                      <div style={{ ...S.label, marginTop: 3, marginBottom: 8 }}>{m.unit} · {m.label}</div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(m.pct, 100)}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10 }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Déficit */}
                <div style={{ background: deficit > 0 ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)', borderRadius: 10, padding: '16px 20px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ ...S.label, marginBottom: 5 }}>{deficit > 0 ? 'Déficit calorique' : 'Surplus calorique'}</div>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-.04em', color: defColor, lineHeight: 1 }}>{deficit > 0 ? `−${deficit}` : `+${Math.abs(deficit)}`} kcal</div>
                    <div style={{ fontSize: '.66rem', color: '#9CA3AF', marginTop: 4 }}>Maintenance {displayNutData.maintenanceCalories?.toLocaleString('fr-FR')} → Objectif {displayNutData.calories?.toLocaleString('fr-FR')} kcal</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...S.label, marginBottom: 3 }}>Estimation / semaine</div>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.3rem', fontWeight: 900, color: defColor }}>{deficit > 0 ? '−' : '+'}{Math.abs(parseFloat(weeklyKg))} kg</div>
                  </div>
                </div>
                {/* Repas */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <span style={S.label}>Plan repas — {selClient?.name || 'Exemple'}</span>
                  <button style={S.ghostBtn} onClick={() => setShowMealForm(f => !f)}>{showMealForm ? '✕ Annuler' : '+ Ajouter un repas'}</button>
                </div>
                {showMealForm && (
                  <div style={{ background: '#2a2a2a', borderRadius: 10, padding: '18px', marginBottom: 14 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ ...S.label, marginBottom: 8 }}>Emoji</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {MEAL_EMOJIS.map(em => (
                          <span key={em} onClick={() => setMealForm(f => ({ ...f, emoji: em }))} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${mealForm.emoji === em ? 'rgba(178,42,39,0.5)' : 'rgba(255,255,255,0.06)'}`, background: mealForm.emoji === em ? 'rgba(178,42,39,0.12)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '1rem' }}>{em}</span>
                        ))}
                      </div>
                    </div>
                    <div className="form-row"><NInput label="Nom du repas" type="text" val={mealForm.name} set={(v: string) => setMealForm(f => ({ ...f, name: v }))} /><NInput label="Heure" type="time" val={mealForm.time} set={(v: string) => setMealForm(f => ({ ...f, time: v }))} /></div>
                    <div className="fld" style={{ marginBottom: 10 }}><label>Description / aliments</label><textarea rows={2} value={mealForm.description} onChange={e => setMealForm(f => ({ ...f, description: e.target.value }))} placeholder="Poulet 200g · Riz 120g · Légumes" /></div>
                    <div className="form-row">
                      <NInput label="Calories (kcal)" val={mealForm.calories} set={(v: number) => setMealForm(f => ({ ...f, calories: v }))} min={0} />
                      <NInput label="Protéines (g)" val={mealForm.protein} set={(v: number) => setMealForm(f => ({ ...f, protein: v }))} min={0} />
                      <NInput label="Glucides (g)" val={mealForm.carbs} set={(v: number) => setMealForm(f => ({ ...f, carbs: v }))} min={0} />
                      <NInput label="Lipides (g)" val={mealForm.fat} set={(v: number) => setMealForm(f => ({ ...f, fat: v }))} min={0} />
                    </div>
                    <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 6, opacity: savingMeal || !mealForm.name ? .55 : 1 }} onClick={handleAddMeal} disabled={savingMeal || !mealForm.name}>{savingMeal ? <><span className="spin-sm" /> Ajout…</> : `Ajouter pour ${selClient?.name || 'membre'} →`}</button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {displayMeals.map((m: any) => (
                    <div key={m.id} style={{ background: '#1c1b1b', borderRadius: 8, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{m.emoji || '🍽️'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>{m.name}</div>
                        {m.description && <div style={{ fontSize: '.7rem', color: '#9CA3AF', marginBottom: 5 }}>{m.description}</div>}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {m.calories && <span style={{ fontSize: '.62rem', color: '#e3beb8' }}>🔥 <strong>{m.calories}</strong> kcal</span>}
                          {m.protein  && <span style={{ fontSize: '.62rem', color: '#e3beb8' }}>🥩 <strong>{m.protein}g</strong></span>}
                        </div>
                      </div>
                      {m.time && <div style={{ fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 700, flexShrink: 0 }}>{m.time}</div>}
                      {!m.id.startsWith('mm') && <button style={{ background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} disabled={deletingMeal === m.id} onClick={() => handleDeleteMeal(m.id)}>{deletingMeal === m.id ? <span className="spin-sm" /> : '🗑️'}</button>}
                    </div>
                  ))}
                </div>
                {/* Plan nutritionnel form */}
                <div style={{ background: '#1c1b1b', borderRadius: 10, padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: showNutForm ? 16 : 0 }} onClick={() => setShowNutForm(f => !f)}>
                    <span style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(178,42,39,0.1)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</span>
                    <div><div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.84rem' }}>Modifier le plan nutritionnel</div><div style={{ fontSize: '.68rem', color: '#9CA3AF' }}>Calories, macros, jeûne, fenêtre alimentaire</div></div>
                    <span style={{ marginLeft: 'auto', color: '#9CA3AF', transition: 'transform .2s', transform: showNutForm ? 'rotate(180deg)' : 'none' }}>▼</span>
                  </div>
                  {showNutForm && (
                    <div>
                      <div className="form-row"><NInput label="Calories objectif" val={nutForm.calories} set={(v: number) => setNutForm(f => ({ ...f, calories: v }))} min={1000} max={6000} /><NInput label="Calories maintenance" val={nutForm.maintenanceCalories} set={(v: number) => setNutForm(f => ({ ...f, maintenanceCalories: v }))} min={1000} max={6000} /></div>
                      <div className="form-row"><NInput label="Protéines (g)" val={nutForm.protein} set={(v: number) => setNutForm(f => ({ ...f, protein: v }))} min={0} /><NInput label="Glucides (g)" val={nutForm.carbs} set={(v: number) => setNutForm(f => ({ ...f, carbs: v }))} min={0} /><NInput label="Lipides (g)" val={nutForm.fat} set={(v: number) => setNutForm(f => ({ ...f, fat: v }))} min={0} /></div>
                      <div className="form-row" style={{ marginBottom: 10 }}>
                        <div className="fld"><label>Type de jeûne</label><select value={nutForm.fastingType} onChange={e => setNutForm(f => ({ ...f, fastingType: e.target.value }))}>{FASTING_TYPES.map(ft => <option key={ft.val} value={ft.val}>{ft.label}</option>)}</select></div>
                        <NInput label="Début fenêtre" type="time" val={nutForm.windowStart} set={(v: string) => setNutForm(f => ({ ...f, windowStart: v }))} />
                        <NInput label="Fin fenêtre" type="time" val={nutForm.windowEnd} set={(v: string) => setNutForm(f => ({ ...f, windowEnd: v }))} />
                      </div>
                      <div className="fld" style={{ marginBottom: 14 }}><label>Notes pour le membre</label><textarea rows={3} value={nutForm.notes} onChange={e => setNutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Conseils alimentaires spécifiques…" /></div>
                      <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 6, opacity: savingNut || !selClient ? .55 : 1 }} onClick={handleSaveNut} disabled={savingNut || !selClient}>{savingNut ? <><span className="spin-sm" /> Sauvegarde…</> : `Sauvegarder pour ${selClient?.name || 'le membre'} →`}</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ CONSEILS ══ */}
            {activeTab === 'conseils' && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
                <div style={{ marginBottom: 22 }}><span style={S.tag}>💡 Lifestyle</span><h2 style={S.sectionHead}>MES <span style={{ color: '#b22a27' }}>CONSEILS.</span></h2></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                  <div style={S.label}>{displayTips.length} conseil{displayTips.length !== 1 ? 's' : ''} publiés</div>
                  <button style={S.ghostBtn} onClick={() => setShowTipForm(f => !f)}>{showTipForm ? '✕ Annuler' : '+ NOUVEAU CONSEIL'}</button>
                </div>
                {showTipForm && (
                  <div style={{ background: '#1c1b1b', borderRadius: 10, padding: '18px', marginBottom: 18 }}>
                    <div className="form-row" style={{ marginBottom: 10 }}>
                      <NInput label="Titre du conseil" type="text" val={tipForm.title} set={(v: string) => setTipForm(f => ({ ...f, title: v }))} />
                      <div className="fld"><label>Catégorie</label><select value={tipForm.category} onChange={e => setTipForm(f => ({ ...f, category: e.target.value }))}>{TIP_CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}</select></div>
                    </div>
                    <div className="fld" style={{ marginBottom: 12 }}><label>Contenu du conseil</label><textarea rows={4} value={tipForm.content} onChange={e => setTipForm(f => ({ ...f, content: e.target.value }))} placeholder="Rédigez votre conseil…" /></div>
                    <button style={{ ...S.gradBtn, opacity: savingTip || !tipForm.title || !tipForm.content ? .55 : 1 }} onClick={handleAddTip} disabled={savingTip || !tipForm.title || !tipForm.content}>{savingTip ? <><span className="spin-sm" /> Publication…</> : 'PUBLIER CE CONSEIL →'}</button>
                  </div>
                )}
                {displayTips.length > 0 && (
                  <div style={{ background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.2)', borderRadius: 12, padding: 22, marginBottom: 20 }}>
                    <div style={{ fontSize: '2rem', color: 'rgba(178,42,39,0.4)', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 6 }}>"</div>
                    <div style={{ ...S.label, color: '#b22a27', marginBottom: 8 }}>{CAT_ICON[displayTips[0].category] || '💡'} Dernier conseil</div>
                    <p style={{ fontSize: '.9rem', color: '#e5e2e1', lineHeight: 1.8, marginBottom: 8 }}>{displayTips[0].content}</p>
                    <div style={{ fontSize: '.68rem', color: '#9CA3AF' }}>— {displayTips[0].title}</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                  {displayTips.map((t: any) => (
                    <div key={t.id} style={{ background: '#1c1b1b', borderRadius: 10, padding: 18 }}>
                      <div style={{ fontSize: '1.3rem', marginBottom: 9 }}>{CAT_ICON[t.category] || '💡'}</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', letterSpacing: '-.02em', marginBottom: 7, color: '#e5e2e1' }}>{t.title}</div>
                      <p style={{ fontSize: '.76rem', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 10 }}>{t.content}</p>
                      <span style={S.badge}>{TIP_CATEGORIES.find(c => c.val === t.category)?.label || t.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ ANALYSES ══ */}
            {activeTab === 'analyses' && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
                <div style={{ marginBottom: 22 }}><span style={S.tag}>📈 Données</span><h2 style={S.sectionHead}>MES <span style={{ color: '#b22a27' }}>STATISTIQUES.</span></h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 12, marginBottom: 22 }}>
                  {[
                    { label: 'Total membres',       val: displayClients.length, sub: 'actifs' },
                    { label: 'Taux de rétention',   val: '89%', sub: '+3% vs mois dernier' },
                    { label: 'Durée moy. coaching', val: '7,2 sem.', sub: 'par membre' },
                    { label: 'Séances cette sem.',  val: '24', sub: '↑ vs sem. passée' },
                    { label: 'Conseils publiés',    val: displayTips.length, sub: 'total' },
                    { label: 'Plans nutrition',     val: nutritionPlans.length || 4, sub: 'actifs' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#1c1b1b', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,2.8vw,2rem)', letterSpacing: '-.04em', color: '#b22a27', lineHeight: 1, marginBottom: 5 }}>{s.val}</div>
                      <div style={S.label}>{s.label}</div>
                      <div style={{ fontSize: '.56rem', color: '#9CA3AF', marginTop: 3, opacity: .75 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#1c1b1b', borderRadius: 12, padding: 20, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div><div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>📊 Séances par jour — Cette semaine</div><div style={{ fontSize: '.64rem', color: '#9CA3AF' }}>Total : 45 séances · Moy. : 6.4/jour</div></div>
                    <span style={{ ...S.badge, background: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>+12% vs sem. passée</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
                    {CHART_BARS.map(b => (
                      <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', background: 'linear-gradient(to top,#89070e,#b22a27)', borderRadius: '4px 4px 0 0', height: `${b.h}%`, transition: 'height 1s ease' }} />
                        <div style={{ fontSize: '.56rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{b.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#1c1b1b', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 14, color: '#e5e2e1' }}>👥 Progression par membre</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {displayClients.map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.56rem', fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>{c.initials || initials(c.name || 'C')}</div>
                        <div style={{ width: 90, fontSize: '.76rem', fontFamily: 'Lexend, sans-serif', fontWeight: 600, flexShrink: 0 }}>{c.name}</div>
                        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.5s ease' }} />
                        </div>
                        <span style={{ fontSize: '.68rem', color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{c.progress || 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </main>

          {/* ══ MODALE CALCULATEUR ══ */}
          {showCalcModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setShowCalcModal(false); }}>
              <div style={{ background: '#1c1b1b', borderRadius: 16, padding: 32, maxWidth: 620, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(255,255,255,0.08)', animation: 'calcFadeIn .25s ease' }}>
                <button onClick={() => setShowCalcModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '.95rem', color: '#9CA3AF' }}>✕</button>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', display: 'block', marginBottom: 10 }}>⚙️ Gestion avancée</span>
                  <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.3rem,3vw,1.8rem)', letterSpacing: '-.05em', color: '#e5e2e1', margin: '0 0 8px' }}>
                    CALCULATEUR <span style={{ color: '#b22a27' }}>MEMBRES.</span>
                  </h2>
                  <p style={{ fontSize: '.78rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                    Calculez les besoins caloriques, macros et protocole de jeûne pour un profil membre.
                  </p>
                </div>
                <CalorieCalculator mode="coach" />
                <button style={{ ...S.gradBtn, width: '100%', marginTop: 24, textAlign: 'center', display: 'block' }} onClick={() => setShowCalcModal(false)}>
                  APPLIQUER À UN MEMBRE →
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          .ch-root, .ch-root * { font-family: 'Inter', sans-serif; }
          .ch-root h1, .ch-root h2, .ch-root h3 { font-family: 'Lexend', sans-serif !important; font-weight: 900 !important; letter-spacing: -.04em !important; line-height: .92 !important; margin: 0; color: #e5e2e1; }
          .ch-root h4 { font-family: 'Lexend', sans-serif !important; font-weight: 800 !important; margin: 0; color: #e5e2e1; }
          .ch-root p { margin: 0; color: #9CA3AF; }

          .ch-main {
            flex: 1; min-width: 0; display: flex; flex-direction: column;
            min-height: 100vh; overflow-x: hidden;
          }
          @media (min-width: 768px) { .ch-main { margin-left: 240px; width: calc(100vw - 240px); } }
          @media (max-width: 767px) {
            .ch-root { flex-direction: column !important; }
            .ch-main { margin-left: 0 !important; width: 100% !important; }
          }

          /* Content grids */
          .ch-kpi-grid { display: grid; grid-template-columns: repeat(2,1fr); }
          .ch-content-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
          .ch-right-panel { display: flex; }
          .ch-prog-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }

          @media (min-width: 900px) {
            .ch-kpi-grid { grid-template-columns: repeat(4,1fr); }
            .ch-content-grid { grid-template-columns: 1fr 280px; }
            .ch-right-panel { display: flex !important; }
            .ch-prog-grid { grid-template-columns: repeat(3,1fr); }
          }
          @media (min-width: 769px) and (max-width: 1100px) {
            .ch-kpi-grid { grid-template-columns: repeat(2,1fr); }
          }

          /* Cards */
          .ch-prog-card {
            background: #1c1b1b; border-radius: 14px; padding: 22px;
            cursor: pointer; display: flex; flex-direction: column;
            border: 1px solid rgba(255,255,255,0.05); transition: all .2s;
          }
          .ch-prog-card:hover { border-color: rgba(178,42,39,0.35); transform: scale(1.02); box-shadow: 0 0 24px rgba(178,42,39,0.12); }
          .ch-member-card {
            background: #1c1b1b; border-radius: 12px; padding: 20px; cursor: pointer;
            border: 1px solid rgba(255,255,255,0.05); transition: all .2s;
          }
          .ch-member-card:hover { border-color: rgba(178,42,39,0.3); transform: scale(1.02); box-shadow: 0 0 20px rgba(178,42,39,0.1); }
          .ch-feed-row {
            background: #1c1b1b; border-radius: 10px; padding: 14px 16px;
            display: flex; align-items: center; gap: 12;
            border: 1px solid rgba(255,255,255,0.05); transition: all .2s; cursor: pointer;
          }
          .ch-feed-row:hover { border-color: rgba(178,42,39,0.2); }

          /* Forms */
          .fld { display: flex; flex-direction: column; gap: 6px; }
          .fld label { font-family: 'Inter', sans-serif; font-size: .56rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #9CA3AF; }
          .form-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 10px; margin-bottom: 10px; }
          .macro-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
          .ch-root input, .ch-root textarea, .ch-root select {
            font-family: 'Inter', sans-serif !important; color: #e5e2e1 !important;
            background: #2a2a2a !important; border: 1px solid rgba(255,255,255,0.07) !important;
            border-radius: 7px !important; padding: 9px 12px !important;
            width: 100%; outline: none !important; font-size: .84rem !important;
          }
          .ch-root input:focus, .ch-root textarea:focus, .ch-root select:focus {
            border-color: rgba(178,42,39,0.5) !important; box-shadow: 0 0 0 3px rgba(178,42,39,0.09) !important;
          }
          .ch-root select option { background: #2a2a2a; color: #e5e2e1; }
          .spin-sm { width:13px; height:13px; border:2px solid rgba(255,255,255,.07); border-top-color:#b22a27; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; flex-shrink:0; vertical-align:middle; }
          @keyframes spin { to { transform:rotate(360deg); } }
          @keyframes calcFadeIn { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
          @media (max-width: 600px) {
            .macro-grid { grid-template-columns: 1fr 1fr !important; }
            .form-row { grid-template-columns: 1fr !important; }
          }
          .ch-root ::-webkit-scrollbar { width:4px; height:4px; }
          .ch-root ::-webkit-scrollbar-track { background:transparent; }
          .ch-root ::-webkit-scrollbar-thumb { background:rgba(178,42,39,0.35); border-radius:10px; }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
