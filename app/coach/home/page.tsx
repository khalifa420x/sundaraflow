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
  { id: 'mc1', name: 'Sophie Martin',   userId: 'u1', goal: 'Perte de poids',  progress: 68, sessions: 24, weeks: 8,  initials: 'SM', color: 'linear-gradient(135deg,#7c3aed,var(--purple))' },
  { id: 'mc2', name: 'Lucas Dubois',    userId: 'u2', goal: 'Prise de masse',  progress: 45, sessions: 16, weeks: 5,  initials: 'LD', color: 'linear-gradient(135deg,#2563eb,var(--blue))'   },
  { id: 'mc3', name: 'Emma Petit',      userId: 'u3', goal: 'Remise en forme', progress: 82, sessions: 31, weeks: 11, initials: 'EP', color: 'linear-gradient(135deg,#16a34a,var(--green))'  },
  { id: 'mc4', name: 'Thomas Bernard',  userId: 'u4', goal: 'Performance',     progress: 33, sessions: 9,  weeks: 3,  initials: 'TB', color: 'linear-gradient(135deg,var(--gold-d),var(--gold))' },
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
  { icon: '✅', cls: 'fi-green', text: 'Sophie Martin a terminé sa séance du lundi',       time: 'il y a 2h' },
  { icon: '📊', cls: 'fi-gold',  text: 'Lucas Dubois a atteint son objectif protéines',    time: 'il y a 4h' },
  { icon: '🏋️', cls: 'fi-blue',  text: 'Emma Petit a commencé sa 11ème semaine',           time: 'hier'      },
  { icon: '⚠️', cls: 'fi-red',   text: 'Thomas Bernard n\'a pas connecté depuis 3 jours', time: 'il y a 2j' },
  { icon: '💡', cls: 'fi-gold',  text: 'Conseil publié : "Fenêtre anabolique"',            time: 'il y a 3j' },
];
const CHART_BARS = [
  { label: 'Lun', h: 55 }, { label: 'Mar', h: 90 }, { label: 'Mer', h: 68 },
  { label: 'Jeu', h: 100 },{ label: 'Ven', h: 78 }, { label: 'Sam', h: 42 }, { label: 'Dim', h: 28 },
];

