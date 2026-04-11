'use client';

interface StatistiquesTabProps {
  displayTips: any[];
  CAT_ICON: Record<string, string>;
  TIP_CAT_LABEL: Record<string, string>;
  completionLogs: any[];
  statPeriod: string;
  setStatPeriod: (p: string) => void;
  statFilteredLogs: any[];
  statActiveDays: number;
  statTotalExercises: number;
  statRate: number;
  statWeeklyData: { label: string; val: number }[];
  statMaxWeek: number;
}

export default function StatistiquesTab({
  displayTips,
  CAT_ICON,
  TIP_CAT_LABEL,
  completionLogs,
  statPeriod,
  setStatPeriod,
  statFilteredLogs,
  statActiveDays,
  statTotalExercises,
  statRate,
  statWeeklyData,
  statMaxWeek,
}: StatistiquesTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowX: 'hidden' }}>

      {/* ── 1. HERO BANNER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(229,226,225,0.4)', marginBottom: 8 }}>STATISTIQUES DÉTAILLÉES</div>
          <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,6vw,3rem)', letterSpacing: '-.05em', lineHeight: .92, color: '#e5e2e1', margin: '0 0 8px' }}>MES STATISTIQUES.</h2>
          <p style={{ fontSize: '.72rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', margin: 0 }}>{(() => {
            const days = statPeriod === '7J' ? 7 : statPeriod === '30J' ? 30 : statPeriod === '3M' ? 90 : 365;
            const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
            const from = new Date(Date.now() - days * 86400000).toLocaleDateString('fr-FR', opts);
            const to   = new Date().toLocaleDateString('fr-FR', opts);
            return `Période : du ${from} au ${to} · ${days} jours de suivi`;
          })()}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['7J', '30J', '3M', '1AN'].map(p => (
            <button
              key={p}
              onClick={() => setStatPeriod(p)}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.08em', transition: 'all .15s', background: statPeriod === p ? '#b22a27' : 'rgba(255,255,255,0.06)', color: statPeriod === p ? '#fff' : '#6B7280' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. ROW KPI ── */}
      <style>{`
        .st-kpi-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media(min-width:640px){ .st-kpi-grid { grid-template-columns: 1fr 1fr; } }
        @media(min-width:900px){ .st-kpi-grid { grid-template-columns: 2fr 1fr 1fr; } }
        .st-chart-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media(min-width:768px){ .st-chart-grid { grid-template-columns: 1fr 300px; } }
        .st-week-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
        @media(min-width:600px){ .st-week-grid { grid-template-columns: repeat(4,1fr); } }
      `}</style>
      <div className="st-kpi-grid">

        {/* Card 1 — Performance du mois */}
        <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27' }}>PERFORMANCE DU MOIS</div>
          <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: 'clamp(1rem,2.5vw,1.25rem)', color: '#e5e2e1', lineHeight: 1.3, margin: 0 }}>
            Vous avez complété <span style={{ color: '#b22a27' }}>{completionLogs.length} exercices</span>.
          </p>
          <div style={{ padding: '10px 14px', background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.15)', borderRadius: 8, fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.65 }}>
            💡 <em>Conseil coach : Vos temps de récupération s'améliorent. Augmentez l'intensité lors de votre prochain cycle.</em>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[`${statFilteredLogs.length} exercices`, `${statRate}% assiduité`, `${statActiveDays} jours actifs`].map(pill => (
              <span key={pill} style={{ background: 'rgba(178,42,39,0.12)', borderRadius: 6, padding: '4px 10px', fontSize: '.62rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#e3beb8', letterSpacing: '.04em' }}>{pill}</span>
            ))}
          </div>
        </div>

        {/* Card 2 — Séances ce mois */}
        <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏆</div>
          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.8rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>{statFilteredLogs.length}</div>
          <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b22a27' }}>EXERCICES COMPLÉTÉS</div>
          <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: '#16a34a', fontWeight: 600 }}>↑ +3 vs mois dernier</div>
        </div>

        {/* Card 3 — Jours actifs */}
        <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔥</div>
          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,5vw,2.8rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>{statActiveDays}</div>
          <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b22a27' }}>JOURS ACTIFS</div>
          <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Meilleure série : 22 jours</div>
        </div>

      </div>

      {/* ── 3+4. GRAPHIQUE + COMPOSITION ── */}
      <div className="st-chart-grid">

        {/* Graphique barres double avec axe Y + valeurs */}
        <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px', overflowX: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>PROGRESSION FORCE</div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ label: 'SQUAT', color: '#b22a27' }, { label: 'SOULEVÉ DE TERRE', color: '#4a4949' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', color: '#6B7280' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Chart area avec axe Y */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            {/* Axe Y */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 22, flexShrink: 0 }}>
              {[statMaxWeek, Math.round(statMaxWeek * .66), Math.round(statMaxWeek * .33), 0].map(v => (
                <span key={v} style={{ fontSize: '.52rem', fontFamily: 'Inter, sans-serif', color: '#6B7280', lineHeight: 1 }}>{v}</span>
              ))}
            </div>
            {/* Barres — données réelles */}
            <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              {statWeeklyData.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 22, color: '#6B7280', fontSize: '.72rem' }}>Aucune activité</div>
              ) : statWeeklyData.map(w => {
                const h = Math.max(4, Math.round((w.val / statMaxWeek) * 100));
                return (
                  <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27', textAlign: 'center' }}>{w.val}</span>
                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 110 }}>
                      <div style={{ flex: 1, background: 'linear-gradient(to top,#89070e,#b22a27)', borderRadius: '3px 3px 0 0', height: `${h}%`, transition: 'height 1s ease' }} />
                    </div>
                    <div style={{ fontSize: '.5rem', fontFamily: 'Lexend, sans-serif', fontWeight: 600, color: '#6B7280', letterSpacing: '.06em', textAlign: 'center' }}>{w.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Composition corporelle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px', flex: 1 }}>
            <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 18 }}>COMPOSITION CORPORELLE</div>
            {/* Poids */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Progression du poids</span>
                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>−2.8 kg</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: '56%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
              </div>
              <div style={{ fontSize: '.6rem', fontFamily: 'Inter, sans-serif', color: '#16a34a' }}>Objectif final : −5 kg · En bonne voie ✓</div>
            </div>
            {/* Masse grasse */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Indice de masse grasse</span>
                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>−1.8%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: '45%', background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
              </div>
              <div style={{ fontSize: '.6rem', fontFamily: 'Inter, sans-serif', color: '#16a34a' }}>Objectif final : −4% · En bonne voie ✓</div>
            </div>
          </div>
          {/* Volume soulevé */}
          <div style={{ background: 'linear-gradient(135deg,#89070e,#b22a27)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -18, right: -8, fontSize: '4.5rem', opacity: .08, lineHeight: 1, pointerEvents: 'none' }}>🏋️</div>
            <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 8, position: 'relative' }}>EXERCICES COMPLÉTÉS</div>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.3rem,3vw,1.7rem)', color: '#fff', letterSpacing: '-.04em', lineHeight: 1, position: 'relative' }}>{completionLogs.length} total</div>
            <div style={{ fontSize: '.68rem', fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.8)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, position: 'relative' }}>
              <span>↑</span> {statFilteredLogs.length} sur la période {statPeriod === 'ALL' ? 'totale' : statPeriod}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. ASSIDUITÉ HEBDOMADAIRE ── */}
      <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px', overflowX: 'hidden' }}>
        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em', marginBottom: 18 }}>MON ASSIDUITÉ</div>

        {/* Barre de progression mensuelle */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '.72rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF' }}>Séances complétées ce mois</span>
            <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.8rem', color: '#e5e2e1' }}>{statFilteredLogs.length} / {statTotalExercises}</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 7 }}>
            <div style={{ height: '100%', width: `${statRate}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
          </div>
          <div style={{ fontSize: '.65rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>{statRate}% de complétion sur la période {statPeriod === 'ALL' ? 'totale' : statPeriod}</div>
        </div>

        {/* Grille semaines — données réelles */}
        <div className="st-week-grid">
          {(() => {
            // Build last 4 weeks from real completions
            const activeDaySet = new Set(
              statFilteredLogs.map((c: any) => c.completedAt?.toDate?.()?.toDateString?.() || '').filter(Boolean)
            );
            const weeks: { label: string; days: string[] }[] = [];
            for (let w = 3; w >= 0; w--) {
              const days: string[] = [];
              const weekRef = new Date(); weekRef.setHours(0,0,0,0);
              // Go to start of current week (Monday)
              const dow = weekRef.getDay(); // 0=Sun
              const toMon = dow === 0 ? -6 : 1 - dow;
              weekRef.setDate(weekRef.getDate() + toMon - w * 7);
              for (let d = 0; d < 7; d++) {
                const day = new Date(weekRef); day.setDate(weekRef.getDate() + d);
                days.push(activeDaySet.has(day.toDateString()) ? '✓' : '-');
              }
              weeks.push({ label: `SEM ${4 - w < 10 ? '0' : ''}${4 - w}`, days });
            }
            return weeks;
          })().map(week => (
            <div key={week.label}>
              <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8, textAlign: 'center' }}>{week.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                {(['L','M','Me','J','V','S','D'] as const).map((day, di) => {
                  const state = week.days[di];
                  return (
                    <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ fontSize: '.42rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>{day}</div>
                      <div style={{
                        width: '100%', aspectRatio: '1', borderRadius: 3,
                        background: state === '✓' ? '#b22a27' : 'rgba(255,255,255,0.05)',
                        border: state === 'M' ? '1px dashed rgba(178,42,39,0.5)' : '1px solid transparent',
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { color: '#b22a27', border: 'none', label: 'Séance effectuée' },
            { color: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', label: 'Repos' },
            { color: 'transparent', border: '1px dashed rgba(178,42,39,0.5)', label: 'Séance manquée' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, border: item.border, flexShrink: 0 }} />
              <span style={{ fontSize: '.62rem', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. OBJECTIFS DU MOIS ── */}
      <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px' }}>
        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em', marginBottom: 20 }}>MES OBJECTIFS DU MOIS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { label: 'Séances complétées',               val: '12 / 16',              pct: 75,  sub: null },
            { label: 'Jours objectif protéines atteint', val: '22 / 30 jours',        pct: 73,  sub: null },
            { label: 'Déficit calorique cumulé',         val: '14 200 / 15 000 kcal', pct: 95,  sub: 'Quasi atteint 🎯' },
          ].map(obj => (
            <div key={obj.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '.78rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF', fontWeight: 500 }}>{obj.label}</span>
                <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.78rem', color: '#e5e2e1', flexShrink: 0, marginLeft: 12 }}>{obj.val}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: obj.sub ? 6 : 0 }}>
                <div style={{ height: '100%', width: `${obj.pct}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.2s ease' }} />
              </div>
              {obj.sub && <div style={{ fontSize: '.65rem', fontFamily: 'Inter, sans-serif', color: '#b22a27', fontWeight: 600 }}>{obj.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. CITATION FINALE ── */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=70"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.22) grayscale(0.3)' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(137,7,14,0.6) 0%,rgba(10,10,10,0.85) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(28px,6vw,52px) clamp(20px,6vw,52px)' }}>
          <div style={{ fontSize: '2.5rem', color: 'rgba(178,42,39,0.3)', fontFamily: 'Lexend, sans-serif', fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>"</div>
          <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1rem,3.5vw,1.6rem)', letterSpacing: '-.03em', lineHeight: 1.2, color: '#fff', margin: '0 0 16px', fontStyle: 'italic' }}>
            LA DISCIPLINE N'EST PAS UNE CONTRAINTE.<br />C'EST UNE LIBERTÉ.
          </p>
          <div style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            SUNDARAFLOW | PERFORMANCE ÉLITE
          </div>
        </div>
      </div>

      {/* ── CONSEILS COACH ── */}
      {displayTips.length > 0 && (
        <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 18 }}>CONSEILS DE MON COACH</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayTips.map((tip: any) => (
              <div key={tip.id} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{CAT_ICON[tip.category] || '💡'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.8rem', color: '#e5e2e1' }}>{tip.title}</span>
                    <span style={{ fontSize: '.52rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#b22a27', background: 'rgba(178,42,39,0.1)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>{TIP_CAT_LABEL[tip.category] || 'Conseil'}</span>
                  </div>
                  <p style={{ fontSize: '.7rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, margin: 0 }}>{tip.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
