'use client';

import { useState } from 'react';

/* ── Types ── */
export type CalcResult = {
  mb: number;
  tdee: number;
  target: number;
  prot: number;
  carbs: number;
  fat: number;
  fasting: string;
  goal: 'perte' | 'maintien' | 'prise';
};

interface Props {
  mode: 'membre' | 'coach';
  memberName?: string;
  onSave?: (data: CalcResult) => void;
}

const ACTIVITY_LEVELS = [
  { label: 'Sédentaire (bureau, peu de sport)',   val: 1.2   },
  { label: 'Légèrement actif (1-3x/semaine)',      val: 1.375 },
  { label: 'Modérément actif (3-5x/semaine)',      val: 1.55  },
  { label: 'Très actif (6-7x/semaine)',            val: 1.725 },
  { label: 'Athlète (2x/jour)',                    val: 1.9   },
];

export default function CalorieCalculator({ mode, memberName, onSave }: Props) {
  const [weight,   setWeight]   = useState(75);
  const [height,   setHeight]   = useState(175);
  const [age,      setAge]      = useState(30);
  const [sex,      setSex]      = useState<'H' | 'F'>('H');
  const [activity, setActivity] = useState(1.55);
  const [goal,     setGoal]     = useState<'perte' | 'maintien' | 'prise'>('perte');
  const [result,   setResult]   = useState<CalcResult | null>(null);

  const calculate = () => {
    const mb = sex === 'H'
      ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
      : 447.6  + 9.25 * weight + 3.1 * height - 4.33 * age;
    const tdee   = mb * activity;
    const target = goal === 'perte' ? tdee - 500 : goal === 'prise' ? tdee + 300 : tdee;
    const prot   = Math.round((target * 0.30) / 4);
    const carbs  = Math.round((target * 0.40) / 4);
    const fat    = Math.round((target * 0.30) / 9);
    const fasting = goal === 'perte' ? '16/8' : goal === 'maintien' ? '14/10' : 'Pas de jeûne recommandé';
    const res: CalcResult = {
      mb: Math.round(mb), tdee: Math.round(tdee), target: Math.round(target),
      prot, carbs, fat, fasting, goal,
    };
    setResult(res);
    if (onSave) onSave(res);
  };

  const MACROS = result ? [
    { label: 'Protéines', val: result.prot,  unit: 'g', w: 60, color: '#b22a27' },
    { label: 'Glucides',  val: result.carbs, unit: 'g', w: 80, color: '#89070e' },
    { label: 'Lipides',   val: result.fat,   unit: 'g', w: 60, color: '#5c0509' },
  ] : [];

  return (
    <div>
      {/* ── INPUTS ── */}
      <div className="cc-grid">
        <div className="cc-field">
          <label className="cc-label">Poids (kg)</label>
          <input className="cc-input" type="number" value={weight} min={30} max={250} onChange={e => setWeight(+e.target.value)} />
        </div>
        <div className="cc-field">
          <label className="cc-label">Taille (cm)</label>
          <input className="cc-input" type="number" value={height} min={130} max={230} onChange={e => setHeight(+e.target.value)} />
        </div>
        <div className="cc-field">
          <label className="cc-label">Âge</label>
          <input className="cc-input" type="number" value={age} min={14} max={90} onChange={e => setAge(+e.target.value)} />
        </div>
      </div>

      {/* ── SEXE ── */}
      <div style={{ marginBottom: 16 }}>
        <div className="cc-label" style={{ marginBottom: 8 }}>Sexe</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`cc-toggle${sex === 'H' ? ' active' : ''}`} onClick={() => setSex('H')}>Homme</button>
          <button className={`cc-toggle${sex === 'F' ? ' active' : ''}`} onClick={() => setSex('F')}>Femme</button>
        </div>
      </div>

      {/* ── ACTIVITÉ ── */}
      <div style={{ marginBottom: 16 }}>
        <label className="cc-label" style={{ display: 'block', marginBottom: 8 }}>Niveau d'activité</label>
        <select className="cc-select" value={activity} onChange={e => setActivity(+e.target.value)}>
          {ACTIVITY_LEVELS.map(a => (
            <option key={a.val} value={a.val}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* ── OBJECTIF ── */}
      <div style={{ marginBottom: 22 }}>
        <div className="cc-label" style={{ marginBottom: 8 }}>Objectif</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`cc-toggle${goal === 'perte'    ? ' active' : ''}`} onClick={() => setGoal('perte')}>Perte de poids</button>
          <button className={`cc-toggle${goal === 'maintien' ? ' active' : ''}`} onClick={() => setGoal('maintien')}>Maintien</button>
          <button className={`cc-toggle${goal === 'prise'    ? ' active' : ''}`} onClick={() => setGoal('prise')}>Prise de masse</button>
        </div>
      </div>

      {/* ── CTA ── */}
      <button onClick={calculate} className="cc-calc-btn">CALCULER →</button>

      {/* ── RÉSULTATS ── */}
      {result && (
        <div className="cc-results">
          {/* MB + TDEE (discrets) */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <div className="cc-label">Métabolisme de base</div>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#9CA3AF', marginTop: 4 }}>
                {result.mb.toLocaleString('fr-FR')} kcal
              </div>
            </div>
            <div>
              <div className="cc-label">TDEE (dépense totale)</div>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#e5e2e1', marginTop: 4 }}>
                {result.tdee.toLocaleString('fr-FR')} kcal
              </div>
            </div>
          </div>

          {/* Grande valeur objectif */}
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div className="cc-label" style={{ marginBottom: 8 }}>Objectif calorique</div>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2.8rem,7vw,3.8rem)', letterSpacing: '-.06em', color: '#b22a27', lineHeight: 1 }}>
              {result.target.toLocaleString('fr-FR')}
            </div>
            <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 6, fontFamily: 'Inter, sans-serif' }}>kcal / jour</div>
          </div>

          {/* Barres macros */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 18 }}>
            {MACROS.map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="cc-label">{m.label}</span>
                  <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', color: '#b22a27' }}>
                    {m.val}{m.unit}
                  </span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div
                    className="cc-bar-fill"
                    style={{ ['--w' as any]: `${m.w}%`, background: `linear-gradient(to right, ${m.color}, #b22a27)` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Jeûne */}
          <div style={{ background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.18)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span className="cc-label">Protocole jeûne recommandé</span>
            <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#b22a27', letterSpacing: '-.02em' }}>
              {result.fasting}
            </span>
          </div>
        </div>
      )}

      {/* ── STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        .cc-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
        .cc-label { font-size: .58rem; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #9CA3AF; }
        .cc-input {
          width: 100%; background: #2a2a2a; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 7px; padding: 10px 12px; color: #e5e2e1;
          font-family: 'Inter', sans-serif; font-size: .88rem; outline: none;
          margin-top: 6px; transition: border-color .2s, box-shadow .2s;
        }
        .cc-input:focus { border-color: rgba(178,42,39,0.5); box-shadow: 0 0 0 3px rgba(178,42,39,0.09); }
        .cc-select {
          width: 100%; background: #2a2a2a; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 7px; padding: 10px 12px; color: #e5e2e1;
          font-family: 'Inter', sans-serif; font-size: .82rem; outline: none; cursor: pointer;
        }
        .cc-select option { background: #2a2a2a; color: #e5e2e1; }
        .cc-toggle {
          padding: 8px 14px; background: #2a2a2a; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 7px; color: #9CA3AF;
          font-family: 'Lexend', sans-serif; font-size: .65rem; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase; cursor: pointer; transition: all .2s;
        }
        .cc-toggle.active { background: #b22a27; border-color: #b22a27; color: #e5e2e1; }
        .cc-toggle:not(.active):hover { border-color: rgba(178,42,39,0.35); color: #e3beb8; }
        .cc-calc-btn {
          width: 100%; padding: 13px;
          background: linear-gradient(135deg,#89070e,#b22a27);
          border: none; border-radius: 8px; color: #e5e2e1;
          font-family: 'Lexend', sans-serif; font-weight: 800; font-size: .72rem;
          letter-spacing: .14em; text-transform: uppercase; cursor: pointer;
          transition: transform .2s, box-shadow .2s;
        }
        .cc-calc-btn:hover { transform: scale(1.02); box-shadow: 0 0 24px rgba(178,42,39,0.35); }
        .cc-results {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 24px; margin-top: 24px;
          animation: ccFadeIn .35s ease;
        }
        @keyframes ccFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .cc-bar-fill {
          height: 5px; width: var(--w, 60%); border-radius: 9999px;
          animation: ccGrow .8s ease forwards;
        }
        @keyframes ccGrow { from { width: 0; } to { width: var(--w, 60%); } }
        @media (max-width: 480px) {
          .cc-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
