'use client';

import { useRouter } from 'next/navigation';

const MOCK_FEED = [
  { initials: 'SM', name: 'Sophie Martin', action: 'a terminé sa séance du lundi',    program: 'Force & Hypertrophie', time: 'il y a 2h', color: 'linear-gradient(135deg,#9E1B1B,#b91c1c)' },
  { initials: 'LD', name: 'Lucas Dubois',  action: 'a atteint son objectif protéines', program: 'Nutrition Optimale',   time: 'il y a 4h', color: 'linear-gradient(135deg,#7a1212,#9E1B1B)' },
  { initials: 'EP', name: 'Emma Petit',    action: 'a commencé sa 11ème semaine',      program: 'HIIT Brûle-graisses',  time: 'hier',      color: 'linear-gradient(135deg,#16a34a,#15803d)' },
];

const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; };

interface OverviewTabProps {
  userName: string;
  mounted: boolean;
  clients: any[];
  programs: any[];
  tips: any[];
  nutritionPlans: any[];
  loading: boolean;
  avgProgress: number;
  navTo: (key: string) => void;
  router: ReturnType<typeof useRouter>;
  setShowCalcModal: (v: boolean) => void;
  S: Record<string, React.CSSProperties>;
}

const Spin = () => (
  <div style={{ textAlign: 'center', padding: '40px 0' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
    <p style={{ fontSize: '.72rem', color: '#9CA3AF' }}>Chargement…</p>
  </div>
);

export default function OverviewTab({ userName, mounted, clients, programs, tips, nutritionPlans, loading, navTo, router, setShowCalcModal, S }: OverviewTabProps) {
  return (
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
            { label: 'Programmes créés',    val: loading ? '—' : programs.length,              sub: '+1 ce mois',              bar: 60 },
            { label: 'Membres actifs',       val: loading ? '—' : clients.length,               sub: '+2 ce mois',              bar: 75 },
            { label: 'Assignations ce mois', val: loading ? '—' : nutritionPlans.length || 8,   sub: 'plans nutrition',         bar: 85 },
            { label: 'Taux de rétention',    val: '89%',                                         sub: '↑ vs mois précédent',    bar: 89 },
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
          {/* LEFT */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={S.sectionHead}>PROGRAMMES <span style={{ color: '#b22a27' }}>ACTIFS.</span></h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#b22a27' }} onClick={() => router.push('/coach/programmes')}>TOUT GÉRER →</button>
            </div>
            <div className="ch-prog-grid" style={{ marginBottom: 36 }}>
              {programs.slice(0, 3).map((p: any, i: number) => (
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={S.sectionHead}>ACTIVITÉ <span style={{ color: '#b22a27' }}>RÉCENTE.</span></h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? <Spin /> : MOCK_FEED.map((f, i) => (
                <div key={i} className="ch-feed-row">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.66rem', fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>{f.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '.82rem', color: '#e5e2e1', lineHeight: 1.4, margin: 0 }}>
                      <strong style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700 }}>{f.name}</strong>
                      <span style={{ color: '#9CA3AF' }}> {f.action} </span>
                      <span style={{ color: '#b22a27', fontWeight: 600 }}>{f.program}</span>
                    </p>
                    <p style={{ fontSize: '.6rem', color: '#6B7280', margin: '3px 0 0' }}>{f.time}</p>
                  </div>
                  <span style={{ color: '#6B7280', fontSize: '.9rem', flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="ch-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#1c1b1b', borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em', marginBottom: 20, color: '#e5e2e1' }}>Progression des membres</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {clients.slice(0, 3).map((c: any) => (
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

            {tips.length > 0 && (
              <div style={{ background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', color: '#b22a27', marginBottom: 10 }}>💡 Conseil Pro</div>
                <p style={{ fontSize: '.78rem', color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>{tips[0].content}</p>
                <div style={{ marginTop: 10, fontSize: '.62rem', color: '#6B7280' }}>— {tips[0].title}</div>
              </div>
            )}

            <div style={{ background: '#1c1b1b', borderRadius: 14, padding: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(178,42,39,0.12)', borderRadius: '50%', filter: 'blur(20px)' }} />
              <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.95rem', letterSpacing: '-.02em', marginBottom: 10, color: '#e5e2e1' }}>En Attente de Révision</h3>
              <p style={{ fontSize: '.78rem', color: '#9CA3AF', marginBottom: 16, lineHeight: 1.65 }}>
                {nutritionPlans.length > 0 ? `${nutritionPlans.length} plan${nutritionPlans.length > 1 ? 's' : ''} nutrition` : `${clients.length} membres`} en attente de votre validation.
              </p>
              <button style={{ ...S.gradBtn, width: '100%', textAlign: 'center', display: 'block' }} onClick={() => navTo('nutrition')}>RÉVISER →</button>
            </div>
          </div>
        </div>
      </div>

      {/* CALCULATEUR OUTIL */}
      <div style={{ marginTop: 36, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)', padding: 'clamp(16px,2.5vw,32px)' }}>
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
  );
}