/* ══ Constants ══ */
const AVATAR_COLORS = [
  'linear-gradient(135deg,var(--gold-d),var(--gold))',
  'linear-gradient(135deg,#2563eb,var(--blue))',
  'linear-gradient(135deg,#7c3aed,var(--purple))',
  'linear-gradient(135deg,#16a34a,var(--green))',
  'linear-gradient(135deg,#dc2626,var(--red))',
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
  const defColor  = deficit > 0 ? 'var(--green)' : deficit < 0 ? '#f87171' : 'var(--wd)';

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
      /* Clients */
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

      /* Programs */
      const pSnap = await getDocs(query(collection(db, 'programs'), where('coachId', '==', u.uid)));
      setPrograms(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      /* Nutrition plans */
      const nSnap = await getDocs(query(collection(db, 'nutrition_assignments'), where('coachId', '==', u.uid)));
      setNutritionPlans(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      /* Meals */
      const mSnap = await getDocs(query(collection(db, 'coach_meals'), where('coachId', '==', u.uid)));
      const mData = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      mData.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      setMeals(mData);

      /* Tips — no orderBy to avoid composite index */
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

  /* When selClient changes, load their nutrition form */
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
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--wf)', borderTopColor: 'var(--gold)', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: '.73rem', color: 'var(--wd)' }}>Chargement…</p>
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
    { key: 'clients',    icon: '👥', label: 'Clients' },
    { key: 'nutrition',  icon: '🥗', label: 'Nutrition'  },
    { key: 'conseils',   icon: '💡', label: 'Conseils'   },
    { key: 'analyses',   icon: '📈', label: 'Analyses'   },
  ] as const;

  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />
        <div style={{ minHeight: '100vh', background: 'var(--k0)', color: 'var(--w)', fontFamily: 'var(--fb)' }}>

          {/* ══════ STICKY HEADER ══════ */}
          <header style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--wf)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'rgba(6,6,6,.94)', backdropFilter: 'blur(20px)' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', letterSpacing: '.04em', cursor: 'pointer' }} onClick={() => router.push('/')}>
              Sundara<span style={{ color: 'var(--gold)' }}>Flow</span>
              <span style={{ fontSize: '.58rem', color: 'var(--wd)', marginLeft: 10, fontFamily: 'var(--fb)', letterSpacing: '.08em' }}>Coach Home</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span className="badge badge-gold">🏆 Coach</span>
              <span style={{ fontSize: '.7rem', color: 'var(--wd)' }}>{userName || user?.email}</span>
              <button className="btn btn-outline btn-sm" onClick={() => router.push('/coach')}>Dashboard complet →</button>
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Déconnexion</button>
            </div>
          </header>

          {/* ══════ HERO ══════ */}
          <section style={{ position: 'relative', overflow: 'hidden', padding: '52px 24px 40px', borderBottom: '1px solid var(--wf)' }}>
            <div className="hero-bg" />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .55s ease, transform .55s ease' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                <div>
                  <div className="hero-eyebrow" style={{ justifyContent: 'flex-start', marginBottom: 12 }}>{greet()}, {userName || 'Coach'}</div>
                  <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.9rem,4vw,3rem)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.06, marginBottom: 8 }}>
                    Votre tableau de <span className="gold-i">bord.</span>
                  </h1>
                  <p style={{ fontSize: '.88rem', color: 'var(--wd)', maxWidth: 500, lineHeight: 1.78 }}>
                    {loading ? 'Chargement de vos données…' :
                      `${displayClients.length} client${displayClients.length !== 1 ? 's' : ''} · ${displayPrograms.length} programme${displayPrograms.length !== 1 ? 's' : ''} · ${displayTips.length} conseil${displayTips.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                {/* KPI mini */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { icon: '👥', val: loading ? '—' : displayClients.length, label: 'Clients', color: 'var(--gold)' },
                    { icon: '📋', val: loading ? '—' : displayPrograms.length, label: 'Programmes', color: 'var(--blue)' },
                    { icon: '✅', val: `${Math.round(displayClients.reduce((a: number, c: any) => a + (c.progress || 0), 0) / Math.max(displayClients.length, 1))}%`, label: 'Progression moy.', color: 'var(--green)' },
                    { icon: '💡', val: loading ? '—' : displayTips.length, label: 'Conseils', color: 'var(--amber)' },
                  ].map(k => (
                    <div key={k.label} className="kpi-card" style={{ minWidth: 110 }}>
                      <div className="kpi-label">{k.icon} {k.label}</div>
                      <div className="kpi-val" style={{ fontSize: '1.7rem', color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ══════ APP SHELL ══════ */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity .5s ease .15s, transform .5s ease .15s' }}>

            {/* Titlebar */}
            <div className="app-shell" style={{ marginTop: 32 }}>
              <div className="app-titlebar">
                <div className="atb-left">
                  <div className="atb-dots">
                    <div className="atb-dot atb-dot-r" />
                    <div className="atb-dot atb-dot-y" />
                    <div className="atb-dot atb-dot-g" />
                  </div>
                  <div className="atb-brand">Sundara<span>Flow</span> <span style={{ fontSize: '.65rem', color: 'var(--wd)', fontFamily: 'var(--fb)', fontWeight: 400 }}>— Coach Dashboard v2.4</span></div>
                </div>
                <div className="atb-right">
                  <div className="atb-clock">🕐 {clock}</div>
                  <div className="atb-user">
                    <div className="atb-av">{initials(userName || 'Co')}</div>
                    <span>{userName || 'Coach'}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="main-tabs">
                {TABS.map(t => (
                  <button key={t.key} className={`main-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                    {t.icon} {t.label}
                    {t.key === 'clients' && <span className="tbadge">{displayClients.length}</span>}
                    {t.key === 'conseils' && displayTips.length > 0 && <span className="tbadge">{displayTips.length}</span>}
                  </button>
                ))}
              </div>

              {/* ─── Body (no sidebar on this layout — clean tabbed) ─── */}
              <div className="app-main" style={{ minHeight: 560 }}>

                {/* ══ TAB: OVERVIEW ══ */}
                {activeTab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 22 }}>
                      {[
                        { icon: '👥', label: 'Total clients',     val: displayClients.length,  change: '+2 ce mois', up: true },
                        { icon: '📋', label: 'Programmes actifs', val: displayPrograms.length, change: '+1 ce mois', up: true },
                        { icon: '📊', label: 'Taux rétention',    val: '89%',                   change: '+3% vs mois dernier', up: true },
                        { icon: '⏱️', label: 'Durée moy. suivi',  val: '7 sem.',               change: 'Stable', up: false },
                      ].map(k => (
                        <div className="kpi-card" key={k.label}>
                          <div className="kpi-label">{k.icon} {k.label}</div>
                          <div className="kpi-val">{loading ? '—' : k.val}</div>
                          <div className={`kpi-change ${k.up ? 'up' : ''}`}>{k.change}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }} className="ov-grid">
                      {/* Client progression */}
                      <div>
                        <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 12 }}>Progression clients</div>
                        <div className="client-progress-list">
                          {loading ? <Spin /> : displayClients.map((c: any, i: number) => (
                            <div key={c.id} className="cp-card" style={{ animation: 'fadeUp .35s ease both', animationDelay: `${i*60}ms` }} onClick={() => { setSelClient(c); setActiveTab('nutrition'); }}>
                              <div className="cp-av" style={{ background: c.color }}>{c.initials || initials(c.name || 'C')}</div>
                              <div className="cp-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <span className="cp-name">{c.name}</span>
                                  {c.goal && <span className="badge badge-dim">{c.goal}</span>}
                                </div>
                                <div className="cp-prog-wrap">
                                  <div className="cp-prog-bar"><div className="cp-fill" style={{ width: `${c.progress || 0}%` }} /></div>
                                  <span className="cp-pct">{c.progress || 0}%</span>
                                </div>
                                <div className="cp-meta">
                                  {c.sessions && <span className="badge badge-dim">⚡ {c.sessions} séances</span>}
                                  {c.weeks && <span className="badge badge-dim">📅 Sem. {c.weeks}</span>}
                                </div>
                              </div>
                              <span style={{ color: 'var(--wd)', flexShrink: 0 }}>→</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Activity feed */}
                      <div>
                        <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 12 }}>Activité récente</div>
                        <div className="feed-list">
                          {MOCK_FEED.map((f, i) => (
                            <div key={i} className="feed-item">
                              <div className={`feed-icon ${f.cls}`}>{f.icon}</div>
                              <div className="feed-text" dangerouslySetInnerHTML={{ __html: `<span>${f.text}</span>` }} />
                              <div className="feed-time">{f.time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ TAB: CLIENTS ══ */}
                {activeTab === 'clients' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)' }}>
                        {displayClients.length} client{displayClients.length !== 1 ? 's' : ''} suivis
                      </div>
                      <button className="btn btn-gold btn-sm" onClick={() => router.push('/coach')}>+ Ajouter un client →</button>
                    </div>
                    <div className="client-cards">
                      {loading ? <Spin /> : displayClients.map((c: any, i: number) => (
                        <div key={c.id} className="client-card" style={{ animation: 'fadeUp .35s ease both', animationDelay: `${i*70}ms` }} onClick={() => { setSelClient(c); setActiveTab('nutrition'); }}>
                          <div className="cc-top">
                            <div className="cc-av" style={{ background: c.color }}>{c.initials || initials(c.name || 'C')}</div>
                            <div className="cc-status">
                              <span className={`badge ${c.status === 'online' ? 'badge-green' : 'badge-dim'}`}>{c.status === 'online' ? '● Actif' : '○ Hors ligne'}</span>
                            </div>
                          </div>
                          <div className="cc-name">{c.name}</div>
                          <div className="cc-niche">{c.goal || 'Coaching personnalisé'}</div>
                          <div className="cc-progress-row">
                            <div className="cc-prog-label">
                              <span>Progression globale</span>
                              <span className="cc-prog-val">{c.progress || 0}%</span>
                            </div>
                            <div className="cc-prog-bar"><div className="cc-prog-fill" style={{ width: `${c.progress || 0}%` }} /></div>
                          </div>
                          <div className="cc-stats">
                            <div className="cc-stat"><div className="cc-stat-val">{c.sessions || '—'}</div><div className="cc-stat-label">Séances</div></div>
                            <div className="cc-stat"><div className="cc-stat-val">{c.weeks || '—'}</div><div className="cc-stat-label">Semaines</div></div>
                            <div className="cc-stat"><div className="cc-stat-val">{c.progress || 0}%</div><div className="cc-stat-label">Taux</div></div>
                          </div>
                          <div className="cc-actions">
                            <button className="btn btn-outline btn-xs" onClick={e => { e.stopPropagation(); setSelClient(c); setActiveTab('nutrition'); }}>🥗 Nutrition</button>
                            <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); router.push('/coach'); }}>📋 Programmes</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => router.push('/coach')}>Gérer tous les clients dans le dashboard →</button>
                    </div>
                  </div>
                )}

                {/* ══ TAB: NUTRITION ══ */}
                {activeTab === 'nutrition' && (
                  <div>
                    {/* Client selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--wd)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Client :</span>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {displayClients.map((c: any) => (
                          <button key={c.id}
                            onClick={() => setSelClient(c)}
                            style={{ padding: '7px 14px', borderRadius: 'var(--r)', fontSize: '.75rem', border: `1px solid ${selClient?.id === c.id ? 'rgba(201,168,76,.4)' : 'var(--wf)'}`, background: selClient?.id === c.id ? 'var(--gold-glow)' : 'var(--k4)', color: selClient?.id === c.id ? 'var(--gold)' : 'var(--wd)', cursor: 'pointer', transition: 'var(--tr)', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem', fontWeight: 700, color: 'var(--k0)' }}>{c.initials || initials(c.name || 'C')}</span>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fasting widget */}
                    <div className="fast-widget" style={{ marginBottom: 18 }}>
                      <div className="fast-timer">{displayNutData.fastingType || '—'}</div>
                      <div className="fast-body">
                        <h4>Jeûne Intermittent {displayNutData.fastingType || 'Non défini'}</h4>
                        <p>Fenêtre : <strong style={{ color: 'var(--gold)' }}>{displayNutData.windowStart} – {displayNutData.windowEnd}</strong> · Client : <strong>{selClient?.name || 'Aucun sélectionné'}</strong></p>
                        <div className="fast-prog-bar"><div className="fast-prog-fill" style={{ width: '45%' }} /></div>
                      </div>
                    </div>

                    {/* Macro cards */}
                    <div className="macro-grid" style={{ marginBottom: 16 }}>
                      {[
                        { icon: '🔥', label: 'Objectif calorique',       val: displayNutData.calories?.toLocaleString('fr-FR'), unit: 'kcal/j',  cls: 'mc-gold', pct: 100 },
                        { icon: '🥩', label: 'Protéines',  val: displayNutData.protein,  unit: 'g', cls: 'mc-blue',  pct: Math.round(((displayNutData.protein || 0) * 4 / (displayNutData.calories || 2000)) * 100) },
                        { icon: '🌾', label: 'Glucides',   val: displayNutData.carbs,    unit: 'g', cls: 'mc-amber', pct: Math.round(((displayNutData.carbs || 0) * 4 / (displayNutData.calories || 2000)) * 100) },
                        { icon: '🥑', label: 'Lipides',    val: displayNutData.fat,      unit: 'g', cls: 'mc-green', pct: Math.round(((displayNutData.fat || 0) * 9 / (displayNutData.calories || 2000)) * 100) },
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

                    {/* Deficit banner */}
                    <div style={{ background: deficit > 0 ? 'rgba(34,197,94,.07)' : 'rgba(248,113,113,.07)', border: `1px solid ${deficit > 0 ? 'rgba(34,197,94,.25)' : 'rgba(248,113,113,.25)'}`, borderRadius: 'var(--rl)', padding: '16px 20px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 4 }}>Bilan calorique</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 300, color: defColor, fontStyle: 'italic' }}>
                          {deficit > 0 ? `−${deficit}` : `+${Math.abs(deficit)}`} kcal
                        </div>
                        <div style={{ fontSize: '.72rem', color: 'var(--wd)', marginTop: 3 }}>Maintenance {(displayNutData.maintenanceCalories || 2500).toLocaleString('fr-FR')} → Objectif {(displayNutData.calories || 2000).toLocaleString('fr-FR')} kcal</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '.62rem', color: 'var(--wd)', marginBottom: 4 }}>Estimation hebdomadaire</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: defColor, fontStyle: 'italic' }}>
                          {deficit > 0 ? '−' : '+'}{Math.abs(parseFloat(weeklyKg))} kg
                        </div>
                      </div>
                    </div>

                    {/* Meals section */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)' }}>Plan repas — {selClient?.name || 'Exemple'}</div>
                      <button className="btn btn-outline btn-xs" onClick={() => setShowMealForm(f => !f)}>
                        {showMealForm ? '✕ Annuler' : '+ Ajouter un repas'}
                      </button>
                    </div>

                    {/* Meal form */}
                    {showMealForm && (
                      <div style={{ background: 'var(--k3)', border: '1px solid rgba(201,168,76,.18)', borderRadius: 'var(--rl)', padding: '20px', marginBottom: 16 }}>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: '.65rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 10 }}>Emoji</div>
                          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            {MEAL_EMOJIS.map(em => (
                              <span key={em} onClick={() => setMealForm(f => ({ ...f, emoji: em }))}
                                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r)', border: `1px solid ${mealForm.emoji === em ? 'rgba(201,168,76,.5)' : 'var(--wf)'}`, background: mealForm.emoji === em ? 'var(--gold-glow)' : 'var(--k4)', cursor: 'pointer', fontSize: '1.1rem' }}>
                                {em}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="form-row">
                          <NInput label="Nom du repas" type="text" val={mealForm.name} set={(v: string) => setMealForm(f => ({ ...f, name: v }))} />
                          <NInput label="Heure" type="time" val={mealForm.time} set={(v: string) => setMealForm(f => ({ ...f, time: v }))} />
                        </div>
                        <div className="fld" style={{ marginBottom: 12 }}>
                          <label>Description / aliments</label>
                          <textarea rows={2} value={mealForm.description} onChange={e => setMealForm(f => ({ ...f, description: e.target.value }))} placeholder="Poulet 200g · Riz 120g · Légumes" style={{ width: '100%', background: 'var(--k4)', border: '1px solid var(--wf)', borderRadius: 'var(--r)', padding: '10px 13px', color: 'var(--w)', fontFamily: 'var(--fb)', fontSize: '.82rem', resize: 'none', outline: 'none' }} />
                        </div>
                        <div className="form-row">
                          <NInput label="Calories (kcal)" val={mealForm.calories} set={(v: number) => setMealForm(f => ({ ...f, calories: v }))} min={0} />
                          <NInput label="Protéines (g)"   val={mealForm.protein}  set={(v: number) => setMealForm(f => ({ ...f, protein: v }))}  min={0} />
                          <NInput label="Glucides (g)"    val={mealForm.carbs}    set={(v: number) => setMealForm(f => ({ ...f, carbs: v }))}    min={0} />
                          <NInput label="Lipides (g)"     val={mealForm.fat}      set={(v: number) => setMealForm(f => ({ ...f, fat: v }))}      min={0} />
                        </div>
                        <button className="btn btn-gold btn-sm" onClick={handleAddMeal} disabled={savingMeal || !mealForm.name}>
                          {savingMeal ? <><span className="spin-sm" /> Ajout…</> : `Ajouter pour ${selClient?.name || 'client'} →`}
                        </button>
                      </div>
                    )}

                    {/* Meal list */}
                    <div className="meal-plan-grid" style={{ marginBottom: 18 }}>
                      {displayMeals.map((m: any, i: number) => (
                        <div key={m.id} className="meal-row" style={{ animation: 'fadeUp .35s ease both', animationDelay: `${i*50}ms` }}>
                          <div className="meal-emoji">{m.emoji || '🍽️'}</div>
                          <div className="meal-info">
                            <div className="meal-name">{m.name}</div>
                            {m.description && <div className="meal-desc">{m.description}</div>}
                            <div className="meal-macros-row">
                              {m.calories && <span className="meal-m">🔥 <strong>{m.calories}</strong> kcal</span>}
                              {m.protein  && <span className="meal-m">🥩 <strong>{m.protein}g</strong></span>}
                              {m.carbs    && <span className="meal-m">🌾 <strong>{m.carbs}g</strong></span>}
                              {m.fat      && <span className="meal-m">🥑 <strong>{m.fat}g</strong></span>}
                            </div>
                          </div>
                          {m.time && <div className="meal-time">{m.time}</div>}
                          {!m.id.startsWith('mm') && (
                            <button className="icon-btn" style={{ flexShrink: 0 }} disabled={deletingMeal === m.id} onClick={() => handleDeleteMeal(m.id)}>
                              {deletingMeal === m.id ? <span className="spin-sm" /> : '🗑️'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Nutrition plan form */}
                    <div style={{ background: 'var(--k3)', border: '1px solid rgba(201,168,76,.14)', borderRadius: 'var(--rl)', padding: '20px' }}>
                      <div className="acp-header" onClick={() => setShowNutForm(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: showNutForm ? 18 : 0 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 'var(--r)', background: 'var(--gold-glow)', border: '1px solid rgba(201,168,76,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</span>
                        <div>
                          <div style={{ fontSize: '.85rem', fontWeight: 500 }}>Modifier le plan nutritionnel</div>
                          <div style={{ fontSize: '.7rem', color: 'var(--wd)' }}>Calories, macros, jeûne, fenêtre alimentaire</div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: 'var(--wd)', transition: 'var(--tr)', transform: showNutForm ? 'rotate(180deg)' : 'none' }}>▼</span>
                      </div>
                      {showNutForm && (
                        <div>
                          <div className="form-row">
                            <NInput label="Calories objectif" val={nutForm.calories} set={(v: number) => setNutForm(f => ({ ...f, calories: v }))} min={1000} max={6000} />
                            <NInput label="Calories maintenance" val={nutForm.maintenanceCalories} set={(v: number) => setNutForm(f => ({ ...f, maintenanceCalories: v }))} min={1000} max={6000} />
                          </div>
                          <div className="form-row">
                            <NInput label="Protéines (g)" val={nutForm.protein} set={(v: number) => setNutForm(f => ({ ...f, protein: v }))} min={0} />
                            <NInput label="Glucides (g)"  val={nutForm.carbs}   set={(v: number) => setNutForm(f => ({ ...f, carbs: v }))}   min={0} />
                            <NInput label="Lipides (g)"   val={nutForm.fat}     set={(v: number) => setNutForm(f => ({ ...f, fat: v }))}     min={0} />
                          </div>
                          <div className="form-row" style={{ marginBottom: 12 }}>
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
                            <label>Notes pour le client</label>
                            <textarea rows={3} value={nutForm.notes} onChange={e => setNutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Conseils alimentaires spécifiques…" style={{ width: '100%', background: 'var(--k4)', border: '1px solid var(--wf)', borderRadius: 'var(--r)', padding: '10px 13px', color: 'var(--w)', fontFamily: 'var(--fb)', fontSize: '.82rem', resize: 'none', outline: 'none' }} />
                          </div>
                          <button className="btn btn-gold btn-sm" onClick={handleSaveNut} disabled={savingNut || !selClient}>
                            {savingNut ? <><span className="spin-sm" /> Sauvegarde…</> : `Sauvegarder pour ${selClient?.name || 'le client'} →`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══ TAB: CONSEILS ══ */}
                {activeTab === 'conseils' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: '.65rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--wd)' }}>{displayTips.length} conseil{displayTips.length !== 1 ? 's' : ''} publiés</div>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowTipForm(f => !f)}>
                        {showTipForm ? '✕ Annuler' : '+ Nouveau conseil'}
                      </button>
                    </div>

                    {/* Tip form */}
                    {showTipForm && (
                      <div style={{ background: 'var(--k3)', border: '1px solid rgba(201,168,76,.18)', borderRadius: 'var(--rl)', padding: '20px', marginBottom: 20 }}>
                        <div className="form-row" style={{ marginBottom: 12 }}>
                          <NInput label="Titre du conseil" type="text" val={tipForm.title} set={(v: string) => setTipForm(f => ({ ...f, title: v }))} />
                          <div className="fld">
                            <label>Catégorie</label>
                            <select value={tipForm.category} onChange={e => setTipForm(f => ({ ...f, category: e.target.value }))}>
                              {TIP_CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="fld" style={{ marginBottom: 14 }}>
                          <label>Contenu du conseil</label>
                          <textarea rows={4} value={tipForm.content} onChange={e => setTipForm(f => ({ ...f, content: e.target.value }))} placeholder="Rédigez votre conseil…" style={{ width: '100%', background: 'var(--k4)', border: '1px solid var(--wf)', borderRadius: 'var(--r)', padding: '10px 13px', color: 'var(--w)', fontFamily: 'var(--fb)', fontSize: '.82rem', resize: 'none', outline: 'none' }} />
                        </div>
                        <button className="btn btn-gold btn-sm" onClick={handleAddTip} disabled={savingTip || !tipForm.title || !tipForm.content}>
                          {savingTip ? <><span className="spin-sm" /> Publication…</> : 'Publier ce conseil →'}
                        </button>
                      </div>
                    )}

                    {/* Featured tip */}
                    {displayTips.length > 0 && (
                      <div className="tip-hero" style={{ marginBottom: 20 }}>
                        <div className="tip-qm">"</div>
                        <div>
                          <div className="tip-lbl">{CAT_ICON[displayTips[0].category] || '💡'} {displayTips[0].category} — Dernier conseil</div>
                          <div className="tip-quote">{displayTips[0].content}</div>
                          <div className="tip-author">— {displayTips[0].title} · <span style={{ color: 'var(--gold)' }}>{userName || 'Votre coach'}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Tips grid */}
                    <div className="advice-grid">
                      {displayTips.map((t: any, i: number) => (
                        <div key={t.id} className="adv-card" style={{ animation: 'fadeUp .35s ease both', animationDelay: `${i*60}ms` }}>
                          <div className="adv-icon">{CAT_ICON[t.category] || '💡'}</div>
                          <h4>{t.title}</h4>
                          <p>{t.content}</p>
                          <div style={{ marginTop: 12, display: 'flex', gap: 7, alignItems: 'center' }}>
                            <span className="badge badge-dim">{TIP_CATEGORIES.find(c => c.val === t.category)?.label || t.category}</span>
                            {!t.id.startsWith('mt') && (
                              <button className="btn btn-danger btn-xs" onClick={() => { /* delete tip if needed */ }}>Supprimer</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ══ TAB: ANALYSES ══ */}
                {activeTab === 'analyses' && (
                  <div>
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
                      {[
                        { label: 'Total clients',       val: displayClients.length,  sub: 'actifs' },
                        { label: 'Taux de rétention',   val: '89%',                   sub: '+3% vs mois dernier' },
                        { label: 'Durée moy. coaching', val: '7,2 sem.',             sub: 'par client' },
                        { label: 'Séances cette sem.',  val: '24',                   sub: '↑ vs sem. passée' },
                        { label: 'Conseils publiés',    val: displayTips.length,     sub: 'total' },
                        { label: 'Plans nutrition',     val: nutritionPlans.length || 4, sub: 'actifs' },
                      ].map(s => (
                        <div key={s.label} className="stat-box">
                          <div className="stat-box-val">{s.val}</div>
                          <div className="stat-box-label">{s.label}</div>
                          <div style={{ fontSize: '.6rem', color: 'var(--wd)', marginTop: 3 }}>{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bar chart */}
                    <div className="chart-card">
                      <div className="chart-header">
                        <div>
                          <div className="chart-title">📊 Séances par jour — Cette semaine</div>
                          <div className="chart-sub">Total : 45 séances · Moy. : 6.4/jour</div>
                        </div>
                        <span className="badge badge-green">+12% vs sem. passée</span>
                      </div>
                      <div className="bar-chart">
                        {CHART_BARS.map((b, i) => (
                          <div key={b.label} className="bar-col">
                            <div className="bar-val-tip">{b.h}%</div>
                            <div className="bar-fill" style={{ height: `${b.h}%`, animationDelay: `${i * 80}ms` }} />
                            <div className="bar-label">{b.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Client progression overview */}
                    <div className="chart-card">
                      <div className="chart-header">
                        <div>
                          <div className="chart-title">👥 Progression par client</div>
                          <div className="chart-sub">Taux de complétion des programmes</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {displayClients.map((c: any) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, color: 'var(--k0)', flexShrink: 0 }}>{c.initials || initials(c.name || 'C')}</div>
                            <div style={{ width: 100, fontSize: '.78rem', flexShrink: 0 }}>{c.name}</div>
                            <div style={{ flex: 1, height: 7, background: 'var(--k5)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,var(--gold-d),var(--gold))', borderRadius: 10, transition: 'width 1.5s ease' }} />
                            </div>
                            <span style={{ fontSize: '.75rem', color: 'var(--gold)', fontFamily: 'var(--fd)', minWidth: 32, textAlign: 'right' }}>{c.progress || 0}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'var(--k3)', border: '1px dashed var(--wf)', borderRadius: 'var(--r)', padding: '14px 18px', fontSize: '.75rem', color: 'var(--wd)', textAlign: 'center' }}>
                      <span style={{ color: 'var(--gold)' }}>📈 Prochainement :</span> Graphiques de revenus, taux d&apos;adhérence, comparaisons mensuelles, exports PDF.
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ── CTA → /coach ── */}
            <div style={{ marginTop: 40, background: 'linear-gradient(135deg,rgba(201,168,76,.07),rgba(201,168,76,.02))', border: '1px solid rgba(201,168,76,.18)', borderRadius: 'var(--rxl)', padding: 'clamp(28px,5vw,48px)', textAlign: 'center' }}>
              <div className="tag" style={{ marginBottom: 14 }}>⚡ Dashboard Complet</div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.4rem,3vw,2.2rem)', fontWeight: 300, fontStyle: 'italic', marginBottom: 12 }}>
                Gérez tout depuis votre <span className="gold-i">dashboard.</span>
              </h2>
              <p style={{ fontSize: '.88rem', color: 'var(--wd)', marginBottom: 26, maxWidth: 440, margin: '0 auto 26px', lineHeight: 1.8 }}>
                Créez des programmes, assignez des clients, gérez les abonnements et accédez à toutes les fonctionnalités avancées.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-gold" onClick={() => router.push('/coach')} style={{ padding: '14px 38px' }}>🏆 Ouvrir le dashboard →</button>
                <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Déconnexion</button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .spin-sm { width:14px; height:14px; border:2px solid rgba(6,6,6,.35); border-top-color:var(--k0); border-radius:50%; animation:spin .7s linear infinite; display:inline-block; flex-shrink:0 }
          @keyframes spin   { to { transform:rotate(360deg) } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
          .ov-grid { grid-template-columns: 1fr 340px }
          @media(max-width:900px) {
            .ov-grid { grid-template-columns: 1fr !important }
            .macro-grid { grid-template-columns: 1fr 1fr !important }
          }
          @media(max-width:600px) {
            .macro-grid { grid-template-columns: 1fr 1fr !important }
            .meal-macros-row { flex-wrap:wrap; gap:6px }
            .form-row { grid-template-columns: 1fr !important }
          }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
