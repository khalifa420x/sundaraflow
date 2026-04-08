'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs, limit,
  doc, getDoc, addDoc, setDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';

/* ── Constants ── */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#9E1B1B,#b91c1c)',
  'linear-gradient(135deg,#7a1212,#9E1B1B)',
  'linear-gradient(135deg,#16a34a,#15803d)',
  'linear-gradient(135deg,#374151,#4B5563)',
  'linear-gradient(135deg,#1e1e1e,#2a2a2a)',
];
const FASTING_TYPES = [
  { val: 'none',  label: 'Pas de jeûne' },
  { val: '14/10', label: '14/10 — Débutant' },
  { val: '16/8',  label: '16/8 — Standard' },
  { val: '18/6',  label: '18/6 — Avancé' },
  { val: '20/4',  label: '20/4 — Expert' },
];
const MEAL_EMOJIS = ['🥚','🥗','🍗','🥩','🥑','🥜','🍌','🍎','🫐','🥤','🍽️','🥐','🍳','🥘','🥣','🍱','🥦','🌽'];
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
};

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'C';
const defaultNutForm = () => ({ calories: 2000, maintenanceCalories: 2500, protein: 150, carbs: 200, fat: 65, fastingType: '16/8', windowStart: '12:00', windowEnd: '20:00', notes: '' });
const defaultMealForm = () => ({ emoji: '🍽️', name: '', time: '12:00', description: '', calories: 500, protein: 35, carbs: 55, fat: 15 });

