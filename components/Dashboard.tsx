'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Toast ── */
type ToastData = { icon: string; title: string; msg: string };

function Toast() {
  const [data, setData] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (d: ToastData) => {
    setData(d);
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3800);
  };

  useEffect(() => {
    const handler = (e: Event) => show((e as CustomEvent<ToastData>).detail);
    window.addEventListener('sundara:toast', handler);
    return () => window.removeEventListener('sundara:toast', handler);
  }, []);

  const toast = (icon: string, title: string, msg: string) =>
    show({ icon, title, msg });

  // expose globally for child interactions
  useEffect(() => {
    (window as unknown as Record<string, unknown>)._sundaraToast = toast;
  }, []);

  if (!data) return null;
  return (
    <div className={`toast${visible ? ' show' : ''}`}>
      <div className="toast-icon">{data.icon}</div>
      <div className="toast-text">
        <strong>{data.title}</strong>
        <span>{data.msg}</span>
      </div>
      <div className="toast-close" onClick={() => setVisible(false)}>✕</div>
    </div>
  );
}

const fireToast = (icon: string, title: string, msg: string) => {
  window.dispatchEvent(new CustomEvent('sundara:toast', { detail: { icon, title, msg } }));
};

/* ── Live Clock ── */
function LiveClock() {
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      setText(`${days[d.getDay()]}. ${d.getDate()} ${months[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);
  return <div className="atb-clock">{text}</div>;
}

/* ── Fasting Timer ── */
function FastTimer() {
  const [fh, setFh] = useState(15);
  const [fm, setFm] = useState(42);
  useEffect(() => {
    const id = setInterval(() => {
      setFm((m) => {
        if (m > 0) return m - 1;
        setFh((h) => (h > 0 ? h - 1 : 23));
        return 59;
      });
    }, 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="fast-timer">
      {String(fh).padStart(2, '0')}:{String(fm).padStart(2, '0')}
    </div>
  );
}

/* ── Animated bar helper ── */
function AnimBar({ w, color }: { w: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.style.width = w + '%'; obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [w]);
  return (
    <div
      ref={ref}
      style={{ height: '100%', width: 0, borderRadius: 10, transition: 'width 1.6s ease', background: color || 'linear-gradient(90deg,var(--gold-d),var(--gold))' }}
    />
  );
}

/* ── Panel: Overview ── */
function PanelOverview() {
  const clients = [
    { av: 'SF', avStyle: { background: 'linear-gradient(135deg,var(--gold-d),var(--gold))', color: 'var(--k0)' }, name: 'Sophie Falco', prog: 'Programme Force 12 sem.', pct: 64, badges: [{ cls: 'badge-green', txt: 'En ligne' }, { cls: 'badge-gold', txt: 'Sem. 7' }], meta: '4/5 séances · Streak 6j 🔥', alert: { cls: 'badge-green', txt: '↑ +8%' } },
    { av: 'TK', avStyle: { background: 'linear-gradient(135deg,#2563eb,var(--blue))', color: '#fff' }, name: 'Thomas Keller', prog: 'Mindset & Business 8 sem.', pct: 38, badges: [{ cls: 'badge-green', txt: 'En ligne' }, { cls: 'badge-gold', txt: 'Sem. 3' }], meta: '2/4 modules · Actif', alert: { cls: 'badge-blue', txt: 'Normal' } },
    { av: 'AC', avStyle: { background: 'linear-gradient(135deg,#7c3aed,var(--purple))', color: '#fff' }, name: 'Amira Chaoui', prog: 'Nutrition & Forme 12 sem.', pct: 83, badges: [{ cls: 'badge-dim', txt: 'Hors ligne' }, { cls: 'badge-gold', txt: 'Sem. 10' }], meta: 'Fin dans 2 sem.', alert: { cls: 'badge-amber', txt: 'Renouveler' } },
    { av: 'JM', avStyle: { background: 'linear-gradient(135deg,#16a34a,var(--green))', color: '#fff' }, name: 'Julien Martinez', prog: 'Définition & Cardio 8 sem.', pct: 12, badges: [{ cls: 'badge-amber', txt: 'Débutant' }, { cls: 'badge-gold', txt: 'Sem. 1' }], meta: 'Onboarding en cours', alert: { cls: 'badge-amber', txt: 'Nouveau' } },
    { av: 'CL', avStyle: { background: 'linear-gradient(135deg,#dc2626,var(--red))', color: '#fff' }, name: 'Camille Lefort', prog: 'Mindset & Confiance 12 sem.', pct: 42, badges: [{ cls: 'badge-green', txt: 'En ligne' }, { cls: 'badge-gold', txt: 'Sem. 5' }], meta: '3/5 séances', alert: { cls: 'badge-red', txt: '↓ -5%' } },
  ];
  const feed = [
    { cls: 'fi-green', icon: '✅', text: <><strong>Sophie F.</strong> a complété sa séance Haut du Corps — 6/6 exercices terminés · RPE 8/10</>, time: 'Il y a 12 min' },
    { cls: 'fi-gold', icon: '💬', text: <><strong>Thomas K.</strong> a envoyé un message : &quot;Super module mindset, j&apos;ai un check-in demain ?&quot;</>, time: 'Il y a 38 min' },
    { cls: 'fi-blue', icon: '📊', text: <><strong>Amira C.</strong> a atteint 83% de son programme — rapport de progression généré automatiquement</>, time: 'Il y a 1h10' },
    { cls: 'fi-red', icon: '⚠️', text: <><strong>Camille L.</strong> n&apos;a pas complété sa séance planifiée — relance automatique envoyée par SMS</>, time: 'Il y a 2h45' },
    { cls: 'fi-gold', icon: '💰', text: <>Paiement reçu de <strong>Julien M.</strong> — Programme Définition 8 sem. · <strong>€890</strong></>, time: 'Il y a 4h' },
  ];
  return (
    <div>
      <div className="flex-between mb20">
        <div>
          <h3 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Bonjour, <span className="gold">Coach Romain</span> 👋</h3>
          <p style={{ fontSize: '.78rem', color: 'var(--wd)' }}>Lundi 7 Avril — 3 clients actifs aujourd&apos;hui · 1 séance live à 14h00</p>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => fireToast('✅', 'Rapport hebdomadaire', 'Généré et envoyé à vos 8 clients.')}>+ Rapport hebdo</button>
      </div>

      <div className="ov-kpi-grid mb20">
        {[{ lbl: 'Clients actifs', val: '8', ch: '↑ +2 ce mois', up: true }, { lbl: 'CA mensuel', val: '€12.4k', ch: '↑ +34% vs N-1', up: true }, { lbl: 'Taux complétion', val: '78%', ch: '↑ +8pts', up: true }, { lbl: 'NPS moyen', val: '94', ch: '↑ Excellent', up: true }].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.lbl}</div>
            <div className="kpi-val">{k.val}</div>
            <div className={`kpi-change ${k.up ? 'up' : 'down'}`}>{k.ch}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '.7rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 12 }}>Progression clients — Semaine en cours</div>
      <div className="client-progress-list mb20">
        {clients.map((c, i) => (
          <div key={i} className="cp-card">
            <div className="cp-av" style={c.avStyle}>{c.av}</div>
            <div className="cp-info">
              <div className="cp-name">{c.name} <span style={{ fontSize: '.7rem', color: 'var(--wd)', fontWeight: 300 }}>— {c.prog}</span></div>
              <div className="cp-prog-wrap">
                <div className="cp-prog-bar"><AnimBar w={c.pct} /></div>
                <div className="cp-pct">{c.pct}%</div>
              </div>
              <div className="cp-meta">
                {c.badges.map((b, j) => <span key={j} className={`badge ${b.cls}`}>{b.txt}</span>)}
                <span style={{ fontSize: '.68rem', color: 'var(--wd)' }}>{c.meta}</span>
              </div>
            </div>
            <div className="cp-alerts"><span className={`badge ${c.alert.cls}`}>{c.alert.txt}</span></div>
          </div>
        ))}
      </div>

      <div className="flex-between mb12">
        <div style={{ fontSize: '.7rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--wd)' }}>Activité récente</div>
        <span style={{ fontSize: '.68rem', color: 'var(--gold)', cursor: 'pointer' }}>Tout voir →</span>
      </div>
      <div className="feed-list">
        {feed.map((f, i) => (
          <div key={i} className="feed-item">
            <div className={`feed-icon ${f.cls}`}>{f.icon}</div>
            <div className="feed-text">{f.text}</div>
            <div className="feed-time">{f.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Panel: Training ── */
function PanelTraining() {
  const [seg, setSeg] = useState<'day' | 'week' | 'month'>('day');
  const [checks, setChecks] = useState<Record<string, boolean>>({ bench: true, pullup: true });

  const toggleCheck = (id: string) => {
    const next = !checks[id];
    setChecks((prev) => ({ ...prev, [id]: next }));
    if (next) fireToast('✅', 'Exercice complété', 'Marqué comme terminé.');
  };
  const markAll = () => {
    setChecks({ bench: true, pullup: true, dips: true, row: true, ohp: true, core: true });
    fireToast('🏆', 'Séance terminée!', 'Tous les exercices complétés. Bravo!');
  };

  const exercises = [
    { id: 'bench', emoji: '🏋️', name: 'Développé Couché', muscles: [{ cls: 'badge-blue', txt: 'Pec' }, { cls: 'badge-dim', txt: 'Tri' }], sets: 4, reps: 8, load: '80 kg', rest: '90 sec' },
    { id: 'pullup', emoji: '💪', name: 'Tractions Lestées', muscles: [{ cls: 'badge-gold', txt: 'Dos' }, { cls: 'badge-dim', txt: 'Bic' }], sets: 4, reps: 6, load: '+10 kg', rest: '120 sec' },
    { id: 'dips', emoji: '🤸', name: 'Dips Lestés', muscles: [{ cls: 'badge-blue', txt: 'Tri' }, { cls: 'badge-dim', txt: 'Pec' }], sets: 3, reps: 10, load: '+15 kg', rest: '90 sec' },
    { id: 'row', emoji: '🦾', name: 'Rowing Barre', muscles: [{ cls: 'badge-gold', txt: 'Dos' }, { cls: 'badge-dim', txt: 'Bic' }], sets: 4, reps: 8, load: '70 kg', rest: '90 sec' },
    { id: 'ohp', emoji: '⚡', name: 'OHP Haltères', muscles: [{ cls: 'badge-purple', txt: 'Épau' }], sets: 3, reps: 12, load: '28 kg', rest: '75 sec' },
    { id: 'core', emoji: '🔥', name: 'Circuit Core', muscles: [{ cls: 'badge-amber', txt: 'Core' }], sets: 3, reps: '45 s', load: 'PDC', rest: '30 sec' },
  ];

  return (
    <div>
      <div className="prog-selector">
        <div className="prog-seg">
          {(['day', 'week', 'month'] as const).map((s) => (
            <button key={s} className={`seg-btn${seg === s ? ' active' : ''}`} onClick={() => setSeg(s)}>
              {s === 'day' ? 'Jour' : s === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
        <div className="prog-client-sel">
          <span>Client :</span>
          <select onChange={(e) => fireToast('🔄', 'Programme chargé', `Programme de ${e.target.value} affiché.`)}>
            <option>Sophie Falco</option><option>Thomas Keller</option><option>Amira Chaoui</option>
            <option>Julien Martinez</option><option>Camille Lefort</option>
          </select>
        </div>
        <button className="btn btn-xs btn-outline" onClick={() => fireToast('📋', 'Nouveau programme', 'Éditeur de programme ouvert.')}>+ Créer programme</button>
      </div>

      {seg === 'day' && (
        <div>
          <div className="day-header">
            <div className="dh-info">
              <h4>Lundi 7 Avril — Force & Hypertrophie Haut du Corps</h4>
              <p style={{ fontSize: '.75rem', color: 'var(--wd)' }}>Séance 4/5 · Semaine 7 · 75 min estimé</p>
              <div className="intensity-bar">
                <span className="ib-label">Intensité :</span>
                <div className="ib-dots">
                  {[1,2,3,4,5].map((n) => <div key={n} className={`ib-dot${n <= 4 ? ' filled' : ''}`}></div>)}
                </div>
                <span className="ib-label" style={{ color: 'var(--amber)' }}>Haute</span>
              </div>
            </div>
            <div className="dh-tags">
              <span className="badge badge-blue">Force</span>
              <span className="badge badge-gold">Hypertrophie</span>
              <span className="badge badge-green">Haut du corps</span>
              <button className="btn btn-xs btn-ghost btn" onClick={() => fireToast('📨', 'Programme envoyé', 'Séance transmise à Sophie F.')}>Envoyer</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ex-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Exercice</th><th>Muscles</th><th>Séries</th>
                  <th>Reps</th><th>Charge</th><th>Repos</th><th>Fait</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={ex.id} className={checks[ex.id] ? 'done-row' : ''}>
                    <td><div className="ex-name-cell"><div className="ex-emoji">{ex.emoji}</div><div><div className="ex-nm">{ex.name}</div><div className="ex-nm-sub">Cliquer pour détails</div></div></div></td>
                    <td><div className="ex-muscles">{ex.muscles.map((m, j) => <span key={j} className={`badge ${m.cls}`}>{m.txt}</span>)}</div></td>
                    <td><div className="ex-num">{ex.sets}</div></td>
                    <td><div className="ex-num">{ex.reps}</div></td>
                    <td><div className="ex-num">{ex.load}</div></td>
                    <td><div className="ex-detail">{ex.rest}</div></td>
                    <td>
                      <div className={`ex-check${checks[ex.id] ? ' checked' : ''}`} onClick={() => toggleCheck(ex.id)}>
                        {checks[ex.id] ? '✓' : ''}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-between" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 7 }}>
              <button className="btn btn-xs btn-ghost btn" onClick={markAll}>✓ Tout marquer fait</button>
              <button className="btn btn-xs btn-outline btn" onClick={() => fireToast('➕', 'Exercice ajouté', 'Nouvel exercice inséré dans la séance.')}>+ Ajouter exercice</button>
            </div>
            <button className="btn btn-xs btn-gold btn" onClick={() => fireToast('💾', 'Séance sauvegardée', 'Données envoyées au client.')}>Sauvegarder séance</button>
          </div>
        </div>
      )}

      {seg === 'week' && (
        <div>
          <div className="flex-between mb16">
            <div><h4 style={{ fontSize: '1rem', marginBottom: 4 }}>Semaine 7 — 7 au 13 Avril</h4><p style={{ fontSize: '.75rem', color: 'var(--wd)' }}>Sophie Falco · 4 séances planifiées</p></div>
            <span style={{ fontSize: '.7rem', color: 'var(--gold)' }}>Streak : 6 jours 🔥</span>
          </div>
          <div className="week-grid mb16">
            {[{ day: 'Lun', icon: '🏋️', label: 'Haut du corps', cls: 'wc-done' }, { day: 'Mar', icon: '🦵', label: 'Bas du corps', cls: 'wc-done' }, { day: 'Mer', icon: '🧘', label: 'Récupération', cls: 'wc-done' }, { day: 'Jeu', icon: '🏋️', label: 'Full Body', cls: 'wc-done' }, { day: 'Ven', icon: '⚡', label: 'HIIT Core', cls: 'wc-active' }, { day: 'Sam', icon: '😴', label: 'Repos', cls: 'wc-rest' }, { day: 'Dim', icon: '🚶', label: 'Marche', cls: 'wc-rest' }].map((d, i) => (
              <div key={i} className={`week-cell ${d.cls}`}><div className="wc-day">{d.day}</div><div className="wc-icon">{d.icon}</div><div className="wc-label">{d.label}</div></div>
            ))}
          </div>
          <div style={{ background: 'var(--k3)', border: '1px solid var(--wf)', borderRadius: 'var(--rl)', padding: 16 }}>
            <div style={{ fontSize: '.7rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 14 }}>Bilan de la semaine</div>
            <div style={{ display: 'grid', gap: 11 }}>
              {[{ lbl: 'Séances complétées', val: '4/5', w: 80, color: 'linear-gradient(90deg,var(--gold-d),var(--gold))' }, { lbl: 'Volume total', val: '28 400 kg', w: 75, color: 'linear-gradient(90deg,#2563eb,var(--blue))' }, { lbl: 'RPE moyen', val: '7.8/10', w: 78, color: 'linear-gradient(90deg,#16a34a,var(--green))' }].map((r, i) => (
                <div key={i}><div className="flex-between" style={{ fontSize: '.76rem', marginBottom: 6 }}><span style={{ color: 'var(--wd)' }}>{r.lbl}</span><span style={{ color: 'var(--gold)' }}>{r.val}</span></div><div style={{ height: 6, background: 'var(--k5)', borderRadius: 10, overflow: 'hidden' }}><AnimBar w={r.w} color={r.color} /></div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {seg === 'month' && (
        <div>
          <div className="flex-between mb16">
            <div><h4 style={{ fontSize: '1rem', marginBottom: 4 }}>Programme 12 Semaines — Sophie Falco</h4><p style={{ fontSize: '.75rem', color: 'var(--wd)' }}>Phase 4 en cours · 52% complété</p></div>
            <button className="btn btn-xs btn-outline btn" onClick={() => fireToast('📋', 'Plan dupliqué', 'Programme copié vers nouveau client.')}>Dupliquer</button>
          </div>
          <div className="monthly-grid">
            {[{ n: '✓', title: 'Phase 1 — Foundations & Mobilité (Sem. 1-2)', badge: 'badge-green', badgeTxt: 'Terminé', w: 100, footer: '6 séances · 12 exercices', fv: '100%', cls: 'mm-done' }, { n: '✓', title: 'Phase 2 — Endurance de Force (Sem. 3-4)', badge: 'badge-green', badgeTxt: 'Terminé', w: 100, footer: '8 séances · 16 exercices', fv: '100%', cls: 'mm-done' }, { n: '✓', title: 'Phase 3 — Hypertrophie Classique (Sem. 5-6)', badge: 'badge-green', badgeTxt: 'Terminé', w: 100, footer: '8 séances · 20 exercices', fv: '100%', cls: 'mm-done' }, { n: '4', title: 'Phase 4 — Intensité & Surcharge Progressive (Sem. 7-8)', badge: 'badge-gold', badgeTxt: 'En cours', w: 52, footer: '4/8 séances · Sem. 7 active', fv: '52%', cls: 'mm-active' }, { n: '5', title: 'Phase 5 — Définition & Cardio Métabolique (Sem. 9-10)', badge: 'badge-dim', badgeTxt: 'À venir', w: 0, footer: 'Déblocage dans 2 semaines', fv: '0%', cls: '', opacity: .6 }, { n: '6', title: 'Phase 6 — Peak & Test de Performance (Sem. 11-12)', badge: 'badge-dim', badgeTxt: 'Verrouillé', w: 0, footer: 'Phase finale', fv: '0%', cls: '', opacity: .42 }].map((m, i) => (
              <div key={i} className={`m-module ${m.cls}`} style={m.opacity ? { opacity: m.opacity } : {}}>
                <div className="mm-top"><div className="mm-num">{m.n}</div><div className="mm-title">{m.title}</div><span className={`badge ${m.badge}`}>{m.badgeTxt}</span></div>
                <div className="mm-bar-wrap"><AnimBar w={m.w} /></div>
                <div className="mm-footer"><span>{m.footer}</span><span style={{ color: m.w > 0 ? 'var(--gold)' : undefined }}>{m.fv}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Panel: Nutrition ── */
function PanelNutrition() {
  const [mealsDone, setMealsDone] = useState<Record<number, boolean>>({ 0: true, 1: true });

  const meals = [
    { emoji: '🥚', name: 'Petit-déjeuner — 12h00', desc: "Omelette 3 œufs · Avocat ½ · Flocons avoine 60g · Myrtilles fraîches", kcal: 520, prot: 38, gluc: 45, lip: 18, time: '12:00' },
    { emoji: '🍗', name: 'Déjeuner — 15h30', desc: "Poulet 180g · Riz basmati 120g · Brocolis vapeur · Huile d'olive 1 cs", kcal: 620, prot: 58, gluc: 75, lip: 12, time: '15:30' },
    { emoji: '🥛', name: 'Collation Post-Training — 18h00', desc: "Shake protéiné 40g · Banane · Beurre cacahuète 15g", kcal: 340, prot: 42, gluc: 32, lip: 8, time: '18:00' },
    { emoji: '🐟', name: 'Dîner — 19h30', desc: "Saumon 160g · Patate douce 150g · Haricots verts · Citron", kcal: 370, prot: 38, gluc: 33, lip: 10, time: '19:30' },
  ];

  return (
    <div>
      <div className="nut-client-header">
        <div className="nut-av">SF</div>
        <div className="nut-info">
          <h4>Sophie Falco — Plan Nutritionnel Actif</h4>
          <p>Déficit -300 kcal · Phase Définition · Semaine 7/12 · 16/8 Jeûne Intermittent</p>
        </div>
        <div className="nut-actions">
          <button className="btn btn-xs btn-outline btn" onClick={() => fireToast('📤', 'Plan envoyé', 'Nutrition du jour transmise à Sophie.')}>Envoyer</button>
          <button className="btn btn-xs btn-gold btn" onClick={() => fireToast('✏️', 'Mode édition', 'Modifier le plan nutritionnel.')}>Modifier</button>
        </div>
      </div>

      <div className="macro-grid mb16">
        {[{ icon: '🔥', val: '1 850', unit: 'kcal / jour', lbl: 'Objectif calorique', w: 78, color: 'var(--gold)', barCls: 'mc-gold' }, { icon: '🥩', val: '165 g', unit: 'protéines', lbl: '36% des calories', w: 82, color: 'var(--blue)', barCls: 'mc-blue' }, { icon: '🌾', val: '185 g', unit: 'glucides', lbl: '40% des calories', w: 65, color: 'var(--amber)', barCls: 'mc-amber' }, { icon: '🥑', val: '55 g', unit: 'lipides', lbl: '24% des calories', w: 70, color: 'var(--green)', barCls: 'mc-green' }].map((m, i) => (
          <div key={i} className="mac-card">
            <div className="mac-icon">{m.icon}</div>
            <div className="mac-val" style={{ color: m.color }}>{m.val}</div>
            <div className="mac-unit">{m.unit}</div>
            <div className="mac-label">{m.lbl}</div>
            <div className="mac-bar"><div className={`mac-fill ${m.barCls}`} style={{ width: m.w + '%' }}></div></div>
          </div>
        ))}
      </div>

      <div className="fast-widget mb16">
        <FastTimer />
        <div className="fast-body">
          <h4>Jeûne Intermittent 16/8 ⏱</h4>
          <p>Fenêtre alimentaire : 12h00 – 20h00 · Jeûne en cours · <strong style={{ color: 'var(--gold)' }}>4h18 restantes</strong></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-xs btn-gold btn" onClick={() => fireToast('⏱', 'Jeûne démarré', 'Timer activé pour Sophie F.')}>Démarrer jeûne</button>
            <button className="btn btn-xs btn-ghost btn" onClick={() => fireToast('✏️', 'Fenêtre modifiée', 'Nouvel horaire enregistré.')}>Modifier fenêtre</button>
          </div>
          <div className="fast-prog-bar"><div className="fast-prog-fill" style={{ width: '68%' }}></div></div>
        </div>
      </div>

      <div style={{ fontSize: '.7rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 11 }}>Plan repas — Lundi</div>
      <div className="meal-plan-grid">
        {meals.map((meal, i) => (
          <div key={i} className={`meal-row${mealsDone[i] ? ' meal-done' : ''}`}>
            <div className="meal-emoji">{meal.emoji}</div>
            <div className="meal-info">
              <div className="meal-name">{meal.name}</div>
              <div className="meal-desc">{meal.desc}</div>
              <div className="meal-macros-row">
                <div className="meal-m">🔥 <strong>{meal.kcal}</strong> kcal</div>
                <div className="meal-m">🥩 <strong>{meal.prot}g</strong> prot</div>
                <div className="meal-m">🌾 <strong>{meal.gluc}g</strong> gluc</div>
                <div className="meal-m">🥑 <strong>{meal.lip}g</strong> lip</div>
              </div>
            </div>
            <div className="meal-time">{meal.time}</div>
            <div
              className={`done-btn${mealsDone[i] ? ' done' : ''}`}
              style={{ marginLeft: 8 }}
              onClick={() => {
                const next = !mealsDone[i];
                setMealsDone((prev) => ({ ...prev, [i]: next }));
                if (next) fireToast('✅', 'Repas enregistré', 'Marqué comme pris.');
              }}
            >
              {mealsDone[i] ? '✓ Pris' : 'Marquer'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Panel: Clients ── */
function PanelClients() {
  const [showAdd, setShowAdd] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');

  const clientCards = [
    { av: 'SF', avStyle: { background: 'linear-gradient(135deg,var(--gold-d),var(--gold))', color: 'var(--k0)' }, name: 'Sophie Falco', niche: '🏋️ Fitness · Programme Force 12 sem.', pct: 64, badges: [{ cls: 'badge-green', txt: 'En ligne' }, { cls: 'badge-gold', txt: 'Actif' }], stats: [{ v: '7/12', l: 'Semaine' }, { v: '94', l: 'NPS' }, { v: '€890', l: 'CA' }] },
    { av: 'TK', avStyle: { background: 'linear-gradient(135deg,#2563eb,var(--blue))', color: '#fff' }, name: 'Thomas Keller', niche: '🧠 Mindset & Business 8 sem.', pct: 38, badges: [{ cls: 'badge-green', txt: 'En ligne' }, { cls: 'badge-blue', txt: 'Business' }], stats: [{ v: '3/8', l: 'Semaine' }, { v: '88', l: 'NPS' }, { v: '€1.2k', l: 'CA' }] },
    { av: 'AC', avStyle: { background: 'linear-gradient(135deg,#7c3aed,var(--purple))', color: '#fff' }, name: 'Amira Chaoui', niche: '🥗 Nutrition & Forme 12 sem.', pct: 83, badges: [{ cls: 'badge-dim', txt: 'Hors ligne' }, { cls: 'badge-amber', txt: 'Finit bientôt' }], stats: [{ v: '10/12', l: 'Semaine' }, { v: '96', l: 'NPS' }, { v: '€890', l: 'CA' }] },
    { av: 'JM', avStyle: { background: 'linear-gradient(135deg,#16a34a,var(--green))', color: '#fff' }, name: 'Julien Martinez', niche: '🏃 Définition & Cardio 8 sem.', pct: 12, badges: [{ cls: 'badge-amber', txt: 'Nouveau' }], stats: [{ v: '1/8', l: 'Semaine' }, { v: '—', l: 'NPS' }, { v: '€690', l: 'CA' }] },
  ];

  return (
    <div>
      <div className="flex-between mb16">
        <div><h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Mes Clients <span className="gold">(8)</span></h3><p style={{ fontSize: '.75rem', color: 'var(--wd)' }}>Gérez, ajoutez et suivez vos clients en temps réel.</p></div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowAdd((v) => !v)}>+ Nouveau client</button>
      </div>

      {showAdd && (
        <div className="add-client-panel" style={{ marginBottom: 16 }}>
          <div className="acp-header" onClick={() => setShowAdd(false)}>
            <div className="badge badge-gold">Nouveau client</div>
            <h4>Ajouter un client</h4>
            <div className="acp-toggle-icon">✕</div>
          </div>
          <div className="form-row">
            <div className="fld"><label>Prénom</label><input type="text" placeholder="Sophie" value={prenom} onChange={(e) => setPrenom(e.target.value)} /></div>
            <div className="fld"><label>Nom</label><input type="text" placeholder="Falco" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="fld"><label>Email</label><input type="email" placeholder="sophie@email.com" /></div>
            <div className="fld"><label>Téléphone</label><input type="tel" placeholder="+33 6 00 00 00 00" /></div>
          </div>
          <div className="form-row">
            <div className="fld"><label>Type de coaching</label><select><option>Fitness & Sport</option><option>Nutrition & Santé</option><option>Mindset & Développement</option><option>Business</option><option>Dating</option></select></div>
            <div className="fld"><label>Durée programme</label><select><option>4 semaines</option><option>8 semaines</option><option>12 semaines</option><option>6 mois</option></select></div>
          </div>
          <div className="form-row">
            <div className="fld"><label>Objectif principal</label><input type="text" placeholder="Ex: Prise de masse, -10 kg, confiance..." /></div>
            <div className="fld"><label>Tarif</label><input type="text" placeholder="Ex: €890 / programme" /></div>
          </div>
          <div className="fld mb12"><label>Notes coach</label><textarea rows={2} placeholder="Contraintes, allergies, disponibilités..."></textarea></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-gold btn-sm" onClick={() => { setShowAdd(false); fireToast('🎉', 'Client créé!', `${prenom || 'Nouveau'} ${nom || 'Client'} ajouté à votre liste.`); }}>Créer le client</button>
            <button className="btn btn-ghost btn-sm btn" onClick={() => setShowAdd(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="client-cards">
        {clientCards.map((c, i) => (
          <div key={i} className="client-card">
            <div className="cc-top">
              <div className="cc-av" style={c.avStyle}>{c.av}</div>
              <div className="cc-status">{c.badges.map((b, j) => <span key={j} className={`badge ${b.cls}`}>{b.txt}</span>)}</div>
            </div>
            <div className="cc-name">{c.name}</div>
            <div className="cc-niche">{c.niche}</div>
            <div className="cc-progress-row">
              <div className="cc-prog-label"><span>Progression</span><span className="cc-prog-val">{c.pct}%</span></div>
              <div className="cc-prog-bar"><AnimBar w={c.pct} /></div>
            </div>
            <div className="cc-stats">{c.stats.map((s, j) => <div key={j} className="cc-stat"><div className="cc-stat-val">{s.v}</div><div className="cc-stat-label">{s.l}</div></div>)}</div>
            <div className="cc-actions">
              <button className="btn btn-xs btn-outline btn" onClick={() => fireToast('💬', 'Message envoyé', `SMS envoyé à ${c.name.split(' ')[0]}.`)}>Message</button>
              <button className="btn btn-xs btn-ghost btn" onClick={() => fireToast('📊', 'Rapport ouvert', `Rapport de ${c.name.split(' ')[0]} chargé.`)}>Rapport</button>
              <button className="btn btn-xs btn-gold btn" onClick={() => fireToast('👤', 'Client ouvert', `Gestion de ${c.name}.`)}>Gérer →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Panel: Analytics ── */
function PanelAnalytics() {
  const bars = [
    { tip: '€6.1k', h: 49, lbl: 'Avr' }, { tip: '€7.2k', h: 58, lbl: 'Mai' }, { tip: '€6.8k', h: 55, lbl: 'Juin' },
    { tip: '€5.4k', h: 43, lbl: 'Juil' }, { tip: '€7.8k', h: 62, lbl: 'Aoû' }, { tip: '€8.4k', h: 67, lbl: 'Sep' },
    { tip: '€9.1k', h: 73, lbl: 'Oct' }, { tip: '€9.8k', h: 78, lbl: 'Nov' }, { tip: '€8.9k', h: 71, lbl: 'Déc' },
    { tip: '€10.4k', h: 83, lbl: 'Jan' }, { tip: '€11.2k', h: 89, lbl: 'Fév' }, { tip: '€12.4k', h: 99, lbl: 'Mar' },
  ];
  const engagement = [
    { name: 'Sophie F.', prog: 'Force 12 sem.', pct: 64 },
    { name: 'Amira C.', prog: 'Nutrition 12 sem.', pct: 83 },
    { name: 'Camille L.', prog: 'Mindset 12 sem.', pct: 42 },
    { name: 'Thomas K.', prog: 'Business 8 sem.', pct: 38 },
    { name: 'Julien M.', prog: 'Définition 8 sem.', pct: 12 },
  ];

  const BarCol = ({ tip, h, lbl }: { tip: string; h: number; lbl: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.style.height = h + '%'; obs.disconnect(); } }, { threshold: 0.3 });
      obs.observe(el);
      return () => obs.disconnect();
    }, [h]);
    return (
      <div className="bar-col">
        <div className="bar-val-tip">{tip}</div>
        <div ref={ref} className="bar-fill" style={{ height: 0 }}></div>
        <div className="bar-label">{lbl}</div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex-between mb20">
        <div><h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Analyses & Performances</h3><p style={{ fontSize: '.75rem', color: 'var(--wd)' }}>Données agrégées · Avril 2025</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-xs btn-ghost btn" onClick={() => fireToast('📥', 'Export CSV', 'Fichier généré et téléchargé.')}>Exporter CSV</button>
          <button className="btn btn-xs btn-gold btn" onClick={() => fireToast('📧', 'Rapport mensuel', 'Rapport PDF généré et envoyé.')}>Rapport mensuel</button>
        </div>
      </div>
      <div className="stat-row mb16">
        <div className="stat-box"><div className="stat-box-val">€12.4k</div><div className="stat-box-label">CA avril</div></div>
        <div className="stat-box"><div className="stat-box-val">78%</div><div className="stat-box-label">Complétion moyenne</div></div>
        <div className="stat-box"><div className="stat-box-val">+34%</div><div className="stat-box-label">Croissance MoM</div></div>
      </div>
      <div className="chart-card">
        <div className="chart-header">
          <div><div className="chart-title">CA mensuel — 12 derniers mois</div><div className="chart-sub">Revenus cumulés par mois · En euros</div></div>
          <span className="badge badge-gold">+34% vs N-1</span>
        </div>
        <div className="bar-chart">
          {bars.map((b, i) => <BarCol key={i} {...b} />)}
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-header">
          <div><div className="chart-title">Engagement clients — Complétion de programme</div><div className="chart-sub">Taux de complétion par client actif</div></div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {engagement.map((e, i) => (
            <div key={i}>
              <div className="flex-between" style={{ fontSize: '.75rem', marginBottom: 6, color: 'var(--wd)' }}>
                <span><strong style={{ color: 'var(--w)' }}>{e.name}</strong> · {e.prog}</span>
                <span style={{ color: 'var(--gold)' }}>{e.pct}%</span>
              </div>
              <div style={{ height: 7, background: 'var(--k4)', borderRadius: 10, overflow: 'hidden' }}>
                <AnimBar w={e.pct} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Panel: Coach Tips ── */
function PanelCoachTips() {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const tips = [
    { icon: '🎯', title: 'Fixer des intentions précises', text: "Avant chaque séance, aidez votre client à formuler un objectif spécifique — pas \"s'entraîner\" mais \"battre son record au squat de 2.5 kg\".", extra: "Cette pratique valide par la psychologie du sport augmente la performance de 18% en moyenne. Intégrez un champ \"intention du jour\" dans votre dashboard client SundaraFlow. Revisitez-la lors du check-in post-séance pour ancrer la progression et renforcer la confiance." },
    { icon: '📊', title: 'La règle des 1% quotidien', text: "Chaque micro-progrès compte. Enseignez à vos clients que 1% d'amélioration par jour = 37x meilleur en un an grâce aux effets composés.", extra: "Utilisez les analytics SundaraFlow pour montrer visuellement cette progression. Les clients qui voient leurs données progresser ont un taux de rétention de 89% contre 52% pour ceux qui ne traquent pas. La visualisation du progrès est un levier de motivation sous-estimé." },
    { icon: '😴', title: 'Optimiser la récupération client', text: "80% de la progression se passe pendant le sommeil. Intégrez un suivi du sommeil dans votre programme — c'est un indicateur clé souvent négligé.", extra: "Protocole recommandé : questionnaire hebdomadaire sur la qualité du sommeil, ajustement de l'intensité des séances si moins de 7h. SundaraFlow permet d'intégrer ces métriques dans le tableau de bord client et d'alerter automatiquement si les données baissent." },
    { icon: '🔄', title: 'Gérer les semaines difficiles', text: "Chaque client atraversera des semaines de résistance. Préparez une \"protocole minimal\" — le minimum à faire pour maintenir le momentum.", extra: "Pour chaque client, définissez dès l'onboarding un \"minimum vital\" : 2 séances de 30 min max, repas simplifiés, sans pression de performance. Ce filet de sécurité réduit l'abandon de 64%. SundaraFlow peut automatiquement activer ce mode si 2 séances consécutives sont manquées." },
    { icon: '💬', title: 'Communication proactive', text: "Les coachs qui envoient un message d'encouragement personnalisé dans les 24h post-séance ont 3x plus de rétention client à 6 mois.", extra: "SundaraFlow automatise 80% de ces touches de communication — félicitations lors d'une PR, rappel personnalisé si séance manquée, encouragement au milieu d'une phase difficile. Vous gardez le côté humain sans y passer 3h par jour." },
    { icon: '📸', title: 'Les photos de progression', text: "Les photos bimensuelles sont plus motivantes que la balance. Aidez vos clients à documenter leur transformation visuelle avec un protocole standardisé.", extra: "Protocole photo standardisé : même lumière, même heure, même angle (face / profil / dos). J0, J14, J30, J60, J90. SundaraFlow permet de stocker ces photos de façon sécurisée dans l'espace client. La progression visuelle est souvent plus impactante que les chiffres seuls." },
  ];

  return (
    <div>
      <div className="tip-hero mb20">
        <div className="tip-qm">&ldquo;</div>
        <div>
          <div className="tip-lbl">🌟 Conseil du jour — Pour vos clients</div>
          <div className="tip-quote">La constance bat toujours l&apos;intensité. Un client qui s&apos;entraîne 4 fois par semaine pendant 6 mois surpassera toujours celui qui s&apos;entraîne 6 fois par semaine pendant 6 semaines.</div>
          <div className="tip-author">— Méthode SundaraFlow · Mindset & Performance Coach</div>
        </div>
      </div>
      <div className="advice-grid">
        {tips.map((t, i) => (
          <div key={i} className="adv-card" onClick={() => setOpen((prev) => ({ ...prev, [i]: !prev[i] }))}>
            <div className="adv-icon">{t.icon}</div>
            <h4>{t.title}</h4>
            <p>{t.text}</p>
            <div className="adv-expand">Lire plus <span>{open[i] ? '↑' : '↓'}</span></div>
            <div className={`adv-extra${open[i] ? ' open' : ''}`}>
              <div className="adv-extra-inner">{t.extra}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sidebar ── */
type Tab = 'overview' | 'training' | 'nutrition' | 'clients' | 'analytics' | 'coachtips';

function Sidebar({ activeTab, setTab }: { activeTab: Tab; setTab: (t: Tab) => void }) {
  const [selectedClient, setSelectedClient] = useState('sophie');
  const nav = [
    { icon: '🏠', label: 'Dashboard', tab: 'overview' as Tab },
    { icon: '🏋️', label: 'Programmes', tab: 'training' as Tab, badge: { cls: 'badge-gold', txt: 'Actif' } },
    { icon: '🥗', label: 'Nutrition', tab: 'nutrition' as Tab },
    { icon: '👥', label: 'Clients', tab: 'clients' as Tab, badge: { cls: 'badge-blue', txt: '8' } },
    { icon: '💬', label: 'Messages', badge: { cls: 'badge-red', txt: '3' } },
    { icon: '📈', label: 'Analyses', tab: 'analytics' as Tab },
    { icon: '💳', label: 'Paiements' },
    { icon: '⚙️', label: 'Paramètres' },
  ];
  const clients = [
    { id: 'sophie', initials: 'SF', name: 'Sophie F.', sub: 'Sem. 7/12', online: true },
    { id: 'thomas', initials: 'TK', name: 'Thomas K.', sub: 'Sem. 3/8', cls: 'av-blue', online: true },
    { id: 'amira', initials: 'AC', name: 'Amira C.', sub: 'Sem. 10/12', cls: 'av-purple', online: false },
    { id: 'julien', initials: 'JM', name: 'Julien M.', sub: 'Sem. 1/8', cls: 'av-green', online: false },
    { id: 'camille', initials: 'CL', name: 'Camille L.', sub: 'Sem. 5/12', cls: 'av-red', online: true },
  ];

  return (
    <div className="app-sidebar">
      <div className="sb-section">
        <div className="sb-section-label">Navigation</div>
        {nav.map((n, i) => (
          <div
            key={i}
            className={`sb-nav-item${activeTab === n.tab ? ' active' : ''}`}
            onClick={() => n.tab && setTab(n.tab)}
          >
            <span className="sbi">{n.icon}</span>
            {n.label}
            {n.badge && <span className={`sb-badge badge ${n.badge.cls}`}>{n.badge.txt}</span>}
          </div>
        ))}
      </div>
      <div className="sb-section">
        <div className="sb-section-label">Clients récents</div>
        <div className="sb-clients">
          {clients.map((c) => (
            <div
              key={c.id}
              className={`sb-client${selectedClient === c.id ? ' selected' : ''}`}
              onClick={() => { setSelectedClient(c.id); fireToast('👤', 'Client sélectionné', `Données de ${c.id} chargées.`); }}
            >
              <div className={`sb-client-av${c.cls ? ' ' + c.cls : ''}`}>{c.initials}</div>
              <div className="sb-client-info">
                <div className="sb-client-name">{c.name}</div>
                <div className="sb-client-sub">{c.sub}</div>
              </div>
              <div className={`sb-client-dot${c.online ? ' online' : ''}`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: 'overview', label: '📊 Vue d\'ensemble', badge: 'Live' },
    { id: 'training', label: '🏋️ Entraînement' },
    { id: 'nutrition', label: '🥗 Nutrition' },
    { id: 'clients', label: '👥 Clients', badge: '8' },
    { id: 'analytics', label: '📈 Analyses' },
    { id: 'coachtips', label: '🧠 Conseils' },
  ];

  return (
    <>
      <section id="dashboard" className="section">
        <div className="container">
          <div className="dash-header reveal">
            <div className="tag">💎 Tableau de bord coach</div>
            <h2>Votre cockpit complet<br /><span className="gold-i">en un seul endroit.</span></h2>
            <div className="divider divider--c"></div>
            <p>Gérez vos clients, programmes, nutrition et analyses — le tout dans une interface fluide et premium pensée pour l&apos;efficacité.</p>
          </div>

          <div className="app-shell reveal">
            {/* Titlebar */}
            <div className="app-titlebar">
              <div className="atb-left">
                <div className="atb-dots">
                  <div className="atb-dot atb-dot-r"></div>
                  <div className="atb-dot atb-dot-y"></div>
                  <div className="atb-dot atb-dot-g"></div>
                </div>
                <div className="atb-brand">Sundara<span>Flow</span> — Coach Dashboard v2.4</div>
              </div>
              <div className="atb-right">
                <LiveClock />
                <div className="atb-user">
                  <div className="atb-av">RC</div>
                  <span>Coach Romain</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="main-tabs">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`main-tab${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                  {t.badge && <span className="tbadge">{t.badge}</span>}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="app-body">
              <Sidebar activeTab={activeTab} setTab={setActiveTab} />
              <div className="app-main">
                <div className={`panel${activeTab === 'overview' ? ' active' : ''}`}><PanelOverview /></div>
                <div className={`panel${activeTab === 'training' ? ' active' : ''}`}><PanelTraining /></div>
                <div className={`panel${activeTab === 'nutrition' ? ' active' : ''}`}><PanelNutrition /></div>
                <div className={`panel${activeTab === 'clients' ? ' active' : ''}`}><PanelClients /></div>
                <div className={`panel${activeTab === 'analytics' ? ' active' : ''}`}><PanelAnalytics /></div>
                <div className={`panel${activeTab === 'coachtips' ? ' active' : ''}`}><PanelCoachTips /></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Toast />
    </>
  );
}
