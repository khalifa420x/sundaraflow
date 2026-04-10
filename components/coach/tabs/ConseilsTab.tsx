'use client';

interface ConseilsTabProps {
  tips: any[];
  tipForm: { title: string; category: string; content: string };
  setTipForm: (fn: (f: any) => any) => void;
  showTipForm: boolean;
  setShowTipForm: (fn: (f: boolean) => boolean) => void;
  savingTip: boolean;
  handleAddTip: () => void;
  TIP_CATEGORIES: { val: string; label: string }[];
  CAT_ICON: Record<string, string>;
  S: Record<string, React.CSSProperties>;
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

export default function ConseilsTab({ tips, tipForm, setTipForm, showTipForm, setShowTipForm, savingTip, handleAddTip, TIP_CATEGORIES, CAT_ICON, S }: ConseilsTabProps) {
  return (
    <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <span style={S.tag}>💡 Lifestyle</span>
        <h2 style={S.sectionHead}>MES <span style={{ color: '#b22a27' }}>CONSEILS.</span></h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={S.label}>{tips.length} conseil{tips.length !== 1 ? 's' : ''} publiés</div>
        <button style={S.ghostBtn} onClick={() => setShowTipForm(f => !f)}>
          {showTipForm ? '✕ Annuler' : '+ NOUVEAU CONSEIL'}
        </button>
      </div>

      {showTipForm && (
        <div style={{ background: '#1c1b1b', borderRadius: 10, padding: '18px', marginBottom: 18 }}>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <NInput label="Titre du conseil" type="text" val={tipForm.title} set={(v: string) => setTipForm(f => ({ ...f, title: v }))} />
            <div className="fld">
              <label>Catégorie</label>
              <select value={tipForm.category} onChange={e => setTipForm(f => ({ ...f, category: e.target.value }))}>
                {TIP_CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Contenu du conseil</label>
            <textarea rows={4} value={tipForm.content} onChange={e => setTipForm(f => ({ ...f, content: e.target.value }))} placeholder="Rédigez votre conseil…" />
          </div>
          <button
            style={{ ...S.gradBtn, opacity: savingTip || !tipForm.title || !tipForm.content ? .55 : 1 }}
            onClick={handleAddTip}
            disabled={savingTip || !tipForm.title || !tipForm.content}
          >
            {savingTip ? <><span className="spin-sm" /> Publication…</> : 'PUBLIER CE CONSEIL →'}
          </button>
        </div>
      )}

      {tips.length > 0 && (
        <div style={{ background: 'rgba(178,42,39,0.08)', border: '1px solid rgba(178,42,39,0.2)', borderRadius: 12, padding: 22, marginBottom: 20 }}>
          <div style={{ fontSize: '2rem', color: 'rgba(178,42,39,0.4)', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 6 }}>"</div>
          <div style={{ ...S.label, color: '#b22a27', marginBottom: 8 }}>{CAT_ICON[tips[0].category] || '💡'} Dernier conseil</div>
          <p style={{ fontSize: '.9rem', color: '#e5e2e1', lineHeight: 1.8, marginBottom: 8 }}>{tips[0].content}</p>
          <div style={{ fontSize: '.68rem', color: '#9CA3AF' }}>— {tips[0].title}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
        {tips.map((t: any) => (
          <div key={t.id} style={{ background: '#1c1b1b', borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 9 }}>{CAT_ICON[t.category] || '💡'}</div>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', letterSpacing: '-.02em', marginBottom: 7, color: '#e5e2e1' }}>{t.title}</div>
            <p style={{ fontSize: '.76rem', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 10 }}>{t.content}</p>
            <span style={S.badge}>{TIP_CATEGORIES.find(c => c.val === t.category)?.label || t.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
