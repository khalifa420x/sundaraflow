'use client';

interface AnalysesTabProps {
  clients: any[];
  tips: any[];
  nutritionPlans: any[];
  CHART_BARS: { label: string; h: number }[];
  S: Record<string, React.CSSProperties>;
}

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export default function AnalysesTab({ clients, tips, nutritionPlans, CHART_BARS, S }: AnalysesTabProps) {
  return (
    <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <span style={S.tag}>📈 Données</span>
        <h2 style={S.sectionHead}>MES <span style={{ color: '#b22a27' }}>STATISTIQUES.</span></h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total membres',       val: clients.length,           sub: 'actifs' },
          { label: 'Taux de rétention',   val: '89%',                    sub: '+3% vs mois dernier' },
          { label: 'Durée moy. coaching', val: '7,2 sem.',               sub: 'par membre' },
          { label: 'Séances cette sem.',  val: '24',                     sub: '↑ vs sem. passée' },
          { label: 'Conseils publiés',    val: tips.length,              sub: 'total' },
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
          <div>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>📊 Séances par jour — Cette semaine</div>
            <div style={{ fontSize: '.64rem', color: '#9CA3AF' }}>Total : 45 séances · Moy. : 6.4/jour</div>
          </div>
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
          {clients.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.56rem', fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>
                {c.initials || initials(c.name || 'C')}
              </div>
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
  );
}
