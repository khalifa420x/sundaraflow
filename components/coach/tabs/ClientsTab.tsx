'use client';

import { useRouter } from 'next/navigation';

interface ClientsTabProps {
  clients: any[];
  loading: boolean;
  selClient: any;
  setSelClient: (c: any) => void;
  navTo: (key: string) => void;
  router: ReturnType<typeof useRouter>;
  initials: (n: string) => string;
  S: Record<string, React.CSSProperties>;
}

const Spin = () => (
  <div style={{ textAlign: 'center', padding: '40px 0' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
    <p style={{ fontSize: '.72rem', color: '#9CA3AF' }}>Chargement…</p>
  </div>
);

export default function ClientsTab({ clients, loading, selClient, setSelClient, navTo, router, initials, S }: ClientsTabProps) {
  return (
    <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span style={S.tag}>👥 Suivi</span>
          <h2 style={S.sectionHead}>MES <span style={{ color: '#b22a27' }}>MEMBRES.</span></h2>
        </div>
        <button style={S.gradBtn} onClick={() => router.push('/coach')}>+ AJOUTER UN MEMBRE →</button>
      </div>

      {loading ? <Spin /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {clients.map((c: any) => (
            <div key={c.id} className="ch-member-card" onClick={() => { setSelClient(c); navTo('nutrition'); }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.76rem', fontWeight: 700, color: '#fff', fontFamily: 'Lexend, sans-serif' }}>
                  {c.initials || initials(c.name || 'C')}
                </div>
              </div>
              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em', marginBottom: 3, color: '#e5e2e1' }}>{c.name}</div>
              <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginBottom: 14 }}>{c.goal || 'Coaching personnalisé'}</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={S.label}>Progression</span>
                  <span style={{ fontSize: '.72rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27' }}>{c.progress || 0}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.progress || 0}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 10, transition: 'width 1.4s ease' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                {[{ val: c.sessions || '—', label: 'Séances' }, { val: c.weeks || '—', label: 'Semaines' }, { val: `${c.progress || 0}%`, label: 'Taux' }].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '7px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.88rem', color: '#e5e2e1' }}>{s.val}</div>
                    <div style={{ ...S.label, marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  style={{ flex: 1, background: 'rgba(178,42,39,0.1)', border: 'none', borderRadius: 6, padding: '8px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#e3beb8', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setSelClient(c); navTo('nutrition'); }}
                >🥗 Nutrition</button>
                <button
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 6, padding: '8px', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9CA3AF', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); router.push('/coach/programmes'); }}
                >📋 Programmes</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