/* ════════════════════════════════════════════
   COACH NUTRITION PAGE
════════════════════════════════════════════ */
export default function CoachNutrition() {
  const router = useRouter();

  /* Auth */
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);

  /* Data */
  const [clients, setClients] = useState<any[]>([]);
  const [selClient, setSelClient] = useState<any>(null);
  const [nutritionPlans, setNutritionPlans] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [clientFoodLogs, setClientFoodLogs] = useState<any[]>([]);
  const [clientHydration, setClientHydration] = useState(0);

  /* UI */
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'repas' | 'journal'>('plan');
  const [showMealForm, setShowMealForm] = useState(false);
  const [showNutForm, setShowNutForm] = useState(false);

  /* Forms */
  const [nutForm, setNutForm] = useState(defaultNutForm());
  const [mealForm, setMealForm] = useState(defaultMealForm());
  const [savingNut, setSavingNut] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [deletingMeal, setDeletingMeal] = useState('');
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodDropdownOpen, setFoodDropdownOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  /* Computed */
  const selectedNutPlan = selClient ? nutritionPlans.find(n => n.clientId === selClient.clientUserId || n.clientId === selClient.userId) || null : null;
  const clientMeals = selClient ? meals.filter(m => m.clientId === (selClient.clientUserId || selClient.userId)) : [];
  const mealTotals = foodItems.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  useEffect(() => {
    if (foodDropdownOpen && searchWrapperRef.current) {
      const rect = searchWrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [foodDropdownOpen]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  /* Auth */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      setUser(u);
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

      const nSnap = await getDocs(query(collection(db, 'nutrition_assignments'), where('coachId', '==', u.uid)));
      setNutritionPlans(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const mSnap = await getDocs(query(collection(db, 'coach_meals'), where('coachId', '==', u.uid)));
      const mData = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      mData.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      setMeals(mData);
    } catch (e) {
      console.error(e);
      fireToast('❌', 'Erreur', 'Impossible de charger les données.');
    }
    setLoading(false);
  }, [user]);

  /* Fetch food logs + hydration for selected client */
  const fetchClientLogs = useCallback(async (client: any) => {
    if (!client?.clientUserId) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const flSnap = await getDocs(query(
        collection(db, 'food_logs'),
        where('clientId', '==', client.clientUserId),
        where('date', '==', today)
      ));
      setClientFoodLogs(flSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setClientFoodLogs([]); }
    try {
      const hDoc = await getDoc(doc(db, 'hydration_logs', `${client.clientUserId}_${today}`));
      setClientHydration(hDoc.exists() ? (hDoc.data()?.liters || 0) : 0);
    } catch { setClientHydration(0); }
  }, []);

  useEffect(() => { if (user) fetchAll(user); }, [user]);

  useEffect(() => {
    if (!selClient) return;
    fetchClientLogs(selClient);
    const plan = nutritionPlans.find(n => n.clientId === selClient.clientUserId || n.clientId === selClient.userId);
    if (plan) {
      setNutForm({ calories: plan.calories || 2000, maintenanceCalories: plan.maintenanceCalories || 2500, protein: plan.protein || 150, carbs: plan.carbs || 200, fat: plan.fat || 65, fastingType: plan.fastingType || '16/8', windowStart: plan.windowStart || '12:00', windowEnd: plan.windowEnd || '20:00', notes: plan.notes || '' });
    } else {
      setNutForm(defaultNutForm());
    }
  }, [selClient, nutritionPlans]);

  /* Handlers */
  const handleSaveNut = async () => {
    if (!user || !selClient) return;
    setSavingNut(true);
    const clientUserId = selClient.clientUserId || selClient.userId;
    try {
      await setDoc(doc(db, 'nutrition_assignments', `${user.uid}_${clientUserId}`), {
        coachId: user.uid, clientId: clientUserId, ...nutForm, updatedAt: Timestamp.now(),
      }, { merge: true });
      fireToast('✅', 'Plan sauvegardé', `Plan de ${selClient.name} mis à jour.`);
      setShowNutForm(false);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible de sauvegarder.'); }
    setSavingNut(false);
  };

  const handleAddMeal = async () => {
    if (!user || !selClient || !mealForm.name || foodItems.length === 0) return;
    setSavingMeal(true);
    const clientUserId = selClient.clientUserId || selClient.userId;
    try {
      await addDoc(collection(db, 'coach_meals'), {
        coachId: user.uid, clientId: clientUserId, clientName: selClient.name,
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
      setFoodItems([]);
      setFoodQuery('');
      setShowMealForm(false);
      await fetchAll(user);
    } catch { fireToast('❌', 'Erreur', "Impossible d'ajouter."); }
    setSavingMeal(false);
  };

  const searchFoodItems = async (q: string) => {
    console.log('searchFoodItems appelé avec:', q);
    if (!q || q.trim().length < 2) { setFoodResults([]); setFoodDropdownOpen(false); return; }
    setFoodLoading(true);
    try {
      const r = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=10&fields=product_name,nutriments`
      );
      const j = await r.json();
      const items = (j?.products || [])
        .filter((p: any) => p?.product_name && p?.nutriments?.['energy-kcal_100g'])
        .map((p: any) => ({
          name: String(p.product_name).slice(0, 60),
          quantity: 100,
          calories: Math.round(Number(p.nutriments['energy-kcal_100g']) || 0),
          protein: Math.round((Number(p.nutriments?.proteins_100g) || 0) * 10) / 10,
          carbs: Math.round((Number(p.nutriments?.carbohydrates_100g) || 0) * 10) / 10,
          fat: Math.round((Number(p.nutriments?.fat_100g) || 0) * 10) / 10,
        }))
        .slice(0, 8);
      console.log('résultats reçus:', items.length, items);
      setFoodResults(items);
      setFoodDropdownOpen(items.length > 0);
      console.log('foodDropdownOpen mis à:', items.length > 0);
    } catch { setFoodResults([]); }
    setFoodLoading(false);
  };

  const handleAddFoodItem = (item: any) => {
    setFoodItems(prev => [...prev, { ...item }]);
    setFoodQuery(''); setFoodResults([]); setFoodDropdownOpen(false);
  };

  const handleRemoveFoodItem = (index: number) => {
    setFoodItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFoodQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setFoodItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const ratio = newQty / (item.quantity || 100);
      return { ...item, quantity: newQty,
        calories: Math.round(item.calories * ratio),
        protein: Math.round(item.protein * ratio * 10) / 10,
        carbs: Math.round(item.carbs * ratio * 10) / 10,
        fat: Math.round(item.fat * ratio * 10) / 10,
      };
    }));
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

  /* ── Shared styles ── */
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#2a2a2a',
    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
    padding: '11px 13px', color: '#e5e2e1', fontFamily: 'Inter, sans-serif',
    fontSize: '.85rem', outline: 'none',
  };
  const redBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg,#89070e,#b22a27)', border: 'none', color: '#fff',
    padding: '11px 20px', borderRadius: 8, fontFamily: 'Lexend, sans-serif', fontWeight: 800,
    fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
    transition: 'transform .2s, box-shadow .2s',
  };
  const ghostBtn: React.CSSProperties = {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
    padding: '10px 18px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem',
    letterSpacing: '.1em', textTransform: 'uppercase', color: '#9CA3AF', cursor: 'pointer',
  };
  const label12: React.CSSProperties = {
    fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600,
    letterSpacing: '.18em', textTransform: 'uppercase', color: '#9CA3AF',
  };
  const card: React.CSSProperties = {
    background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 22,
  };

  /* Journal computed */
  const logsByType: Record<string, any> = {};
  clientFoodLogs.forEach((l: any) => { logsByType[l.mealType] = l; });
  const jTotals = clientFoodLogs.reduce(
    (a, l: any) => ({ cal: a.cal + (l.totalCalories || 0), p: a.p + (l.totalProtein || 0), c: a.c + (l.totalCarbs || 0), f: a.f + (l.totalFat || 0) }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
          @keyframes cnSpin { to { transform: rotate(360deg); } }
          @keyframes cnFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          @keyframes cnModalIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
          .cn-root { display: flex; min-height: 100vh; background: #131313; color: #e5e2e1; font-family: 'Inter', sans-serif; overflow-x: hidden; }
          .cn-main { flex: 1; min-width: 0; margin-left: 240px; width: calc(100vw - 240px); min-height: 100vh; overflow-x: hidden; }
          .cn-bar-fill { height: 100%; border-radius: 9999px; transition: width 1s ease; }
          .cn-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .cn-grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
          .cn-tab-pill { padding: 9px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); color: #9CA3AF; font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .2s; white-space: nowrap; }
          .cn-tab-pill.active { background: #b22a27; border-color: #b22a27; color: #fff; }
          .cn-client-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); cursor: pointer; transition: all .2s; white-space: nowrap; flex-shrink: 0; }
          .cn-client-pill.active { background: rgba(178,42,39,0.2); border-color: rgba(178,42,39,0.5); }
          .cn-fld { display: flex; flex-direction: column; gap: 6px; }
          .cn-fld label { font-size: .55rem; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #9CA3AF; }
          .cn-fld input, .cn-fld select, .cn-fld textarea { background: #2a2a2a; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 11px 13px; color: #e5e2e1; font-family: 'Inter', sans-serif; font-size: .85rem; outline: none; width: 100%; box-sizing: border-box; }
          .cn-fld textarea { resize: vertical; min-height: 80px; }
          .cn-fld input:focus, .cn-fld select:focus { border-color: rgba(178,42,39,0.5); }
          .cn-meal-card { background: #1c1b1b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; transition: border-color .2s; }
          .cn-meal-card:hover { border-color: rgba(178,42,39,0.25); }
          .cn-emoji-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: border-color .15s; }
          .cn-emoji-btn.active { border-color: #b22a27; background: rgba(178,42,39,0.12); }
          .cn-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          @media(max-width:767px){
            .cn-main { margin-left: 0; width: 100%; padding-top: 56px; }
            .cn-grid2 { grid-template-columns: 1fr; }
            .cn-grid4 { grid-template-columns: 1fr 1fr; }
            .cn-form-grid { grid-template-columns: 1fr; }
          }
          @media(max-width:480px){ .cn-grid4 { grid-template-columns: 1fr 1fr; } }
        `}</style>

        <div className="cn-root">
          <Sidebar role="coach" onSignOut={handleSignOut} />

          <main className="cn-main">
            {/* ── HERO ── */}
            <section style={{ position: 'relative', height: 'clamp(220px,30vh,340px)', overflow: 'hidden', flexShrink: 0 }}>
              <img
                src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=60"
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.2) saturate(0.8)' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.95) 0%, rgba(19,19,19,0.5) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, #131313, transparent)' }} />
              <div style={{
                position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', padding: 'clamp(18px,4vw,40px)',
                opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(14px)',
                transition: 'opacity .6s ease, transform .6s ease',
              }}>
                <div style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(229,226,225,0.45)', marginBottom: 8 }}>ESPACE COACH — NUTRITION</div>
                <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.8rem,4.5vw,3.6rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: .88, marginBottom: 10, color: '#e5e2e1' }}>
                  NUTRITION <span style={{ color: '#b22a27', fontStyle: 'italic' }}>MEMBRES.</span>
                </h1>
                <p style={{ fontSize: 'clamp(.8rem,1.4vw,.9rem)', color: '#9CA3AF', maxWidth: 440, lineHeight: 1.75, margin: 0 }}>
                  Gérez les plans nutritionnels de votre équipe.
                </p>
              </div>
            </section>

            {/* ── CONTENT ── */}
            <div style={{ padding: 'clamp(16px,2.5vw,32px)', display: 'flex', flexDirection: 'column', gap: 20, opacity: mounted ? 1 : 0, transition: 'opacity .4s ease .15s' }}>

              {/* ── CLIENT SELECTOR ── */}
              <div>
                <div style={{ ...label12, marginBottom: 10 }}>SÉLECTIONNER UN MEMBRE</div>
                {loading ? (
                  <div style={{ fontSize: '.72rem', color: '#9CA3AF' }}>Chargement…</div>
                ) : clients.length === 0 ? (
                  <div style={{ ...card, fontSize: '.75rem', color: '#9CA3AF' }}>Aucun membre trouvé. Invitez des clients via la page Membres.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {clients.map((c: any) => (
                      <div
                        key={c.id}
                        className={`cn-client-pill${selClient?.id === c.id ? ' active' : ''}`}
                        onClick={() => { setSelClient(c); setActiveTab('plan'); setClientFoodLogs([]); setClientHydration(0); fetchClientLogs(c); }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{c.initials}</div>
                        <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: selClient?.id === c.id ? '#fff' : '#9CA3AF' }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selClient && (
                <>
                  {/* ── TABS ── */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { key: 'plan', label: 'Plan nutritionnel' },
                      { key: 'repas', label: 'Repas' },
                      { key: 'journal', label: 'Journal du jour' },
                    ].map(t => (
                      <button key={t.key} className={`cn-tab-pill${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key as any)}>{t.label}</button>
                    ))}
                  </div>

                  {/* ════ TAB 1 — PLAN NUTRITIONNEL ════ */}
                  {activeTab === 'plan' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'cnFadeIn .3s ease' }}>
                      {/* Plan existant */}
                      {selectedNutPlan && !showNutForm && (
                        <div style={card}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                            <div>
                              <div style={{ ...label12, marginBottom: 5 }}>PLAN ACTUEL — {selClient.name?.toUpperCase()}</div>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#e5e2e1' }}>Plan nutritionnel</div>
                            </div>
                            <button style={redBtn} onClick={() => setShowNutForm(true)}>MODIFIER LE PLAN</button>
                          </div>

                          {/* Macros grid */}
                          <div className="cn-grid4" style={{ marginBottom: 20 }}>
                            {[
                              { label: 'Calories', val: selectedNutPlan.calories, unit: 'kcal' },
                              { label: 'Protéines', val: selectedNutPlan.protein, unit: 'g' },
                              { label: 'Glucides', val: selectedNutPlan.carbs, unit: 'g' },
                              { label: 'Lipides', val: selectedNutPlan.fat, unit: 'g' },
                            ].map(s => (
                              <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                <div style={{ ...label12, marginBottom: 6 }}>{s.label}</div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#b22a27', letterSpacing: '-.04em' }}>{s.val}</div>
                                <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>{s.unit}</div>
                              </div>
                            ))}
                          </div>

                          {/* Jeûne */}
                          {selectedNutPlan.fastingType && selectedNutPlan.fastingType !== 'none' && (
                            <div style={{ background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.16)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                              <div>
                                <div style={{ ...label12, marginBottom: 4 }}>PROTOCOLE JEÛNE</div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#b22a27' }}>{selectedNutPlan.fastingType}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ ...label12, marginBottom: 4 }}>FENÊTRE ALIMENTAIRE</div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.9rem', color: '#e5e2e1' }}>{selectedNutPlan.windowStart} → {selectedNutPlan.windowEnd}</div>
                              </div>
                            </div>
                          )}

                          {/* Maintenance / déficit */}
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: selectedNutPlan.notes ? 14 : 0 }}>
                            {[
                              { l: 'Maintenance', v: `${selectedNutPlan.maintenanceCalories || '—'} kcal` },
                              { l: 'Déficit', v: `${((selectedNutPlan.maintenanceCalories || 2500) - (selectedNutPlan.calories || 2000))} kcal` },
                            ].map(item => (
                              <div key={item.l} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                                <div style={{ ...label12, marginBottom: 3 }}>{item.l}</div>
                                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.85rem', color: '#e5e2e1' }}>{item.v}</div>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {selectedNutPlan.notes && (
                            <div style={{ background: 'rgba(178,42,39,0.04)', border: '1px solid rgba(178,42,39,0.12)', borderRadius: 8, padding: '12px 16px' }}>
                              <div style={{ ...label12, marginBottom: 6 }}>NOTES DU COACH</div>
                              <p style={{ fontSize: '.75rem', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', lineHeight: 1.65, margin: 0 }}>{selectedNutPlan.notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* No plan yet */}
                      {!selectedNutPlan && !showNutForm && (
                        <div style={{ ...card, textAlign: 'center', padding: '36px 22px' }}>
                          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🥗</div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#e5e2e1', marginBottom: 6 }}>{selClient.name} n'a pas encore de plan</div>
                          <p style={{ fontSize: '.72rem', color: '#9CA3AF', marginBottom: 18 }}>Créez un plan nutritionnel personnalisé pour ce membre.</p>
                          <button style={redBtn} onClick={() => setShowNutForm(true)}>CRÉER UN PLAN</button>
                        </div>
                      )}

                      {/* Formulaire */}
                      {showNutForm && (
                        <div style={{ ...card, animation: 'cnModalIn .3s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                              <div style={{ ...label12, marginBottom: 5 }}>{selectedNutPlan ? 'MODIFIER' : 'CRÉER'} LE PLAN — {selClient.name?.toUpperCase()}</div>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#e5e2e1' }}>Plan nutritionnel</div>
                            </div>
                            <button style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#e5e2e1', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }} onClick={() => setShowNutForm(false)}>✕</button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
                            {[
                              { label: 'Calories objectif (kcal)', key: 'calories' },
                              { label: 'Calories maintenance (kcal)', key: 'maintenanceCalories' },
                              { label: 'Protéines (g)', key: 'protein' },
                              { label: 'Glucides (g)', key: 'carbs' },
                              { label: 'Lipides (g)', key: 'fat' },
                            ].map(f => (
                              <div key={f.key} className="cn-fld">
                                <label>{f.label}</label>
                                <input type="number" value={(nutForm as any)[f.key]} onChange={e => setNutForm(p => ({ ...p, [f.key]: Number(e.target.value) }))} min={0} />
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
                            <div className="cn-fld">
                              <label>Protocole de jeûne</label>
                              <select value={nutForm.fastingType} onChange={e => setNutForm(p => ({ ...p, fastingType: e.target.value }))}>
                                {FASTING_TYPES.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
                              </select>
                            </div>
                            {nutForm.fastingType !== 'none' && (
                              <>
                                <div className="cn-fld">
                                  <label>Début fenêtre</label>
                                  <input type="time" value={nutForm.windowStart} onChange={e => setNutForm(p => ({ ...p, windowStart: e.target.value }))} />
                                </div>
                                <div className="cn-fld">
                                  <label>Fin fenêtre</label>
                                  <input type="time" value={nutForm.windowEnd} onChange={e => setNutForm(p => ({ ...p, windowEnd: e.target.value }))} />
                                </div>
                              </>
                            )}
                          </div>

                          <div className="cn-fld" style={{ marginBottom: 18 }}>
                            <label>Notes pour le client</label>
                            <textarea value={nutForm.notes} onChange={e => setNutForm(p => ({ ...p, notes: e.target.value }))} placeholder="Conseils, recommandations, consignes particulières…" />
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            <button style={redBtn} onClick={handleSaveNut} disabled={savingNut}>
                              {savingNut ? 'Sauvegarde…' : 'SAUVEGARDER →'}
                            </button>
                            <button style={ghostBtn} onClick={() => setShowNutForm(false)}>Annuler</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ════ TAB 2 — REPAS ════ */}
                  {activeTab === 'repas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'cnFadeIn .3s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.2rem,3vw,1.8rem)', letterSpacing: '-.03em', color: '#e5e2e1' }}>
                          REPAS <span style={{ color: '#b22a27' }}>DE {selClient.name?.toUpperCase().split(' ')[0]}.</span>
                        </div>
                        <button style={redBtn} onClick={() => setShowMealForm(true)}>+ AJOUTER UN REPAS</button>
                      </div>

                      {/* Meal list */}
                      {clientMeals.length === 0 ? (
                        <div style={{ ...card, textAlign: 'center', padding: '32px 22px' }}>
                          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🍽️</div>
                          <p style={{ fontSize: '.75rem', color: '#9CA3AF' }}>Aucun repas créé pour {selClient.name}. Ajoutez le premier repas.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {clientMeals.map((meal: any) => (
                            <div key={meal.id} className="cn-meal-card">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{meal.emoji || '🍽️'}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem', color: '#e5e2e1' }}>{meal.name}</div>
                                  <div style={{ fontSize: '.62rem', color: '#9CA3AF', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.time} · {meal.description}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.82rem', color: '#b22a27' }}>{meal.calories} kcal</div>
                                  <div style={{ fontSize: '.58rem', color: '#9CA3AF', marginTop: 2 }}>P {meal.protein}g · G {meal.carbs}g · L {meal.fat}g</div>
                                </div>
                                <button
                                  onClick={() => handleDeleteMeal(meal.id)}
                                  disabled={deletingMeal === meal.id}
                                  style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', flexShrink: 0 }}
                                  title="Supprimer"
                                >
                                  {deletingMeal === meal.id ? '…' : '🗑️'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add meal modal */}
                      {showMealForm && (
                        <div
                          onClick={() => { setShowMealForm(false); setFoodItems([]); setFoodQuery(''); }}
                          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        >
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{ background: '#1c1b1b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', animation: 'cnModalIn .3s ease' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#e5e2e1' }}>AJOUTER UN REPAS</div>
                              <button onClick={() => { setShowMealForm(false); setFoodItems([]); setFoodQuery(''); }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#e5e2e1', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                            </div>

                            {/* Résumé temps réel */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20, padding: 14, background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.2)', borderRadius: 10 }}>
                              {[
                                { label: 'CALORIES', val: mealTotals.calories, unit: 'kcal' },
                                { label: 'PROTÉINES', val: mealTotals.protein, unit: 'g' },
                                { label: 'GLUCIDES', val: mealTotals.carbs, unit: 'g' },
                                { label: 'LIPIDES', val: mealTotals.fat, unit: 'g' },
                              ].map(m => (
                                <div key={m.label} style={{ textAlign: 'center' }}>
                                  <div style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 900, fontSize: 'clamp(.9rem,2vw,1.3rem)', color: '#b22a27', lineHeight: 1 }}>{m.val}</div>
                                  <div style={{ fontSize: '.5rem', color: '#9CA3AF', marginTop: 2 }}>{m.unit}</div>
                                  <div style={{ fontSize: '.46rem', color: '#6B7280', marginTop: 1 }}>{m.label}</div>
                                </div>
                              ))}
                            </div>

                            {/* Nom + Heure */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ ...label12 }}>Nom du repas</label>
                                <input type="text" value={mealForm.name} onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex : Déjeuner Performance" style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '9px 12px', color: '#e5e2e1', fontSize: '.84rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ ...label12 }}>Heure</label>
                                <input type="time" value={mealForm.time} onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))} style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '9px 12px', color: '#e5e2e1', fontSize: '.84rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                              </div>
                            </div>

                            {/* Recherche aliments */}
                            <div ref={searchWrapperRef} style={{ marginBottom: 14, position: 'relative' }}>
                              <label style={{ ...label12, display: 'block', marginBottom: 6 }}>Rechercher un aliment</label>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  type="text"
                                  value={foodQuery}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFoodQuery(val);
                                    clearTimeout(searchTimer.current);
                                    if (val.length >= 2) {
                                      searchTimer.current = setTimeout(() => searchFoodItems(val), 250);
                                    } else {
                                      setFoodResults([]);
                                      setFoodDropdownOpen(false);
                                    }
                                  }}
                                  placeholder="Ex : poulet, riz basmati, avocat…"
                                  style={{ flex: 1, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '9px 12px', color: '#e5e2e1', fontSize: '.84rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                                {foodLoading && <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', borderRadius: '50%', animation: 'cnSpin .7s linear infinite', flexShrink: 0 }} />}
                              </div>
                              {foodDropdownOpen && foodResults.length > 0 && (
                                <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, zIndex: 9999, maxHeight: 220, overflowY: 'auto' }}>
                                  {foodResults.map((item, i) => (
                                    <div key={i} onClick={() => handleAddFoodItem(item)}
                                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(178,42,39,0.1)'}
                                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                                    >
                                      <div>
                                        <div style={{ fontSize: '.82rem', color: '#e5e2e1', fontWeight: 500 }}>{item.name.length > 45 ? item.name.slice(0, 45) + '…' : item.name}</div>
                                        <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2 }}>{item.calories} kcal · P{item.protein}g · G{item.carbs}g · L{item.fat}g · /100g</div>
                                      </div>
                                      <span style={{ color: '#b22a27', fontWeight: 700, fontSize: '1.2rem', marginLeft: 8 }}>+</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Aliments ajoutés */}
                            {foodItems.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ ...label12, marginBottom: 8 }}>Aliments ajoutés</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {foodItems.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '.8rem', color: '#e5e2e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                        <div style={{ fontSize: '.62rem', color: '#b22a27', fontFamily: 'Lexend,sans-serif', fontWeight: 700, marginTop: 2 }}>{item.calories} kcal · P{item.protein}g · G{item.carbs}g · L{item.fat}g</div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <input type="number" value={item.quantity} min={1}
                                          onChange={e => handleUpdateFoodQuantity(i, Number(e.target.value))}
                                          style={{ width: 58, textAlign: 'center', padding: '5px 6px', fontSize: '.78rem', background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, color: '#e5e2e1', outline: 'none' }}
                                        />
                                        <span style={{ fontSize: '.6rem', color: '#6B7280' }}>g</span>
                                        <button onClick={() => handleRemoveFoodItem(i)}
                                          style={{ background: 'rgba(220,38,38,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#f87171', fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Description */}
                            <div style={{ marginBottom: 18 }}>
                              <label style={{ ...label12, display: 'block', marginBottom: 6 }}>Description / notes</label>
                              <textarea rows={2} value={mealForm.description} onChange={e => setMealForm(p => ({ ...p, description: e.target.value }))} placeholder="Notes pour le membre…"
                                style={{ width: '100%', background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '9px 12px', color: '#e5e2e1', fontSize: '.84rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter,sans-serif' }}
                              />
                            </div>

                            {/* Boutons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button
                                onClick={handleAddMeal}
                                disabled={savingMeal || !mealForm.name || foodItems.length === 0}
                                style={{ flex: 1, background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#e5e2e1', border: 'none', borderRadius: 8, padding: '13px', fontFamily: 'Lexend,sans-serif', fontWeight: 800, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44, opacity: (savingMeal || !mealForm.name || foodItems.length === 0) ? .5 : 1 }}
                              >
                                {savingMeal ? 'Ajout…' : 'Ajouter le repas →'}
                              </button>
                              <button
                                onClick={() => { setShowMealForm(false); setFoodItems([]); setFoodQuery(''); }}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '13px 18px', fontFamily: 'Lexend,sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#9CA3AF', cursor: 'pointer', minHeight: 44 }}
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ════ TAB 3 — JOURNAL DU JOUR ════ */}
                  {activeTab === 'journal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'cnFadeIn .3s ease' }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.2rem,3vw,1.8rem)', letterSpacing: '-.03em', color: '#e5e2e1' }}>
                        JOURNAL <span style={{ color: '#b22a27' }}>DU JOUR.</span>
                      </div>

                      {/* Bilan macros */}
                      <div style={card}>
                        <div style={{ ...label12, marginBottom: 16 }}>BILAN JOURNALIER</div>
                        <div className="cn-grid4" style={{ marginBottom: 20 }}>
                          {[
                            { l: 'Calories', cur: Math.round(jTotals.cal), goal: selectedNutPlan?.calories || 2000, u: 'kcal' },
                            { l: 'Protéines', cur: Math.round(jTotals.p), goal: selectedNutPlan?.protein || 150, u: 'g' },
                            { l: 'Glucides', cur: Math.round(jTotals.c), goal: selectedNutPlan?.carbs || 200, u: 'g' },
                            { l: 'Lipides', cur: Math.round(jTotals.f), goal: selectedNutPlan?.fat || 65, u: 'g' },
                          ].map(m => (
                            <div key={m.l} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                              <div style={{ ...label12, marginBottom: 4 }}>{m.l}</div>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#b22a27', letterSpacing: '-.03em' }}>{m.cur}</div>
                              <div style={{ fontSize: '.55rem', color: '#9CA3AF', marginBottom: 8 }}>/ {m.goal} {m.u}</div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                                <div className="cn-bar-fill" style={{ width: `${Math.min(100, (m.cur / m.goal) * 100)}%`, background: 'linear-gradient(to right,#89070e,#b22a27)' }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Hydratation */}
                        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                              <div style={{ ...label12, color: '#3b82f6', marginBottom: 4 }}>HYDRATATION</div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: '#e5e2e1' }}>{clientHydration.toFixed(1)}</span>
                                <span style={{ fontSize: '.7rem', color: '#9CA3AF' }}>/ 2.5 L</span>
                              </div>
                            </div>
                            <div style={{ flex: 1, minWidth: 120, maxWidth: 260 }}>
                              <div style={{ height: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (clientHydration / 2.5) * 100)}%`, background: 'linear-gradient(to right,#1d4ed8,#3b82f6)', borderRadius: 999, transition: 'width 1s ease' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sections repas */}
                      {clientFoodLogs.length === 0 ? (
                        <div style={{ ...card, textAlign: 'center', padding: '28px 22px' }}>
                          <p style={{ fontSize: '.75rem', color: '#9CA3AF' }}>{selClient.name} n'a rien enregistré aujourd'hui.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(mt => {
                            const log = logsByType[mt];
                            if (!log) return (
                              <div key={mt} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
                                <span style={{ fontSize: '1.2rem' }}>{MEAL_ICONS[mt]}</span>
                                <div>
                                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', color: '#e5e2e1', textTransform: 'uppercase' }}>{MEAL_LABELS[mt]}</div>
                                  <div style={{ fontSize: '.62rem', color: '#9CA3AF' }}>Aucun aliment enregistré</div>
                                </div>
                              </div>
                            );
                            return (
                              <div key={mt} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <span style={{ fontSize: '1.3rem' }}>{MEAL_ICONS[mt]}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#e5e2e1', textTransform: 'uppercase' }}>{MEAL_LABELS[mt]}</div>
                                    <div style={{ fontSize: '.62rem', color: '#9CA3AF', marginTop: 2 }}>
                                      {log.totalCalories} kcal · P {log.totalProtein}g · G {log.totalCarbs}g · L {log.totalFat}g
                                    </div>
                                  </div>
                                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.82rem', color: '#b22a27' }}>{log.totalCalories} kcal</div>
                                </div>
                                {log.items?.length > 0 && (
                                  <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {log.items.map((it: any, idx: number) => (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 7 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '.75rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#e5e2e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                                          <div style={{ fontSize: '.58rem', color: '#6B7280', marginTop: 2 }}>{it.quantity}{it.unit} · P {it.protein}g · G {it.carbs}g · L {it.fat}g</div>
                                        </div>
                                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', color: '#b22a27', flexShrink: 0 }}>{it.calories} kcal</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ ...card, textAlign: 'center', padding: '12px 16px', background: 'rgba(178,42,39,0.04)', border: '1px solid rgba(178,42,39,0.1)' }}>
                        <p style={{ fontSize: '.68rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', margin: 0, lineHeight: 1.6 }}>
                          💡 Ces données sont saisies par {selClient.name} en temps réel depuis son application.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </>
    </ProtectedRoute>
  );
}
