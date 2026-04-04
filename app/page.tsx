'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const FEATURES = [
  { icon: '📋', title: 'Programmes sur-mesure', desc: 'Créez des programmes sport, nutrition et mindset personnalisés pour chacun de vos membres. Assignation en un clic.' },
  { icon: '🥗', title: 'Plans nutritionnels', desc: 'Définissez les macros, l\'objectif calorique, le déficit et le protocole de jeûne intermittent de chaque membre.' },
  { icon: '📊', title: 'Suivi en temps réel', desc: 'Tableaux de bord dynamiques pour visualiser la progression de chaque membre semaine après semaine.' },
  { icon: '💡', title: 'Conseils & Lifestyle', desc: 'Publiez des conseils nutrition, entraînement et mindset visibles instantanément par tous vos membres.' },
  { icon: '⏱️', title: 'Jeûne intermittent', desc: 'Assignez des protocoles 14/10, 16/8, 18/6 ou 20/4 avec fenêtre alimentaire personnalisée et suivi live.' },
  { icon: '🔒', title: 'Espace sécurisé', desc: 'Authentification Firebase, accès séparé coach/membre, données chiffrées et connexion SSL certifiée.' },
];

const HOW_STEPS = [
  { n: '01', title: 'Créez votre espace', desc: 'Inscrivez-vous en 30 secondes. Votre dashboard coach est prêt instantanément, sans carte bancaire.' },
  { n: '02', title: 'Invitez vos membres', desc: 'Ajoutez vos clients par email. Ils reçoivent leur accès et trouvent leurs programmes déjà prêts.' },
  { n: '03', title: 'Suivez & progressez', desc: 'Créez, assignez et ajustez les programmes en temps réel. Vos membres progressent, vous scalez.' },
];

const TESTIMONIALS = [
  { name: 'Thomas M.', role: 'Coach performance · 34 membres actifs', img: 'https://i.pravatar.cc/150?img=11', stat: '+70%', statLabel: 'de temps gagné', stars: 5, text: 'SundaraFlow a transformé ma façon de coacher. En 3 mois, j\'ai doublé mes membres actifs et réduit mon temps administratif de 70%. C\'est l\'outil que j\'attendais.', featured: true },
  { name: 'Sarah K.', role: 'Coach nutrition · 18 membres', img: 'https://i.pravatar.cc/150?img=47', stat: '×2', statLabel: 'membres en 3 mois', stars: 5, text: 'La section nutrition est incroyable. Mes clientes suivent leurs macros avec précision et voient leurs résultats s\'améliorer semaine après semaine.', featured: false },
  { name: 'Marc D.', role: 'Coach crossfit · 22 membres', img: 'https://i.pravatar.cc/150?img=32', stat: '4.9★', statLabel: 'note moyenne', stars: 5, text: 'Interface premium, aucun bug, support réactif. Je recommande à tous mes collègues coachs sans hésitation.', featured: false },
  { name: 'Lucie V.', role: 'Membre · Suivi depuis 4 mois', img: 'https://i.pravatar.cc/150?img=25', stat: '-8 kg', statLabel: 'en 4 mois', stars: 5, text: 'Mon coach m\'a assigné un programme complet dès le 1er jour. Je suis mes macros en temps réel, c\'est très motivant.', featured: false },
  { name: 'Romain T.', role: 'Coach bien-être · 12 membres', img: 'https://i.pravatar.cc/150?img=58', stat: '0€', statLabel: 'pour démarrer', stars: 5, text: 'Gratuit pour commencer, interface pro, et mes membres adorent leur espace. Parfait pour lancer son activité.', featured: false },
];

const PLANS = [
  { name: 'STARTER', price: 'Gratuit', per: '', recommended: false, features: ['3 membres maximum', 'Programmes sport & nutrition', 'Dashboard coach', 'Support email'], cta: 'COMMENCER GRATUITEMENT →', ctaAction: '/register/coach' },
  { name: 'PRO', price: '29€', per: '/mois', recommended: true, features: ['20 membres', 'Tout Starter inclus', 'Protocoles de jeûne', 'Conseils lifestyle', 'Statistiques avancées'], cta: 'ESSAYER 1 MOIS GRATUIT →', ctaAction: '/register/coach' },
  { name: 'ÉLITE', price: '59€', per: '/mois', recommended: false, features: ['Membres illimités', 'Tout Pro inclus', 'Branding personnalisé', 'Export PDF', 'Account manager dédié'], cta: 'CONTACTER L\'ÉQUIPE →', ctaAction: '/login' },
];

const FAQS = [
  { q: 'Comment fonctionne SundaraFlow pour un coach ?', a: 'Créez votre compte coach, ajoutez vos membres par email, créez des programmes personnalisés et assignez-les en un clic. Gérez nutrition, conseils et suivi depuis votre tableau de bord.' },
  { q: 'Un membre peut-il voir les données des autres ?', a: 'Non. Chaque membre accède uniquement à son propre espace. Les données sont strictement isolées par compte.' },
  { q: 'L\'application est-elle gratuite ?', a: 'L\'accès Starter est gratuit pour démarrer avec 3 membres. Les plans Pro et Élite débloquent plus de membres et de fonctionnalités avancées.' },
  { q: 'Puis-je gérer plusieurs membres simultanément ?', a: 'Oui. Votre tableau de bord vous permet de gérer jusqu\'à 20 membres en Pro et illimités en Élite, avec navigation rapide entre les profils.' },
  { q: 'Mes membres doivent-ils payer ?', a: 'Non. Seul le coach souscrit un plan. Les membres accèdent à leur espace gratuitement, invités par leur coach.' },
  { q: 'Puis-je annuler à tout moment ?', a: 'Oui, sans engagement. Vous pouvez annuler votre abonnement en 1 clic depuis votre tableau de bord, sans frais de résiliation.' },
  { q: 'Comment inviter un membre ?', a: 'Depuis votre dashboard, cliquez sur "Ajouter un membre", entrez son email. Il reçoit une invitation et crée son compte en 30 secondes.' },
  { q: 'L\'app est-elle mobile ?', a: 'SundaraFlow est entièrement responsive et fonctionne sur mobile via le navigateur. Une application native iOS/Android est en cours de développement.' },
];

