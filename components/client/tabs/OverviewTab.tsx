'use client';

import CalorieCalculator from '@/components/CalorieCalculator';

interface OverviewTabProps {
  firstName: string;
  displayPrograms: any[];
  displayNut: any;
  displayMeals: any[];
  displayTips: any[];
  defLabel: string;
  fastStatus: any;
  CIRCLE_R: number;
  CIRCUMFERENCE: number;
  dashOffset: number;
  CHART_BARS: { label: string; h: number; deficit: number }[];
  CAT_ICON: Record<string, string>;
}

export default function OverviewTab({
  firstName,
  displayPrograms,
  displayNut,
  displayMeals,
  displayTips,
  defLabel,
  fastStatus,
  CIRCLE_R,
  CIRCUMFERENCE,
  dashOffset,
  CHART_BARS,
  CAT_ICON,
}: OverviewTabProps) {
  return (
    <>
      {/* HERO */}
      <section className="cl-hero">
        <div className="cl-hero-overlay" />
        <div className="cl-hero-content">
          <div className="cl-hero-badge">TABLEAU DE BORD</div>
          <h1 className="cl-hero-title">
            BONJOUR, <span style={{ color: '#b22a27' }}>{firstName.toUpperCase()}.</span><br />
            CONTINUEZ À PROGRESSER.
          </h1>
          <p className="cl-hero-quote">
            <em>« Le succès, c'est la somme de petits efforts répétés jour après jour. »</em>
          </p>
        </div>
      </section>

      {/* ROW 1 — Bilan énergétique + Séance du jour */}
      <div className="cl-row2">
        {/* Bilan énergétique */}
        <div className="cl-card cl-energy-card">
          <div className="cl-card-head">
            <div>
              <div className="cl-card-label">BILAN ÉNERGÉTIQUE</div>
              <div className="cl-card-sub">7 derniers jours</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.8rem)', color: '#b22a27', letterSpacing: '-.04em', lineHeight: 1 }}>
                {defLabel}
              </div>
              <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'Inter, sans-serif', letterSpacing: '.08em' }}>
                AUJOURD'HUI
              </div>
            </div>
          </div>
          <div className="cl-chart">
            {CHART_BARS.map((bar, i) => {
              const isToday = i === 4;
              return (
                <div key={bar.label} className="cl-chart-col">
                  <div className="cl-chart-bar-wrap">
                    <div
                      className="cl-chart-bar"
                      style={{
                        height: `${bar.h}%`,
                        background: isToday ? 'linear-gradient(to top, #89070e, #b22a27)' : 'rgba(178,42,39,0.22)',
                        ['--target-h' as any]: `${bar.h}%`,
                      }}
                    />
                  </div>
                  <div className={`cl-chart-label${isToday ? ' today' : ''}`}>{bar.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Séance du jour */}
        <div className="cl-card cl-seance-card">
          <div className="cl-seance-bg" />
          <div className="cl-seance-overlay" />
          <div className="cl-seance-content">
            <div className="cl-seance-badge">HAUTE INTENSITÉ</div>
            <div>
              <div className="cl-card-label" style={{ marginBottom: 6 }}>SÉANCE DU JOUR</div>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', color: '#e5e2e1', letterSpacing: '-.03em', lineHeight: 1.2 }}>
                {displayPrograms[0]?.title || 'Force & Hypertrophie'}
              </div>
              <div style={{ fontSize: '.65rem', color: '#9CA3AF', marginTop: 8, fontFamily: 'Inter, sans-serif', letterSpacing: '.1em' }}>
                45 MIN · 420 KCAL
              </div>
            </div>
            <button className="cl-seance-btn">DÉMARRER MA SÉANCE ▶</button>
          </div>
        </div>
      </div>

      {/* ROW 2 — Protocole de jeûne + Nutrition du jour */}
      <div className="cl-row2">
        {/* Protocole de jeûne */}
        <div className="cl-card cl-fasting-card">
          <div className="cl-card-label" style={{ marginBottom: 20 }}>PROTOCOLE DE JEÛNE</div>
          <div className="cl-fasting-circle-wrap">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={CIRCLE_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx="80" cy="80" r={CIRCLE_R}
                fill="none"
                stroke="url(#fastGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <defs>
                <linearGradient id="fastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#89070e" />
                  <stop offset="100%" stopColor="#b22a27" />
                </linearGradient>
              </defs>
              <text x="80" y="72" textAnchor="middle" fill="#e5e2e1" fontFamily="Lexend, sans-serif" fontWeight="900" fontSize="22" letterSpacing="-1">
                {fastStatus ? `${fastStatus.elapsedH}:${String(fastStatus.elapsedM).padStart(2, '0')}` : '16:00'}
              </text>
              <text x="80" y="92" textAnchor="middle" fill="#9CA3AF" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="2">ÉCOULÉ</text>
              <text x="80" y="108" textAnchor="middle" fill="#b22a27" fontFamily="Lexend, sans-serif" fontWeight="700" fontSize="10" letterSpacing="1">
                {fastStatus?.inWindow ? 'FENÊTRE' : 'EN JEÛNE'}
              </text>
            </svg>
          </div>
          <div className="cl-fasting-info">
            <div className="cl-fasting-row">
              <span className="cl-card-label">Protocole</span>
              <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#b22a27' }}>{displayNut.fastingType || '16/8'}</span>
            </div>
            <div className="cl-fasting-row">
              <span className="cl-card-label">Fenêtre alimentaire</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#e5e2e1' }}>{displayNut.windowStart} – {displayNut.windowEnd}</span>
            </div>
            <div className="cl-fasting-row">
              <span className="cl-card-label">État actuel</span>
              <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: fastStatus?.inWindow ? '#16a34a' : '#b22a27', letterSpacing: '.06em' }}>
                {fastStatus?.inWindow ? '● FENÊTRE OUVERTE' : '● EN COURS DE JEÛNE'}
              </span>
            </div>
          </div>
        </div>

        {/* Ma Nutrition du Jour */}
        <div className="cl-card cl-nut-card">
          <div className="cl-card-head" style={{ marginBottom: 20 }}>
            <div>
              <div className="cl-card-label">MA NUTRITION DU JOUR</div>
              <div className="cl-card-sub">Objectif : {displayNut.calories?.toLocaleString('fr-FR')} kcal</div>
            </div>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#b22a27' }}>
              {Math.round((displayNut.calories || 2000) * 0.72).toLocaleString('fr-FR')}
              <span style={{ fontSize: '.55rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginLeft: 4 }}>kcal</span>
            </div>
          </div>
          {[
            { label: 'Protéines', current: Math.round((displayNut.protein || 150) * 0.8), target: displayNut.protein || 150, unit: 'g', color: '#b22a27' },
            { label: 'Glucides',  current: Math.round((displayNut.carbs   || 200) * 0.66), target: displayNut.carbs   || 200, unit: 'g', color: '#89070e' },
            { label: 'Lipides',   current: Math.round((displayNut.fat     || 65)  * 0.65), target: displayNut.fat     || 65,  unit: 'g', color: '#5c0509' },
          ].map(m => (
            <div key={m.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>{m.label}</span>
                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', color: '#b22a27' }}>
                  {m.current}{m.unit} / {m.target}{m.unit}
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: 5, width: `${Math.min(100, Math.round((m.current / m.target) * 100))}%`, background: `linear-gradient(to right, ${m.color}, #b22a27)`, borderRadius: 9999, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayMeals.slice(0, 2).map((meal: any) => (
              <div key={meal.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  {meal.emoji || '🍽️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.78rem', color: '#e5e2e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</div>
                  <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{meal.time} · {meal.calories} kcal</div>
                </div>
                <div style={{ fontSize: '.6rem', color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 700, flexShrink: 0 }}>+{meal.protein}g P</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 3 */}
      <div className="cl-row3">
        <div className="cl-card cl-weight-card">
          <div className="cl-card-label" style={{ marginBottom: 12 }}>PROGRESSION DU POIDS</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.6rem)', color: '#e5e2e1', letterSpacing: '-.06em', lineHeight: 1 }}>78.4</div>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '.7rem', color: '#9CA3AF', lineHeight: 1 }}>kg</div>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.65rem', color: '#b22a27', letterSpacing: '.04em', marginTop: 3 }}>−0.6 cette semaine</div>
            </div>
          </div>
          <div className="cl-weight-trend">
            {[62, 55, 70, 48, 65, 58, 72].map((h, i) => (
              <div key={i} className="cl-weight-bar" style={{ height: `${h}%`, background: i === 6 ? '#b22a27' : 'rgba(178,42,39,0.2)' }} />
            ))}
          </div>
          <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', letterSpacing: '.06em', marginTop: 10 }}>
            OBJECTIF : 75.0 KG · {Math.round(((78.4 - 75) / 0.6))} SEMAINES RESTANTES
          </div>
        </div>

        <div className="cl-card cl-activity-card">
          <div className="cl-card-label" style={{ marginBottom: 12 }}>POINTS D'ACTIVITÉ</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.6rem)', color: '#b22a27', letterSpacing: '-.06em', lineHeight: 1 }}>1 840</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '.6rem', color: '#9CA3AF', marginBottom: 6 }}>pts ce mois</div>
          </div>
          <div style={{ marginTop: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '.58rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9CA3AF' }}>Objectif mensuel</span>
              <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: '#b22a27' }}>74%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: 5, width: '74%', background: 'linear-gradient(to right, #89070e, #b22a27)', borderRadius: 9999 }} />
            </div>
          </div>
          <div style={{ fontSize: '.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
            +240 pts cette semaine · Objectif : 2 500 pts
          </div>
        </div>

        <div className="cl-card cl-habits-card">
          <div className="cl-card-label" style={{ marginBottom: 16 }}>HABITUDES ÉLITE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayTips.slice(0, 2).map((tip: any) => (
              <div key={tip.id} style={{ background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1rem' }}>{CAT_ICON[tip.category] || '💡'}</span>
                  <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', color: '#e5e2e1', letterSpacing: '.02em' }}>{tip.title}</span>
                </div>
                <p style={{ fontSize: '.65rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.55, margin: 0 }}>
                  {tip.content.length > 100 ? tip.content.slice(0, 100) + '…' : tip.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CALCULATEUR */}
      <div className="cl-card" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 10 }}>⚡ Outil personnel</div>
          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,2rem)', letterSpacing: '-.05em', color: '#e5e2e1', margin: '0 0 8px' }}>
            MON CALCULATEUR <span style={{ color: '#b22a27' }}>CALORIQUE.</span>
          </h2>
          <p style={{ fontSize: '.78rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            Calculez vos besoins caloriques selon votre profil.
          </p>
        </div>
        <CalorieCalculator mode="membre" />
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(178,42,39,0.06)', border: '1px solid rgba(178,42,39,0.14)', borderRadius: 8, fontSize: '.72rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
          💡 Votre coach peut ajuster ces valeurs dans votre plan nutritionnel.
        </div>
      </div>
    </>
  );
}
