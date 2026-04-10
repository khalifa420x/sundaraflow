'use client';

import FoodSearch from '@/components/shared/FoodSearch';
import CalorieCalculator from '@/components/CalorieCalculator';

const MEAL_PHOTOS: Record<string, string> = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=50',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=50',
  dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=50',
  snack: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=50',
};
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

interface NutritionTabProps {
  displayNut: any;
  todayTotals: { cal: number; p: number; c: number; f: number };
  foodLogs: any[];
  clientMeals: any[];
  hydration: number;
  showFoodModal: boolean;
  setShowFoodModal: (v: boolean) => void;
  selectedFood: any;
  setSelectedFood: (f: any) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  activeMealType: string;
  setActiveMealType: (m: string) => void;
  openFoodModal: (mealType: string) => void;
  handleAddFood: () => void;
  handleHydration: (liters: number) => void;
}

export default function NutritionTab({
  displayNut,
  todayTotals,
  foodLogs,
  clientMeals,
  hydration,
  showFoodModal,
  setShowFoodModal,
  selectedFood,
  setSelectedFood,
  quantity,
  setQuantity,
  activeMealType,
  setActiveMealType,
  openFoodModal,
  handleAddFood,
  handleHydration,
}: NutritionTabProps) {
  const goalCal = displayNut.calories || 2000;
  const goalP = displayNut.protein || 150;
  const goalC = displayNut.carbs || 200;
  const goalF = displayNut.fat || 65;
  const pct = Math.min(100, Math.round((todayTotals.cal / goalCal) * 100));
  const r = 55;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (circ * pct) / 100;
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const mealsByType: Record<string, any> = {};
  foodLogs.forEach((l: any) => { mealsByType[l.mealType] = l; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowX: 'hidden' }}>
      <style>{`
        @keyframes nutModalIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes nutFadeIn { from { opacity:0 } to { opacity:1 } }
        .nut-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width:768px){ .nut-grid-2 { grid-template-columns: 1fr; } }
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
      `}</style>

      {/* HERO */}
      <div style={{
        position:'relative', borderRadius:16, overflow:'hidden',
        backgroundImage: 'linear-gradient(135deg, rgba(19,19,19,0.85), rgba(19,19,19,0.55)), url(https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=60)',
        backgroundSize:'cover', backgroundPosition:'center',
        padding:'34px 26px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:18,
      }}>
        <div style={{ filter: 'brightness(1)' }}>
          <div style={{ fontSize:'.55rem', fontFamily:'Inter, sans-serif', fontWeight:600, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(229,226,225,0.5)', marginBottom:8 }}>{todayLabel}</div>
          <h2 style={{ fontFamily:'Lexend, sans-serif', fontWeight:900, fontSize:'clamp(2rem,5vw,3.5rem)', letterSpacing:'-.05em', color:'#e5e2e1', margin:'0 0 6px', lineHeight:.95 }}>
            MA NUTRITION<span style={{ color:'#b22a27' }}>.</span>
          </h2>
          <p style={{ fontSize:'.78rem', color:'#9CA3AF', fontFamily:'Inter, sans-serif', margin:0, maxWidth:420 }}>Suivi précis de vos apports. Performance par la donnée.</p>
        </div>
        <button className="nut-add-btn" onClick={() => openFoodModal('breakfast')} style={{ padding:'13px 22px', fontSize:'.75rem' }}>+ Ajouter un repas</button>
      </div>

      {/* SECTION 2 — BILAN */}
      <div className="nut-grid-2">
        {/* Apport journalier */}
        <div style={{ background:'#1c1b1b', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:22 }}>
          <div style={{ fontSize:'.55rem', fontFamily:'Lexend, sans-serif', fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:'#b22a27', marginBottom:18 }}>APPORT JOURNALIER</div>
          <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
            <div style={{ position:'relative', width:130, height:130, flexShrink:0 }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
                <circle cx="65" cy="65" r={r} stroke="#b22a27" strokeWidth="10" fill="none"
                  strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                  transform="rotate(-90 65 65)" style={{ transition:'stroke-dashoffset 1.2s ease' }} />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:900, fontSize:'1.3rem', color:'#e5e2e1', letterSpacing:'-.03em' }}>{pct}%</div>
                <div style={{ fontSize:'.5rem', fontFamily:'Inter, sans-serif', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.15em', marginTop:2 }}>objectif</div>
              </div>
            </div>
            <div style={{ flex:1, minWidth:120 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
                <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:900, fontSize:'clamp(2rem,5vw,3rem)', color:'#b22a27', letterSpacing:'-.05em', lineHeight:1 }}>{Math.round(todayTotals.cal).toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:'.7rem', color:'#9CA3AF', fontFamily:'Inter, sans-serif' }}>/ {goalCal.toLocaleString('fr-FR')} kcal</div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:11, marginTop:20 }}>
            {[
              { label:'Protéines', cur: todayTotals.p, goal: goalP },
              { label:'Glucides', cur: todayTotals.c, goal: goalC },
              { label:'Lipides', cur: todayTotals.f, goal: goalF },
            ].map(m => {
              const w = Math.min(100, (m.cur / m.goal) * 100);
              return (
                <div key={m.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:'.6rem', fontFamily:'Inter, sans-serif', fontWeight:600, color:'#9CA3AF', letterSpacing:'.1em', textTransform:'uppercase' }}>{m.label}</span>
                    <span style={{ fontFamily:'Lexend, sans-serif', fontWeight:700, fontSize:'.72rem', color:'#e5e2e1' }}>{m.cur.toFixed(0)}g <span style={{ color:'#6B7280' }}>/ {m.goal}g</span></span>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${w}%`, background:'linear-gradient(to right,#89070e,#b22a27)', borderRadius:9999, transition:'width 1s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hydratation */}
        <div style={{ background:'#1c1b1b', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:22 }}>
          <div style={{ fontSize:'.55rem', fontFamily:'Lexend, sans-serif', fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:'#b22a27', marginBottom:18 }}>HYDRATATION</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:18 }}>
            <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:900, fontSize:'clamp(2rem,5vw,2.5rem)', color:'#e5e2e1', letterSpacing:'-.05em', lineHeight:1 }}>{hydration.toFixed(1)} <span style={{ color:'#3b82f6' }}>L</span></div>
            <div style={{ fontSize:'.7rem', color:'#9CA3AF', fontFamily:'Inter, sans-serif' }}>/ 2.5 L</div>
          </div>
          <div style={{ display:'flex', gap:9, marginBottom:16, flexWrap:'wrap' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="nut-bubble" onClick={() => handleHydration(i * 0.5)}
                style={{ background: hydration >= i * 0.5 ? '#3b82f6' : 'rgba(59,130,246,0.08)' }} />
            ))}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="nut-pill" onClick={() => handleHydration(hydration + 0.25)}>+ 250 ml</button>
            <button className="nut-pill" onClick={() => handleHydration(hydration + 0.5)}>+ 500 ml</button>
            <button className="nut-pill" onClick={() => handleHydration(0)}>Reset</button>
          </div>
        </div>
      </div>

      {/* SECTION 3 — JEÛNE */}
      {displayNut.fastingType && displayNut.fastingType !== 'none' && (
        <div style={{ background:'#1c1b1b', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
          <div>
            <div style={{ fontSize:'.55rem', fontFamily:'Lexend, sans-serif', fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:'#b22a27', marginBottom:6 }}>PROTOCOLE DE JEÛNE</div>
            <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:900, fontSize:'1.6rem', color:'#e5e2e1', letterSpacing:'-.03em' }}>{displayNut.fastingType}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'.55rem', fontFamily:'Inter, sans-serif', fontWeight:600, letterSpacing:'.15em', textTransform:'uppercase', color:'#9CA3AF', marginBottom:4 }}>FENÊTRE ALIMENTAIRE</div>
            <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:700, fontSize:'1rem', color:'#e5e2e1' }}>{displayNut.windowStart || '12:00'} → {displayNut.windowEnd || '20:00'}</div>
          </div>
        </div>
      )}

      {/* SECTION 4 — REPAS DU JOUR */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {(['breakfast','lunch','dinner','snack'] as const).map(mt => {
          const log = mealsByType[mt];
          return (
            <div key={mt} className="nut-meal-card">
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:14, borderBottom: log ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width:60, height:60, borderRadius:10, backgroundImage:`url(${MEAL_PHOTOS[mt]})`, backgroundSize:'cover', backgroundPosition:'center', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:800, fontSize:'.85rem', color:'#e5e2e1', textTransform:'uppercase', letterSpacing:'.05em' }}>{MEAL_LABELS[mt]}</div>
                  <div style={{ fontSize:'.65rem', fontFamily:'Inter, sans-serif', color:'#9CA3AF', marginTop:3 }}>
                    {log ? `${log.totalCalories} kcal · P ${log.totalProtein}g · G ${log.totalCarbs}g · L ${log.totalFat}g` : 'Aucun aliment enregistré'}
                  </div>
                </div>
                <button className="nut-add-btn" onClick={() => openFoodModal(mt)} style={{ padding:'8px 14px', fontSize:'.65rem', flexShrink:0 }}>+</button>
              </div>
              {log?.items?.length > 0 && (
                <div style={{ padding:'8px 14px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                  {log.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'8px 12px', background:'rgba(255,255,255,0.02)', borderRadius:7 }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:'.75rem', fontFamily:'Inter, sans-serif', fontWeight:600, color:'#e5e2e1', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.name}</div>
                        <div style={{ fontSize:'.6rem', color:'#6B7280', marginTop:2 }}>{it.quantity}{it.unit} · P {it.protein}g · G {it.carbs}g · L {it.fat}g</div>
                      </div>
                      <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:700, fontSize:'.72rem', color:'#b22a27', flexShrink:0 }}>{it.calories} kcal</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SECTION 5 — PLAN COACH */}
      {clientMeals.length > 0 && (
        <div style={{ background:'#1c1b1b', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:22 }}>
          <div style={{ fontSize:'.55rem', fontFamily:'Lexend, sans-serif', fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:'#b22a27', marginBottom:18 }}>PLAN DE VOTRE COACH</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {clientMeals.map((meal: any) => (
              <div key={meal.id} style={{ display:'flex', gap:12, alignItems:'center', padding:12, background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width:42, height:42, borderRadius:9, background:'rgba(178,42,39,0.12)', border:'1px solid rgba(178,42,39,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>{meal.emoji || '🍽️'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:700, fontSize:'.8rem', color:'#e5e2e1' }}>{meal.name}</div>
                  <div style={{ fontSize:'.6rem', color:'#9CA3AF', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meal.time} · {meal.description}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:700, fontSize:'.75rem', color:'#b22a27' }}>{meal.calories} kcal</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculateur conservé */}
      <div className="cl-card">
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 10 }}>⚡ Outil personnel</div>
          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.2rem,3vw,1.6rem)', letterSpacing: '-.05em', color: '#e5e2e1', margin: '0 0 8px' }}>
            MON CALCULATEUR <span style={{ color: '#b22a27' }}>CALORIQUE.</span>
          </h2>
          <p style={{ fontSize: '.75rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', margin: 0 }}>Calculez vos besoins caloriques selon votre profil.</p>
        </div>
        <CalorieCalculator mode="membre" />
      </div>

      {/* MODAL */}
      {showFoodModal && (
        <div onClick={() => setShowFoodModal(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)',
          zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          animation:'nutFadeIn .25s ease',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background:'#1c1b1b', borderRadius:16, padding:24, width:'calc(100% - 0px)', maxWidth:500,
            maxHeight:'85vh', overflowY:'auto', border:'1px solid rgba(255,255,255,0.08)',
            animation:'nutModalIn .3s ease',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, gap:10 }}>
              <div>
                <div style={{ fontSize:'.55rem', fontFamily:'Lexend, sans-serif', fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:'#b22a27', marginBottom:5 }}>AJOUTER UN ALIMENT</div>
                <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:900, fontSize:'1.2rem', color:'#e5e2e1' }}>{MEAL_LABELS[activeMealType]}</div>
              </div>
              <button onClick={() => setShowFoodModal(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', color:'#e5e2e1', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:'1rem' }}>✕</button>
            </div>

            <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
              {(['breakfast','lunch','dinner','snack'] as const).map(mt => (
                <button key={mt} className={`nut-pill${activeMealType === mt ? ' active' : ''}`} onClick={() => setActiveMealType(mt)}>{MEAL_LABELS[mt]}</button>
              ))}
            </div>

            <div style={{ marginBottom:12 }}>
              <FoodSearch
                onAddItem={item => { setSelectedFood({ ...item, unit: 'g', category: 'glucide' }); setQuantity(100); }}
                placeholder="Rechercher un aliment..."
              />
            </div>

            {selectedFood && (
              <div style={{ background:'rgba(178,42,39,0.06)', border:'1px solid rgba(178,42,39,0.18)', borderRadius:10, padding:14, marginBottom:14 }}>
                <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:800, fontSize:'.85rem', color:'#e5e2e1', marginBottom:10 }}>{selectedFood.name}</div>
                <label style={{ fontSize:'.55rem', fontFamily:'Inter, sans-serif', fontWeight:600, letterSpacing:'.15em', textTransform:'uppercase', color:'#9CA3AF' }}>Quantité ({selectedFood.unit})</label>
                <input className="nut-input" type="number" min={1} max={2000} step={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, +e.target.value || 0))} style={{ marginTop:6, marginBottom:12 }} />
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {[
                    { l:'KCAL', v: Math.round(selectedFood.calories * quantity / 100) },
                    { l:'PROT', v: (selectedFood.protein * quantity / 100).toFixed(1) + 'g' },
                    { l:'GLU',  v: (selectedFood.carbs * quantity / 100).toFixed(1) + 'g' },
                    { l:'LIP',  v: (selectedFood.fat * quantity / 100).toFixed(1) + 'g' },
                  ].map(m => (
                    <div key={m.l} style={{ background:'rgba(0,0,0,0.3)', borderRadius:7, padding:'8px 6px', textAlign:'center' }}>
                      <div style={{ fontSize:'.5rem', fontFamily:'Inter, sans-serif', fontWeight:600, letterSpacing:'.12em', color:'#9CA3AF' }}>{m.l}</div>
                      <div style={{ fontFamily:'Lexend, sans-serif', fontWeight:800, fontSize:'.78rem', color:'#b22a27', marginTop:3 }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <button className="nut-add-btn" onClick={handleAddFood} style={{ width:'100%', marginTop:14, padding:'12px' }}>AJOUTER AU JOURNAL →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