function calcNutrition(w: number, h: number, a: number, sex: string, act: number, goal: string) {
  const bmr = sex === 'H' ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a;
  const tdee = bmr * act;
  const target = goal === 'perte' ? tdee - 500 : goal === 'prise' ? tdee + 300 : tdee;
  const prot = Math.round((target * 0.30) / 4);
  const carbs = Math.round((target * 0.40) / 4);
  const fat = Math.round((target * 0.30) / 9);
  const fasting = goal === 'perte' ? '16/8' : goal === 'prise' ? '12/12' : '14/10';
  return { kcal: Math.round(target), prot, carbs, fat, fasting };
}

function useCounter(target: number, decimals: number, duration: number, trigger: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    if (target === 0) { setVal(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(parseFloat((p * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, trigger]);
  return val;
}

export default function LandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLElement>(null);

  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [age, setAge] = useState(30);
  const [sex, setSex] = useState<'H' | 'F'>('H');
  const [activity, setActivity] = useState(1.55);
  const [goal, setGoal] = useState<'perte' | 'maintien' | 'prise'>('perte');
  const [calcResult, setCalcResult] = useState<{ kcal: number; prot: number; carbs: number; fat: number; fasting: string } | null>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('.sf-reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('sf-revealed'); obs.unobserve(e.target); } });
    }, { threshold: 0.15 });
    items.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Ferme le menu si on clique ailleurs
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const c1 = useCounter(47, 0, 800, statsVisible);
  const c2 = useCounter(312, 0, 800, statsVisible);
  const c3 = useCounter(4.8, 1, 800, statsVisible);

  return (
    <div className="sf-root">

      {/* ── NAV ── */}
      <nav className="sf-nav" onClick={e => e.stopPropagation()}>
        <div className="sf-nav-inner">
          <div className="sf-logo" onClick={() => router.push('/')}>Sundara<span>Flow</span></div>
          <div className="sf-nav-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#pricing">Tarifs</a>
            <a href="#roles">Coaches & Membres</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="sf-nav-ctas">
            <button className="sf-btn-ghost" onClick={() => router.push('/login')}>Connexion</button>
            <button className="sf-btn-primary" onClick={() => router.push('/register/coach')}>Commencer</button>
          </div>
          <button
            className="sf-burger"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Menu mobile — dropdown vers le bas, jamais de débordement */}
        {menuOpen && (
          <div className="sf-mobile-menu" onClick={e => e.stopPropagation()}>
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Tarifs</a>
            <a href="#roles" onClick={() => setMenuOpen(false)}>Coaches &amp; Membres</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <div className="sf-mobile-menu-divider" />
            <button className="sf-btn-ghost sf-mobile-btn" onClick={() => { router.push('/login'); setMenuOpen(false); }}>Connexion</button>
            <button className="sf-btn-primary sf-mobile-btn" onClick={() => { router.push('/register/coach'); setMenuOpen(false); }}>Commencer gratuitement</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="sf-hero">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80" alt="" className="sf-hero-img" />
        <div className="sf-hero-ov-base" />
        <div className="sf-hero-ov-crimson" />
        <div className="sf-hero-ov-bottom" />
        <div className="sf-hero-content">
          <div className="sf-eyebrow sf-fu sf-fu-1">⚡ Plateforme de coaching d&apos;élite</div>
          <h1 className="sf-hero-title sf-fu sf-fu-2">
            Le système que<br />les coachs<br /><span className="sf-accent">d&apos;élite utilisent.</span>
          </h1>
          <p className="sf-hero-sub sf-fu sf-fu-3">
            Gérez vos membres, créez des programmes sur-mesure, suivez la nutrition et la progression — dans une interface premium conçue pour les coachs ambitieux.
          </p>
          <div className="sf-hero-btns sf-fu sf-fu-4">
            <button className="sf-btn-primary sf-btn-lg" onClick={() => router.push('/register/coach')}>Créer mon espace coach →</button>
            <button className="sf-btn-ghost sf-btn-lg" onClick={() => router.push('/register/client')}>Je suis membre</button>
          </div>
          <div className="sf-hero-badge sf-fu sf-fu-4">⚡ 1 mois d&apos;essai gratuit — Sans carte bancaire</div>
          <p className="sf-hero-note sf-fu sf-fu-5">Gratuit pour démarrer · Sans carte bancaire · Accès instantané</p>
        </div>
        <div className="sf-scroll-hint"><div className="sf-scroll-dot" /></div>
      </section>

      {/* ── STATS ── */}
      <section className="sf-stats" ref={statsRef as React.RefObject<HTMLElement>}>
        <div className="sf-stats-inner">
          <div className="sf-stat-item"><div className="sf-stat-val">{c1}</div><div className="sf-stat-label">Coachs actifs</div></div>
          <div className="sf-stat-item"><div className="sf-stat-val">{c2}</div><div className="sf-stat-label">Membres inscrits</div></div>
          <div className="sf-stat-item"><div className="sf-stat-val">{c3}★</div><div className="sf-stat-label">Note moyenne</div></div>
          <div className="sf-stat-item"><div className="sf-stat-val">0€</div><div className="sf-stat-label">Pour démarrer</div></div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="sf-section sf-reveal">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Deux espaces distincts</div>
            <h2 className="sf-section-title">Conçu pour <span className="sf-accent">chaque rôle.</span></h2>
            <p className="sf-section-sub">Un espace dédié au coach, un espace dédié au membre. Chacun accède uniquement à ce qui le concerne.</p>
          </div>
          <div className="sf-roles-grid">
            <div className="sf-role-card">
              <div className="sf-role-img-wrap">
                <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80" alt="Coach" className="sf-role-img" />
                <div className="sf-role-img-ov" />
                <div className="sf-role-badge">🏆 Espace Coach</div>
              </div>
              <div className="sf-role-body">
                <h3 className="sf-role-title">Architecte de performance</h3>
                <p className="sf-role-desc">Créez des programmes ultra-personnalisés, gérez vos membres avec précision chirurgicale et scalez votre business coaching.</p>
                <ul className="sf-role-list">
                  {['Tableau de bord coach complet', 'Gestion multi-membres', 'Plans nutrition & jeûne', 'Conseils lifestyle automatisés', 'Analyses & statistiques'].map(item => (
                    <li key={item}><span className="sf-check">✓</span>{item}</li>
                  ))}
                </ul>
                <button className="sf-btn-primary sf-btn-full" onClick={() => router.push('/register/coach')}>Créer mon espace coach →</button>
              </div>
            </div>
            <div className="sf-role-card">
              <div className="sf-role-img-wrap">
                <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80" alt="Membre" className="sf-role-img" />
                <div className="sf-role-img-ov" />
                <div className="sf-role-badge">✨ Espace Membre</div>
              </div>
              <div className="sf-role-body">
                <h3 className="sf-role-title">L&apos;athlète accompagné</h3>
                <p className="sf-role-desc">Accédez à vos programmes personnalisés, suivez votre nutrition et progressez guidé par votre coach, où que vous soyez.</p>
                <ul className="sf-role-list">
                  {['Programmes assignés par votre coach', 'Plan nutritionnel & macros', 'Protocole de jeûne intermittent', 'Conseils & lifestyle', 'Suivi de progression'].map(item => (
                    <li key={item}><span className="sf-check">✓</span>{item}</li>
                  ))}
                </ul>
                <button className="sf-btn-outline sf-btn-full" onClick={() => router.push('/register/client')}>Rejoindre en tant que membre →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="sf-section sf-section-alt sf-reveal">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Simple par design</div>
            <h2 className="sf-section-title">Comment <span className="sf-accent">ça marche.</span></h2>
            <p className="sf-section-sub">De l&apos;inscription à vos premiers membres en moins de 5 minutes.</p>
          </div>
          <div className="sf-how-grid">
            {HOW_STEPS.map((s, i) => (
              <div key={s.n} className="sf-how-card">
                {i < HOW_STEPS.length - 1 && <div className="sf-how-line" />}
                <div className="sf-how-num">{s.n}</div>
                <h3 className="sf-how-title">{s.title}</h3>
                <p className="sf-how-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="fonctionnalites" className="sf-section sf-reveal">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Fonctionnalités</div>
            <h2 className="sf-section-title">Tout ce qu&apos;il vous faut<br /><span className="sf-accent">en un seul endroit.</span></h2>
            <p className="sf-section-sub">Une suite complète d&apos;outils professionnels pour gérer votre activité coaching de A à Z.</p>
          </div>
          <div className="sf-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="sf-feat-card">
                <div className="sf-feat-icon">{f.icon}</div>
                <h3 className="sf-feat-title">{f.title}</h3>
                <p className="sf-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALCULATOR ── */}
      <section className="sf-section sf-section-alt sf-reveal">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Outil intégré</div>
            <h2 className="sf-section-title">CALCULEZ VOTRE<br /><span className="sf-accent">DÉFICIT CALORIQUE.</span></h2>
            <p className="sf-section-sub">L&apos;outil intégré dans l&apos;espace membre — essayez-le maintenant.</p>
          </div>
          <div className="sf-calc-card">
            <div className="sf-calc-grid">
              <div className="sf-calc-field"><label>Poids (kg)</label><input type="number" value={weight} onChange={e => setWeight(+e.target.value)} min={30} max={200} /></div>
              <div className="sf-calc-field"><label>Taille (cm)</label><input type="number" value={height} onChange={e => setHeight(+e.target.value)} min={130} max={220} /></div>
              <div className="sf-calc-field"><label>Âge</label><input type="number" value={age} onChange={e => setAge(+e.target.value)} min={14} max={90} /></div>
            </div>
            <div className="sf-calc-toggles">
              <div className="sf-calc-toggle-group">
                <div className="sf-calc-toggle-label">Sexe</div>
                <div className="sf-toggle-row">
                  <button className={`sf-toggle-btn${sex === 'H' ? ' active' : ''}`} onClick={() => setSex('H')}>Homme</button>
                  <button className={`sf-toggle-btn${sex === 'F' ? ' active' : ''}`} onClick={() => setSex('F')}>Femme</button>
                </div>
              </div>
              <div className="sf-calc-toggle-group">
                <div className="sf-calc-toggle-label">Activité</div>
                <select className="sf-calc-select" value={activity} onChange={e => setActivity(+e.target.value)}>
                  <option value={1.2}>Sédentaire</option>
                  <option value={1.375}>Légèrement actif</option>
                  <option value={1.55}>Modérément actif</option>
                  <option value={1.725}>Très actif</option>
                  <option value={1.9}>Extrêmement actif</option>
                </select>
              </div>
              <div className="sf-calc-toggle-group">
                <div className="sf-calc-toggle-label">Objectif</div>
                <div className="sf-toggle-row">
                  <button className={`sf-toggle-btn${goal === 'perte' ? ' active' : ''}`} onClick={() => setGoal('perte')}>Perte</button>
                  <button className={`sf-toggle-btn${goal === 'maintien' ? ' active' : ''}`} onClick={() => setGoal('maintien')}>Maintien</button>
                  <button className={`sf-toggle-btn${goal === 'prise' ? ' active' : ''}`} onClick={() => setGoal('prise')}>Prise</button>
                </div>
              </div>
            </div>
            <button className="sf-calc-btn" onClick={() => setCalcResult(calcNutrition(weight, height, age, sex, activity, goal))}>
              CALCULER MON PLAN →
            </button>
            {calcResult && (
              <div className="sf-calc-results">
                <div className="sf-calc-kcal">
                  <div className="sf-calc-kcal-val">{calcResult.kcal}</div>
                  <div className="sf-calc-kcal-unit">kcal / jour</div>
                </div>
                <div className="sf-calc-macros">
                  {[
                    { label: 'Protéines', val: calcResult.prot, unit: 'g', w: 60 },
                    { label: 'Glucides', val: calcResult.carbs, unit: 'g', w: 80 },
                    { label: 'Lipides', val: calcResult.fat, unit: 'g', w: 60 },
                  ].map(m => (
                    <div key={m.label} className="sf-macro-row">
                      <div className="sf-macro-header">
                        <span className="sf-macro-label">{m.label}</span>
                        <span className="sf-macro-val">{m.val}{m.unit}</span>
                      </div>
                      <div className="sf-macro-bar-bg">
                        <div className="sf-macro-bar-fill" style={{ width: `${m.w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sf-calc-fasting">
                  <span className="sf-calc-fasting-label">Protocole jeûne recommandé</span>
                  <span className="sf-calc-fasting-val">{calcResult.fasting}</span>
                </div>
                <button className="sf-btn-primary sf-calc-cta" onClick={() => router.push('/register/coach')}>
                  VOTRE COACH PERSONNALISE CE PLAN →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="sf-section sf-reveal">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Tarifs</div>
            <h2 className="sf-section-title">SIMPLE. TRANSPARENT.<br /><span className="sf-accent">SANS SURPRISE.</span></h2>
            <p className="sf-section-sub">1 mois d&apos;essai gratuit. Annulation à tout moment.</p>
          </div>
          <div className="sf-plans-grid">
            {PLANS.map(p => (
              <div key={p.name} className={`sf-plan-card${p.recommended ? ' sf-plan-recommended' : ''}`}>
                {p.recommended && <div className="sf-plan-badge">RECOMMANDÉ</div>}
                <div className="sf-plan-name">{p.name}</div>
                <div className="sf-plan-price">{p.price}<span className="sf-plan-per">{p.per}</span></div>
                <ul className="sf-plan-features">
                  {p.features.map(f => <li key={f}><span className="sf-check">✓</span>{f}</li>)}
                </ul>
                <button className={p.recommended ? 'sf-btn-primary sf-btn-full' : 'sf-plan-ghost-btn'} onClick={() => router.push(p.ctaAction)}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          <div className="sf-plans-trust">✓ Sans carte bancaire · ✓ Annulation en 1 clic · ✓ Données exportables</div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="sf-section sf-section-alt sf-reveal">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Témoignages</div>
            <h2 className="sf-section-title">Ils ont choisi <span className="sf-accent">SundaraFlow.</span></h2>
          </div>
          <div className="sf-testi-layout">
            {TESTIMONIALS.filter(t => t.featured).map(t => (
              <div key={t.name} className="sf-testi-featured">
                <div className="sf-testi-stat-big">{t.stat}<span>{t.statLabel}</span></div>
                <div className="sf-quote-mark">&ldquo;</div>
                <blockquote className="sf-testi-text">{t.text}</blockquote>
                <div className="sf-testi-author">
                  <img src={t.img} alt={t.name} className="sf-testi-av" />
                  <div><div className="sf-testi-name">{t.name}</div><div className="sf-testi-role">{t.role}</div></div>
                  <div className="sf-quote-stars">{'★'.repeat(t.stars)}</div>
                </div>
              </div>
            ))}
            <div className="sf-testi-grid">
              {TESTIMONIALS.filter(t => !t.featured).map(t => (
                <div key={t.name} className="sf-testi-card">
                  <div className="sf-testi-card-stat">{t.stat}</div>
                  <blockquote className="sf-testi-card-text">{t.text}</blockquote>
                  <div className="sf-testi-author">
                    <img src={t.img} alt={t.name} className="sf-testi-av" />
                    <div><div className="sf-testi-name">{t.name}</div><div className="sf-testi-role">{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="sf-section sf-reveal">
        <div className="sf-container sf-container-sm">
          <div className="sf-section-header">
            <div className="sf-tag">FAQ</div>
            <h2 className="sf-section-title">Questions <span className="sf-accent">fréquentes.</span></h2>
          </div>
          <div className="sf-faq-list">
            {FAQS.map((item, i) => (
              <div key={i} className={`sf-faq-item${openFaq === i ? ' sf-faq-open' : ''}`}>
                <button className="sf-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className="sf-faq-icon">{openFaq === i ? '−' : '+'}</span>
                </button>
                <div style={{ maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}>
                  <div className="sf-faq-a">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="sf-cta-section">
        <div className="sf-cta-bg-img">
          <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=80" alt="" />
          <div className="sf-cta-ov" />
        </div>
        <div className="sf-container sf-cta-content">
          <div className="sf-tag">Prêt à franchir le cap ?</div>
          <h2 className="sf-cta-title">Votre prochain niveau<br /><span className="sf-accent">commence maintenant.</span></h2>
          <p className="sf-cta-sub">Rejoignez 47+ coachs d&apos;élite et 312+ membres qui ont choisi SundaraFlow pour atteindre leurs objectifs.</p>
          <div className="sf-cta-btns">
            <button className="sf-btn-primary sf-btn-lg" onClick={() => router.push('/register/coach')}>Créer mon espace coach →</button>
            <button className="sf-btn-ghost sf-btn-lg" onClick={() => router.push('/login')}>Déjà inscrit ? Connexion</button>
          </div>
          <div className="sf-trust-row">
            {['🔒 SSL sécurisé', '⚡ Accès instantané', '✓ Firebase Auth', '0€ Pour démarrer'].map(t => (
              <span key={t} className="sf-trust-badge">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="sf-footer">
        <div className="sf-container">
          <div className="sf-footer-inner">
            <div className="sf-footer-brand">
              <div className="sf-logo" onClick={() => router.push('/')}>Sundara<span>Flow</span></div>
              <p className="sf-footer-tagline">La plateforme des coachs d&apos;élite.</p>
            </div>
            <div className="sf-footer-links-col">
              <div className="sf-footer-col-title">Plateforme</div>
              <button onClick={() => router.push('/register/coach')}>Espace Coach</button>
              <button onClick={() => router.push('/register/client')}>Espace Membre</button>
              <button onClick={() => router.push('/login')}>Connexion</button>
            </div>
            <div className="sf-footer-links-col">
              <div className="sf-footer-col-title">À venir</div>
              <span>Application mobile</span>
              <span>Intégration Stripe</span>
              <span>Exports PDF</span>
            </div>
          </div>
          <div className="sf-footer-bottom">
            <span>© 2026 SundaraFlow. Tous droits réservés.</span>
            <span>Conçu pour les coachs d&apos;élite.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        button, a {
          -webkit-appearance: none;
          appearance: none;
          user-select: none;
          -webkit-user-select: none;
        }

        input, select, textarea {
          font-size: 16px !important;
        }

        .sf-root {
          background: #121212;
          color: #FFFFFF;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
        }

        /* ── NAV ── */
        .sf-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          max-width: 100vw;
          overflow: hidden;
          z-index: 200;
          background: rgba(18,18,18,.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .sf-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 24px;
          width: 100%;
        }

        .sf-logo {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          letter-spacing: .04em;
          cursor: pointer;
          text-transform: uppercase;
          color: #FFFFFF;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .sf-logo span { color: #9E1B1B; }

        .sf-nav-links {
          display: flex;
          gap: 24px;
          flex: 1;
          justify-content: center;
          overflow: hidden;
        }
        .sf-nav-links a {
          font-size: .78rem;
          font-weight: 500;
          color: rgba(255,255,255,.6);
          letter-spacing: .06em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color .2s;
          white-space: nowrap;
        }
        .sf-nav-links a:hover { color: #FFFFFF; }

        .sf-nav-ctas {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          flex-shrink: 0;
        }

        .sf-burger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          margin-left: auto;
          flex-shrink: 0;
        }
        .sf-burger span {
          display: block;
          width: 22px;
          height: 2px;
          background: rgba(255,255,255,.7);
          border-radius: 2px;
        }

        /* Menu mobile — dropdown vers le bas, JAMAIS de débordement */
        .sf-mobile-menu {
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          width: 100%;
          max-width: 100vw;
          overflow: hidden;
          background: #0e0e0e;
          border-top: 1px solid rgba(255,255,255,.06);
          border-bottom: 1px solid rgba(255,255,255,.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px 20px 20px;
          z-index: 300;
          box-sizing: border-box;
        }

        .sf-mobile-menu a {
          font-size: .82rem;
          color: rgba(255,255,255,.7);
          text-decoration: none;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,.04);
          display: block;
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sf-mobile-menu-divider {
          height: 1px;
          background: rgba(255,255,255,.06);
          margin: 8px 0;
          width: 100%;
        }

        .sf-mobile-btn {
          width: 100% !important;
          margin-top: 6px;
          justify-content: center;
          white-space: nowrap;
        }

        /* ── BUTTONS ── */
        .sf-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 11px 24px;
          background: linear-gradient(135deg, #9E1B1B, #7a1212);
          border: none;
          border-radius: 9999px;
          color: #FFFFFF;
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: .75rem;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: box-shadow .25s, transform .15s;
          white-space: nowrap;
        }
        .sf-btn-primary:hover { box-shadow: 0 0 36px rgba(158,27,27,.45); transform: translateY(-1px); }

        .sf-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 22px;
          background: transparent;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 9999px;
          color: rgba(255,255,255,.75);
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .75rem;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color .2s, color .2s;
          white-space: nowrap;
        }
        .sf-btn-ghost:hover { border-color: rgba(255,255,255,.4); color: #FFFFFF; }

        .sf-btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 24px;
          background: transparent;
          border: 1px solid rgba(158,27,27,.4);
          border-radius: 9999px;
          color: #f87171;
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: .75rem;
          letter-spacing: .1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color .2s, box-shadow .2s;
          white-space: nowrap;
        }
        .sf-btn-outline:hover { border-color: #9E1B1B; box-shadow: 0 0 20px rgba(158,27,27,.2); }

        .sf-btn-lg { padding: 15px 32px; font-size: .8rem; }
        .sf-btn-full { width: 100%; margin-top: 24px; }

        /* ── HERO ── */
        .sf-hero {
          position: relative;
          height: 100vh;
          min-height: 680px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .sf-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 40%; }
        .sf-hero-ov-base { position: absolute; inset: 0; background: rgba(10,10,10,.72); z-index: 1; }
        .sf-hero-ov-crimson { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 20% 60%, rgba(158,27,27,.28) 0%, transparent 70%); z-index: 2; }
        .sf-hero-ov-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to top, #121212 0%, transparent 100%); z-index: 3; }
        .sf-hero-content { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; padding: 80px 24px 0; width: 100%; }

        .sf-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(158,27,27,.16);
          border: 1px solid rgba(158,27,27,.3);
          border-radius: 9999px;
          padding: 6px 16px;
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .65rem;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #f87171;
          margin-bottom: 24px;
        }

        .sf-hero-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: clamp(2.2rem, 7vw, 6rem);
          line-height: .96;
          letter-spacing: -.04em;
          color: #FFFFFF;
          margin-bottom: 22px;
        }
        .sf-accent { color: #9E1B1B; }

        .sf-hero-sub {
          font-size: clamp(.85rem, 1.6vw, 1.1rem);
          color: rgba(255,255,255,.65);
          line-height: 1.8;
          max-width: 520px;
          margin-bottom: 32px;
        }

        .sf-hero-btns {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .sf-hero-badge {
          display: inline-flex;
          align-items: center;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9999px;
          padding: 7px 16px;
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .62rem;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(255,255,255,.7);
          margin-bottom: 14px;
          white-space: nowrap;
        }

        .sf-hero-note { font-size: .68rem; color: rgba(255,255,255,.35); letter-spacing: .06em; }

        .sf-scroll-hint { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 10; }
        .sf-scroll-dot { width: 1px; height: 48px; background: linear-gradient(to bottom, rgba(255,255,255,.5), transparent); animation: scrollPulse 2s ease infinite; }
        @keyframes scrollPulse { 0%,100% { opacity: .3; } 50% { opacity: 1; } }

        /* FADE-UP */
        .sf-fu { opacity: 0; transform: translateY(28px); animation: fuAnim .7s ease forwards; }
        .sf-fu-1 { animation-delay: .1s; }
        .sf-fu-2 { animation-delay: .25s; }
        .sf-fu-3 { animation-delay: .4s; }
        .sf-fu-4 { animation-delay: .55s; }
        .sf-fu-5 { animation-delay: .7s; }
        @keyframes fuAnim { to { opacity: 1; transform: translateY(0); } }

        .sf-reveal { opacity: 0; transform: translateY(30px); transition: opacity .65s ease, transform .65s ease; }
        .sf-revealed { opacity: 1; transform: translateY(0); }

        /* ── STATS ── */
        .sf-stats { background: #1a1a1a; border-top: 1px solid rgba(255,255,255,.06); border-bottom: 1px solid rgba(255,255,255,.06); overflow: hidden; }
        .sf-stats-inner { max-width: 1200px; margin: 0 auto; padding: 36px 24px; display: grid; grid-template-columns: repeat(4, 1fr); }
        .sf-stat-item { text-align: center; padding: 12px 16px; border-right: 1px solid rgba(255,255,255,.06); }
        .sf-stat-item:last-child { border-right: none; }
        .sf-stat-val { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.6rem, 3vw, 2.8rem); letter-spacing: -.04em; color: #9E1B1B; line-height: 1; margin-bottom: 6px; }
        .sf-stat-label { font-size: .62rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.45); }

        /* ── LAYOUT ── */
        .sf-section { padding: clamp(60px, 10vw, 120px) 0; overflow: hidden; }
        .sf-section-alt { background: #1a1a1a; }
        .sf-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; width: 100%; }
        .sf-container-sm { max-width: 760px; }
        .sf-section-header { text-align: center; margin-bottom: 56px; }
        .sf-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(158,27,27,.12); border: 1px solid rgba(158,27,27,.25); border-radius: 9999px; padding: 5px 16px; font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .62rem; letter-spacing: .16em; text-transform: uppercase; color: #f87171; margin-bottom: 20px; }
        .sf-section-title { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.8rem, 4vw, 3.2rem); letter-spacing: -.04em; line-height: .96; color: #FFFFFF; margin-bottom: 16px; }
        .sf-section-sub { font-size: .92rem; color: rgba(255,255,255,.55); line-height: 1.8; max-width: 520px; margin: 0 auto; }

        /* ── ROLES ── */
        .sf-roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .sf-role-card { background: #1e1e1e; border: 1px solid rgba(255,255,255,.06); border-radius: 16px; overflow: hidden; transition: transform .3s, border-color .3s; }
        .sf-role-card:hover { transform: translateY(-4px); border-color: rgba(158,27,27,.25); }
        .sf-role-img-wrap { position: relative; height: 240px; overflow: hidden; }
        .sf-role-img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; }
        .sf-role-card:hover .sf-role-img { transform: scale(1.04); }
        .sf-role-img-ov { position: absolute; inset: 0; background: linear-gradient(to top, rgba(14,14,14,.95) 0%, rgba(14,14,14,.4) 50%, transparent 100%); }
        .sf-role-badge { position: absolute; bottom: 18px; left: 20px; background: rgba(158,27,27,.22); border: 1px solid rgba(158,27,27,.4); border-radius: 9999px; padding: 5px 14px; font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .65rem; letter-spacing: .12em; text-transform: uppercase; color: #f87171; }
        .sf-role-body { padding: 24px; }
        .sf-role-title { font-family: 'Lexend', sans-serif; font-weight: 800; font-size: 1.2rem; letter-spacing: -.02em; color: #FFFFFF; margin-bottom: 10px; }
        .sf-role-desc { font-size: .83rem; color: rgba(255,255,255,.6); line-height: 1.75; margin-bottom: 18px; }
        .sf-role-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
        .sf-role-list li { display: flex; align-items: center; gap: 10px; font-size: .81rem; color: rgba(255,255,255,.72); }
        .sf-check { color: #9E1B1B; font-weight: 700; flex-shrink: 0; }

        /* ── HOW IT WORKS ── */
        .sf-how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; position: relative; }
        .sf-how-card { background: #121212; border: 1px solid rgba(255,255,255,.06); border-radius: 16px; padding: 32px 24px; position: relative; }
        .sf-how-line { position: absolute; top: 54px; right: -17%; width: 34%; height: 0; border-top: 2px dashed rgba(178,42,39,.4); z-index: 1; }
        .sf-how-num { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(2.4rem, 4vw, 3.6rem); letter-spacing: -.06em; color: #b22a27; line-height: 1; margin-bottom: 14px; }
        .sf-how-title { font-family: 'Lexend', sans-serif; font-weight: 800; font-size: 1rem; color: #FFFFFF; margin-bottom: 10px; }
        .sf-how-desc { font-size: .82rem; color: rgba(255,255,255,.55); line-height: 1.75; }

        /* ── FEATURES ── */
        .sf-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .sf-feat-card { background: #121212; border: 1px solid rgba(255,255,255,.06); border-radius: 14px; padding: 26px 22px; transition: border-color .3s, transform .3s, box-shadow .3s; }
        .sf-feat-card:hover { border-color: #b22a27; transform: scale(1.02); box-shadow: 0 0 24px rgba(178,42,39,.15); }
        .sf-feat-icon { font-size: 1.7rem; margin-bottom: 14px; display: block; }
        .sf-feat-title { font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .95rem; color: #FFFFFF; margin-bottom: 10px; }
        .sf-feat-desc { font-size: .8rem; color: rgba(255,255,255,.55); line-height: 1.75; }

        /* ── CALCULATOR ── */
        .sf-calc-card { background: #1c1b1b; border-radius: 20px; padding: clamp(24px, 5vw, 44px); max-width: 680px; margin: 0 auto; width: 100%; }
        .sf-calc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .sf-calc-field label { display: block; font-size: .63rem; font-family: 'Lexend', sans-serif; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 8px; }
        .sf-calc-field input { width: 100%; background: #121212; border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 12px 14px; color: #FFFFFF; font-family: 'Inter', sans-serif; font-size: 16px; outline: none; transition: border-color .2s; }
        .sf-calc-field input:focus { border-color: rgba(178,42,39,.5); }
        .sf-calc-toggles { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 22px; }
        .sf-calc-toggle-group { display: flex; flex-direction: column; gap: 8px; }
        .sf-calc-toggle-label { font-size: .62rem; font-family: 'Lexend', sans-serif; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.45); }
        .sf-toggle-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .sf-toggle-btn { padding: 8px 14px; background: #121212; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: rgba(255,255,255,.55); font-family: 'Lexend', sans-serif; font-size: .68rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; transition: all .2s; white-space: nowrap; }
        .sf-toggle-btn.active { background: #b22a27; border-color: #b22a27; color: #FFFFFF; }
        .sf-calc-select { background: #121212; border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 8px 14px; color: rgba(255,255,255,.7); font-family: 'Inter', sans-serif; font-size: 16px; outline: none; cursor: pointer; max-width: 100%; }
        .sf-calc-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #89070e, #b22a27); border: none; border-radius: 10px; color: #FFFFFF; font-family: 'Lexend', sans-serif; font-weight: 800; font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; transition: transform .2s, box-shadow .2s; margin-bottom: 24px; }
        .sf-calc-btn:hover { transform: scale(1.02); box-shadow: 0 0 28px rgba(178,42,39,.35); }
        .sf-calc-results { animation: fadeIn .4s ease; border-top: 1px solid rgba(255,255,255,.06); padding-top: 28px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .sf-calc-kcal { text-align: center; margin-bottom: 28px; }
        .sf-calc-kcal-val { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(2.8rem, 8vw, 5rem); color: #b22a27; letter-spacing: -.06em; line-height: 1; }
        .sf-calc-kcal-unit { font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.4); margin-top: 4px; }
        .sf-calc-macros { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
        .sf-macro-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .sf-macro-label { font-size: .72rem; font-family: 'Lexend', sans-serif; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.6); }
        .sf-macro-val { font-size: .72rem; font-family: 'Lexend', sans-serif; font-weight: 700; color: #b22a27; }
        .sf-macro-bar-bg { height: 5px; background: rgba(255,255,255,.06); border-radius: 9999px; overflow: hidden; }
        .sf-macro-bar-fill { height: 100%; border-radius: 9999px; background: linear-gradient(to right, #89070e, #b22a27); animation: growBar .8s ease forwards; }
        @keyframes growBar { from { width: 0 !important; } }
        .sf-calc-fasting { display: flex; justify-content: space-between; align-items: center; background: rgba(178,42,39,.08); border: 1px solid rgba(178,42,39,.18); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; flex-wrap: wrap; gap: 8px; }
        .sf-calc-fasting-label { font-size: .72rem; font-family: 'Lexend', sans-serif; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.5); }
        .sf-calc-fasting-val { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: 1.4rem; color: #b22a27; }
        .sf-calc-cta { width: 100%; padding: 14px; border-radius: 10px; font-size: .7rem; }

        /* ── PRICING ── */
        .sf-plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; align-items: start; margin-bottom: 24px; }
        .sf-plan-card { background: #1c1b1b; border: 1px solid rgba(255,255,255,.07); border-radius: 16px; padding: 28px 24px; position: relative; transition: transform .3s, box-shadow .3s; }
        .sf-plan-card:hover { transform: scale(1.03); box-shadow: 0 0 32px rgba(178,42,39,.2); }
        .sf-plan-recommended { border-color: rgba(178,42,39,.4); background: linear-gradient(135deg, rgba(178,42,39,.08), #1c1b1b); transform: scale(1.04); }
        .sf-plan-recommended:hover { transform: scale(1.07); }
        .sf-plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #b22a27; color: #FFFFFF; font-family: 'Lexend', sans-serif; font-weight: 800; font-size: .58rem; letter-spacing: .16em; text-transform: uppercase; padding: 4px 14px; border-radius: 9999px; white-space: nowrap; }
        .sf-plan-name { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: .62rem; letter-spacing: .2em; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 12px; }
        .sf-plan-price { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.8rem, 3vw, 2.6rem); color: #FFFFFF; letter-spacing: -.04em; line-height: 1; margin-bottom: 20px; }
        .sf-plan-per { font-size: .82rem; font-weight: 400; color: rgba(255,255,255,.4); }
        .sf-plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .sf-plan-features li { display: flex; align-items: center; gap: 10px; font-size: .8rem; color: rgba(255,255,255,.7); }
        .sf-plan-ghost-btn { width: 100%; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,.1); border-radius: 9999px; color: rgba(255,255,255,.6); font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: border-color .2s, color .2s; white-space: nowrap; }
        .sf-plan-ghost-btn:hover { border-color: rgba(255,255,255,.35); color: #FFFFFF; }
        .sf-plans-trust { text-align: center; font-size: .72rem; color: rgba(255,255,255,.35); letter-spacing: .06em; }

        /* ── TESTIMONIALS ── */
        .sf-testi-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        .sf-testi-featured { background: linear-gradient(135deg, rgba(158,27,27,.1), rgba(158,27,27,.03)); border: 1px solid rgba(158,27,27,.2); border-radius: 20px; padding: clamp(24px, 4vw, 40px); position: relative; overflow: hidden; }
        .sf-testi-stat-big { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.8rem, 4vw, 3rem); color: #b22a27; letter-spacing: -.04em; margin-bottom: 12px; line-height: 1; }
        .sf-testi-stat-big span { font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.45); display: block; margin-top: 4px; }
        .sf-quote-mark { font-family: 'Lexend', sans-serif; font-size: 7rem; font-weight: 900; color: rgba(158,27,27,.12); line-height: 1; position: absolute; top: -10px; left: 24px; pointer-events: none; }
        .sf-testi-text { font-family: 'Lexend', sans-serif; font-weight: 300; font-size: clamp(.88rem, 1.6vw, 1.2rem); line-height: 1.6; color: rgba(255,255,255,.88); font-style: italic; margin-bottom: 24px; position: relative; }
        .sf-testi-author { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .sf-testi-av { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(158,27,27,.3); flex-shrink: 0; }
        .sf-testi-name { font-weight: 600; font-size: .86rem; color: #FFFFFF; }
        .sf-testi-role { font-size: .68rem; color: rgba(255,255,255,.45); margin-top: 2px; }
        .sf-quote-stars { margin-left: auto; color: #9E1B1B; font-size: .95rem; letter-spacing: 2px; }
        .sf-testi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sf-testi-card { background: #1e1e1e; border: 1px solid rgba(255,255,255,.06); border-radius: 14px; padding: 20px; transition: border-color .2s; }
        .sf-testi-card:hover { border-color: rgba(178,42,39,.25); }
        .sf-testi-card-stat { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: 1.5rem; color: #b22a27; letter-spacing: -.04em; margin-bottom: 10px; }
        .sf-testi-card-text { font-size: .78rem; color: rgba(255,255,255,.6); line-height: 1.7; font-style: italic; margin-bottom: 14px; }

        /* ── FAQ ── */
        .sf-faq-list { display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
        .sf-faq-item { border-bottom: 1px solid rgba(255,255,255,.07); background: #1a1a1a; transition: background .2s; }
        .sf-faq-item:last-child { border-bottom: none; }
        .sf-faq-open { background: #1e1e1e; }
        .sf-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; background: transparent; border: none; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif; font-size: .86rem; font-weight: 500; color: #FFFFFF; line-height: 1.5; transition: color .2s; }
        .sf-faq-open .sf-faq-q { color: #f87171; }
        .sf-faq-icon { font-size: 1.2rem; color: #9E1B1B; flex-shrink: 0; line-height: 1; font-weight: 300; }
        .sf-faq-a { padding: 0 22px 18px; font-size: .82rem; color: rgba(255,255,255,.6); line-height: 1.8; }

        /* ── CTA ── */
        .sf-cta-section { position: relative; padding: clamp(72px, 12vw, 140px) 0; overflow: hidden; }
        .sf-cta-bg-img { position: absolute; inset: 0; z-index: 0; }
        .sf-cta-bg-img img { width: 100%; height: 100%; object-fit: cover; }
        .sf-cta-ov { position: absolute; inset: 0; background: rgba(10,10,10,.82); }
        .sf-cta-content { position: relative; z-index: 1; text-align: center; }
        .sf-cta-title { font-family: 'Lexend', sans-serif; font-weight: 900; font-size: clamp(1.8rem, 5vw, 3.8rem); letter-spacing: -.04em; line-height: .96; color: #FFFFFF; margin-bottom: 18px; }
        .sf-cta-sub { font-size: .92rem; color: rgba(255,255,255,.6); line-height: 1.8; max-width: 480px; margin: 0 auto 32px; }
        .sf-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px; }
        .sf-trust-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .sf-trust-badge { font-size: .65rem; color: rgba(255,255,255,.38); letter-spacing: .06em; white-space: nowrap; }

        /* ── FOOTER ── */
        .sf-footer { background: #0e0e0e; border-top: 1px solid rgba(255,255,255,.05); padding: 48px 0 28px; overflow: hidden; }
        .sf-footer-inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 36px; margin-bottom: 40px; }
        .sf-footer-brand .sf-logo { margin-bottom: 10px; }
        .sf-footer-tagline { font-size: .78rem; color: rgba(255,255,255,.35); }
        .sf-footer-links-col { display: flex; flex-direction: column; gap: 10px; }
        .sf-footer-col-title { font-family: 'Lexend', sans-serif; font-weight: 700; font-size: .62rem; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 4px; }
        .sf-footer-links-col button, .sf-footer-links-col span { background: transparent; border: none; font-family: 'Inter', sans-serif; font-size: .8rem; color: rgba(255,255,255,.5); cursor: pointer; text-align: left; padding: 0; transition: color .2s; }
        .sf-footer-links-col button:hover { color: rgba(255,255,255,.85); }
        .sf-footer-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.05); font-size: .68rem; color: rgba(255,255,255,.25); letter-spacing: .04em; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .sf-nav-links, .sf-nav-ctas { display: none; }
          .sf-burger { display: flex; }
          .sf-stats-inner { grid-template-columns: 1fr 1fr; }
          .sf-stat-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,.06); }
          .sf-roles-grid, .sf-how-grid, .sf-testi-layout { grid-template-columns: 1fr; }
          .sf-features-grid, .sf-plans-grid { grid-template-columns: 1fr 1fr; }
          .sf-testi-grid { grid-template-columns: 1fr 1fr; }
          .sf-footer-inner { grid-template-columns: 1fr 1fr; }
          .sf-how-line { display: none; }
          .sf-plan-recommended { transform: scale(1); }
          .sf-calc-grid { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 600px) {
          .sf-hero-content { padding: 80px 16px 0; }
          .sf-hero-title { font-size: clamp(1.7rem, 7vw, 2.4rem) !important; }
          .sf-hero-btns { flex-direction: column; width: 100%; }
          .sf-btn-lg { width: 100%; padding: 14px 20px; font-size: .78rem; }
          .sf-hero-badge { font-size: .6rem; padding: 6px 12px; white-space: normal; text-align: center; }
          .sf-cta-btns { flex-direction: column; align-items: stretch; padding: 0 16px; }
          .sf-features-grid, .sf-plans-grid, .sf-testi-grid, .sf-calc-grid { grid-template-columns: 1fr; }
          .sf-footer-inner { grid-template-columns: 1fr; }
          .sf-stats-inner { grid-template-columns: 1fr 1fr; }
          .sf-calc-toggles { flex-direction: column; }
          .sf-container { padding: 0 16px; }
          .sf-section { padding: clamp(48px, 8vw, 80px) 0; }
          .sf-section-header { margin-bottom: 36px; }
          .sf-plan-recommended { transform: scale(1); }
          .sf-testi-layout { grid-template-columns: 1fr; }
          .sf-testi-grid { grid-template-columns: 1fr; }
          .sf-roles-grid { grid-template-columns: 1fr; }
          .sf-how-grid { grid-template-columns: 1fr; }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #121212; }
        ::-webkit-scrollbar-thumb { background: #9E1B1B; border-radius: 10px; }
      `}</style>
    </div>
  );
}