'use client';

import FoodSearch from '@/components/shared/FoodSearch';
import { recalculateForQuantity } from '@/lib/nutrition';

interface NutritionTabProps {
  clients: any[];
  selClient: any;
  setSelClient: (c: any) => void;
  displayNutData: any;
  displayMeals: any[];
  nutForm: any;
  setNutForm: (fn: (f: any) => any) => void;
  mealForm: any;
  setMealForm: (fn: (f: any) => any) => void;
  showNutForm: boolean;
  setShowNutForm: (fn: (f: boolean) => boolean) => void;
  showMealForm: boolean;
  setShowMealForm: (fn: (f: boolean) => boolean) => void;
  savingNut: boolean;
  savingMeal: boolean;
  deletingMeal: string;
  handleSaveNut: () => void;
  handleAddMeal: () => void;
  handleDeleteMeal: (id: string) => void;
  foodItems: any[];
  setFoodItems: (fn: (prev: any[]) => any[]) => void;
  mealTotals: { calories: number; protein: number; carbs: number; fat: number };
  mealFeedback: string[];
  FASTING_TYPES: { val: string; label: string }[];
  S: Record<string, React.CSSProperties>;
  initials: (n: string) => string;
}

const NInput = ({ label, type = 'number', val, set, min, max }: any) => (
  <div className="fld">
    <label>{label}</label>
    <input
      type={type}
      value={val}
      min={min}
      max={max}
      onChange={e => set(type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  </div>
);

export default function NutritionTab({
  clients, selClient, setSelClient, displayNutData, displayMeals,
  nutForm, setNutForm, mealForm, setMealForm,
  showNutForm, setShowNutForm, showMealForm, setShowMealForm,
  savingNut, savingMeal, deletingMeal,
  handleSaveNut, handleAddMeal, handleDeleteMeal,
  foodItems, setFoodItems, mealTotals, mealFeedback,
  FASTING_TYPES, S, initials,
}: NutritionTabProps) {
  const deficit   = (displayNutData.maintenanceCalories || 2500) - (displayNutData.calories || 2000);
  const weeklyKg  = (deficit * 7 / 7700).toFixed(2);
  const defColor  = deficit > 0 ? '#16a34a' : deficit < 0 ? '#f87171' : '#9CA3AF';

  const handleAddFoodItem = (item: any) => {
    setFoodItems(prev => [...prev, { ...item }]);
  };
  const handleRemoveFoodItem = (idx: number) => setFoodItems(prev => prev.filter((_, i) => i !== idx));
  const handleUpdateFoodQuantity = (idx: number, qty: number) => {
    if (qty <= 0) return;
    setFoodItems(prev => prev.map((item, i) => i === idx ? recalculateForQuantity(item, qty) : item));
  };

  return (
    <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <span style={S.tag}>🥗 Plans</span>
        <h2 style={S.sectionHead}>NUTRITION <span style={{ color: '#b22a27' }}>MEMBRES.</span></h2>
      </div>

      {/* Member selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={S.label}>Membre :</span>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {clients.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelClient(c)}
              style={{
                padding: '7px 13px', borderRadius: 6, fontSize: '.74rem', cursor: 'pointer', transition: 'all .2s',
                border: `1px solid ${selClient?.id === c.id ? 'rgba(178,42,39,0.4)' : 'rgba(255,255,255,0.06)'}`,
                background: selClient?.id === c.id ? 'rgba(178,42,39,0.1)' : '#2a2a2a',
                color: selClient?.id === c.id ? '#e3beb8' : '#9CA3AF',
                fontFamily: 'Lexend, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem', fontWeight: 700, color: '#fff', fontFamily: 'Lexend, sans-serif' }}>
                {c.initials || initials(c.name || 'C')}
              </span>
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
          <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-.04em', color: defColor, lineHeight: 1 }}>
            {deficit > 0 ? `−${deficit}` : `+${Math.abs(deficit)}`} kcal
          </div>
          <div style={{ fontSize: '.66rem', color: '#9CA3AF', marginTop: 4 }}>
            Maintenance {displayNutData.maintenanceCalories?.toLocaleString('fr-FR')} → Objectif {displayNutData.calories?.toLocaleString('fr-FR')} kcal
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...S.label, marginBottom: 3 }}>Estimation / semaine</div>
          <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.3rem', fontWeight: 900, color: defColor }}>{deficit > 0 ? '−' : '+'}{Math.abs(parseFloat(weeklyKg))} kg</div>
        </div>
      </div>

      {/* Repas header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={S.label}>Plan repas — {selClient?.name || 'Exemple'}</span>
        <button style={S.ghostBtn} onClick={() => { setShowMealForm(f => !f); setFoodItems(() => []); }}>
          {showMealForm ? '✕ Annuler' : '+ Ajouter un repas'}
        </button>
      </div>

      {/* Meal form */}
      {showMealForm && (
        <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          {/* Résumé nutritionnel temps réel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20, padding: '14px', background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.2)', borderRadius: 10 }}>
            {[
              { label: 'CALORIES', val: `${mealTotals.calories}`, unit: 'kcal' },
              { label: 'PROTÉINES', val: `${mealTotals.protein}`, unit: 'g' },
              { label: 'GLUCIDES', val: `${mealTotals.carbs}`, unit: 'g' },
              { label: 'LIPIDES', val: `${mealTotals.fat}`, unit: 'g' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1rem,2.5vw,1.4rem)', color: '#b22a27', lineHeight: 1 }}>{m.val}</div>
                <div style={{ fontSize: '.5rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', letterSpacing: '.1em', marginTop: 3 }}>{m.unit}</div>
                <div style={{ fontSize: '.48rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', letterSpacing: '.08em', marginTop: 1 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Nom + heure */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div className="fld">
              <label>Nom du repas</label>
              <input type="text" value={mealForm.name} onChange={e => setMealForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex : Déjeuner Performance" />
            </div>
            <div className="fld">
              <label>Heure</label>
              <input type="time" value={mealForm.time} onChange={e => setMealForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          {/* Recherche aliments */}
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Rechercher un aliment</label>
            <FoodSearch onAddItem={handleAddFoodItem} placeholder="Ex : poulet, riz basmati, avocat…" />
          </div>

          {/* Liste aliments ajoutés */}
          {foodItems.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>Aliments ajoutés</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {foodItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.8rem', color: '#e5e2e1', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ fontSize: '.62rem', color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 700, marginTop: 2 }}>{item.calories} kcal · P{item.protein}g · G{item.carbs}g · L{item.fat}g</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <input
                        type="number"
                        value={item.quantity}
                        min={1}
                        onChange={e => handleUpdateFoodQuantity(i, Number(e.target.value))}
                        style={{ width: 60, textAlign: 'center', padding: '5px 6px', fontSize: '.78rem' }}
                      />
                      <span style={{ fontSize: '.6rem', color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>g</span>
                      <button onClick={() => handleRemoveFoodItem(i)} style={{ background: 'rgba(220,38,38,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f87171', fontSize: '.9rem', flexShrink: 0 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback coach */}
          {mealFeedback.length > 0 && foodItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {mealFeedback.map((fb, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 6, background: fb.startsWith('✓') ? 'rgba(22,163,74,0.1)' : 'rgba(178,42,39,0.1)', fontSize: '.72rem', color: fb.startsWith('✓') ? '#16a34a' : '#e3beb8', fontFamily: 'Inter, sans-serif' }}>
                  {fb}
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="fld" style={{ marginBottom: 16 }}>
            <label>Description / notes</label>
            <textarea rows={2} value={mealForm.description} onChange={e => setMealForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes pour le membre…" />
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ ...S.gradBtn, flex: 1, opacity: (savingMeal || !mealForm.name || foodItems.length === 0) ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
              onClick={handleAddMeal}
              disabled={savingMeal || !mealForm.name || foodItems.length === 0}
            >
              {savingMeal ? <><span className="spin-sm" /> Ajout…</> : `Ajouter pour ${selClient?.name || 'le membre'} →`}
            </button>
            <button style={{ ...S.ghostBtn, minHeight: 44 }} onClick={() => { setShowMealForm(() => false); setFoodItems(() => []); }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste repas */}
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
            {!m.id.startsWith('mm') && (
              <button
                style={{ background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                disabled={deletingMeal === m.id}
                onClick={() => handleDeleteMeal(m.id)}
              >
                {deletingMeal === m.id ? <span className="spin-sm" /> : '🗑️'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Plan nutritionnel form */}
      <div style={{ background: '#1c1b1b', borderRadius: 10, padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: showNutForm ? 16 : 0 }} onClick={() => setShowNutForm(f => !f)}>
          <span style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(178,42,39,0.1)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</span>
          <div>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.84rem' }}>Modifier le plan nutritionnel</div>
            <div style={{ fontSize: '.68rem', color: '#9CA3AF' }}>Calories, macros, jeûne, fenêtre alimentaire</div>
          </div>
          <span style={{ marginLeft: 'auto', color: '#9CA3AF', transition: 'transform .2s', transform: showNutForm ? 'rotate(180deg)' : 'none' }}>▼</span>
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
            <button
              style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 6, opacity: savingNut || !selClient ? .55 : 1 }}
              onClick={handleSaveNut}
              disabled={savingNut || !selClient}
            >
              {savingNut ? <><span className="spin-sm" /> Sauvegarde…</> : `Sauvegarder pour ${selClient?.name || 'le membre'} →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
