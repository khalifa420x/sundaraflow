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
import { FoodItem as NutFoodItem, calculateTotals, getNutritionFeedback } from '@/lib/nutrition';

import OverviewTab  from '@/components/coach/tabs/OverviewTab';
import ClientsTab   from '@/components/coach/tabs/ClientsTab';
import NutritionTab from '@/components/coach/tabs/NutritionTab';
import ConseilsTab  from '@/components/coach/tabs/ConseilsTab';
import AnalysesTab  from '@/components/coach/tabs/AnalysesTab';

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

const defaultNutForm  = () => ({ calories: 2000, maintenanceCalories: 2500, protein: 150, carbs: 200, fat: 65, fastingType: '16/8', windowStart: '12:00', windowEnd: '20:00', notes: '' });
const defaultTipForm  = () => ({ title: '', category: 'lifestyle', content: '' });
const defaultMealForm = () => ({ emoji: '🍽️', name: '', time: '12:00', description: '', calories: 500, protein: 35, carbs: 55, fat: 15 });

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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
  const [foodItems, setFoodItems] = useState<NutFoodItem[]>([]);

  /* Computed */
  const displayClients  = clients.length  > 0 ? clients  : MOCK_CLIENTS;
  const displayPrograms = programs.length > 0 ? programs : MOCK_PROGRAMS;
  const displayTips     = tips.length     > 0 ? tips     : MOCK_TIPS;
  const selectedNutPlan = selClient ? nutritionPlans.find(n => n.clientId === selClient.userId) || null : null;
  const displayNutData  = selectedNutPlan || MOCK_NUTRITION;
  const displayMeals    = meals.length > 0 ? meals.filter(m => !selClient || m.clientId === selClient.userId) : MOCK_MEALS;
  const avgProgress     = Math.round(displayClients.reduce((a: number, c: any) => a + (c.progress || 0), 0) / Math.max(displayClients.length, 1));
  const mealTotals      = calculateTotals(foodItems);
  const mealFeedback    = getNutritionFeedback(mealTotals, nutForm.calories || 2000);

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
    try {
      await setDoc(doc(db, 'nutrition_assignments', `${user.uid}_${selClient.userId}`), { coachId: user.uid, clientId: selClient.userId, ...nutForm, updatedAt: Timestamp.now() }, { merge: true });
      fireToast('✅', 'Sauvegardé', `Plan de ${selClient.name} mis à jour.`);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible de sauvegarder.'); }
    setSavingNut(false);
  };
  const handleAddTip = async () => {
    if (!user || !tipForm.title || !tipForm.content) return; setSavingTip(true);
    try {
      await addDoc(collection(db, 'coach_tips'), { coachId: user.uid, ...tipForm, createdAt: Timestamp.now() });
      fireToast('💡', 'Conseil ajouté', tipForm.title);
      setTipForm(defaultTipForm());
      setShowTipForm(() => false);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible d\'ajouter.'); }
    setSavingTip(false);
  };
  const handleAddMeal = async () => {
    if (!user || !selClient || !mealForm.name || foodItems.length === 0) return;
    setSavingMeal(true);
    try {
      await addDoc(collection(db, 'coach_meals'), {
        coachId: user.uid,
        clientId: selClient.userId,
        clientName: selClient.name,
        name: mealForm.name,
        time: mealForm.time,
        description: mealForm.description,
        emoji: mealForm.emoji || '🍽️',
        items: foodItems,
        calories: mealTotals.calories,
        protein: mealTotals.protein,
        carbs: mealTotals.carbs,
        fat: mealTotals.fat,
        createdAt: Timestamp.now(),
      });
      fireToast('🍽️', 'Repas ajouté', mealForm.name);
      setMealForm(defaultMealForm());
      setFoodItems(() => []);
      setShowMealForm(() => false);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible d\'ajouter.'); }
    setSavingMeal(false);
  };
  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return; setDeletingMeal(mealId);
    try { await deleteDoc(doc(db, 'coach_meals', mealId)); fireToast('🗑️', 'Repas supprimé', ''); await fetchAll(user); } catch { fireToast('❌', 'Erreur', 'Impossible de supprimer.'); }
    setDeletingMeal('');
  };
  const handleSignOut = async () => {
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'DELETE' });
    console.log('[logout] Session cookie cleared');
    router.push('/login');
  };

  const navTo = (key: string) => { setActiveTab(key as typeof activeTab); };

  /* Shared styles */
  const S = {
    label:       { fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF' },
    badge:       { fontSize: '.56rem', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 7px', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const },
    gradBtn:     { background: 'linear-gradient(135deg,#89070e,#0e0e0e)', color: '#e5e2e1', border: 'none', borderRadius: 6, padding: '11px 22px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all .2s' },
    ghostBtn:    { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '10px 18px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9CA3AF', cursor: 'pointer', transition: 'all .2s' },
    sectionHead: { fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .9, color: '#e5e2e1', margin: 0 } as React.CSSProperties,
    tag:         { fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase' as const, color: '#b22a27', display: 'block', marginBottom: 8 },
  };

  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />
        <div className="ch-root" style={{ display: 'flex', minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

          <Sidebar role="coach" activeTab={activeTab} onNavTo={navTo} onSignOut={handleSignOut} />

          <main className="ch-main">

            {activeTab === 'overview' && (
              <OverviewTab
                userName={userName}
                mounted={mounted}
                clients={displayClients}
                programs={displayPrograms}
                tips={displayTips}
                nutritionPlans={nutritionPlans}
                loading={loading}
                avgProgress={avgProgress}
                navTo={navTo}
                router={router}
                setShowCalcModal={setShowCalcModal}
                S={S}
              />
            )}

            {activeTab === 'clients' && (
              <ClientsTab
                clients={displayClients}
                loading={loading}
                selClient={selClient}
                setSelClient={setSelClient}
                navTo={navTo}
                router={router}
                initials={initials}
                S={S}
              />
            )}

            {activeTab === 'nutrition' && (
              <NutritionTab
                clients={displayClients}
                selClient={selClient}
                setSelClient={setSelClient}
                displayNutData={displayNutData}
                displayMeals={displayMeals}
                nutForm={nutForm}
                setNutForm={setNutForm}
                mealForm={mealForm}
                setMealForm={setMealForm}
                showNutForm={showNutForm}
                setShowNutForm={setShowNutForm}
                showMealForm={showMealForm}
                setShowMealForm={setShowMealForm}
                savingNut={savingNut}
                savingMeal={savingMeal}
                deletingMeal={deletingMeal}
                handleSaveNut={handleSaveNut}
                handleAddMeal={handleAddMeal}
                handleDeleteMeal={handleDeleteMeal}
                foodItems={foodItems}
                setFoodItems={setFoodItems}
                mealTotals={mealTotals}
                mealFeedback={mealFeedback}
                FASTING_TYPES={FASTING_TYPES}
                S={S}
                initials={initials}
              />
            )}

            {activeTab === 'conseils' && (
              <ConseilsTab
                tips={displayTips}
                tipForm={tipForm}
                setTipForm={setTipForm}
                showTipForm={showTipForm}
                setShowTipForm={setShowTipForm}
                savingTip={savingTip}
                handleAddTip={handleAddTip}
                TIP_CATEGORIES={TIP_CATEGORIES}
                CAT_ICON={CAT_ICON}
                S={S}
              />
            )}

            {activeTab === 'analyses' && (
              <AnalysesTab
                clients={displayClients}
                tips={displayTips}
                nutritionPlans={nutritionPlans}
                CHART_BARS={CHART_BARS}
                S={S}
              />
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
            .ch-main { margin-left: 0 !important; width: 100% !important; padding-top: 56px; }
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
            display: flex; align-items: center; gap: 12px;
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
          @media (max-width: 767px) {
            .ch-root button { min-height: 44px; }
          }
          .ch-root ::-webkit-scrollbar { width:4px; height:4px; }
          .ch-root ::-webkit-scrollbar-track { background:transparent; }
          .ch-root ::-webkit-scrollbar-thumb { background:rgba(178,42,39,0.35); border-radius:10px; }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
