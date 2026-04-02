'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/* ── Data ── */
const FEATURES = [
  { icon: '📋', title: 'Programmes sur-mesure', desc: 'Créez des programmes sport, nutrition et mindset personnalisés pour chacun de vos membres. Assignation en un clic.' },
  { icon: '🥗', title: 'Plans nutritionnels', desc: 'Définissez les macros, l\'objectif calorique, le déficit et le protocole de jeûne intermittent de chaque membre.' },
  { icon: '📊', title: 'Suivi en temps réel', desc: 'Tableaux de bord dynamiques pour visualiser la progression de chaque membre semaine après semaine.' },
  { icon: '💡', title: 'Conseils & Lifestyle', desc: 'Publiez des conseils nutrition, entraînement et mindset visibles instantanément par tous vos membres.' },
  { icon: '⏱️', title: 'Jeûne intermittent', desc: 'Assignez des protocoles 14/10, 16/8, 18/6 ou 20/4 avec fenêtre alimentaire personnalisée et suivi live.' },
  { icon: '🔒', title: 'Espace sécurisé', desc: 'Authentification Firebase, accès séparé coach/membre, données chiffrées et connexion SSL certifiée.' },
];

const STATS = [
  { val: '500+', label: 'Coachs actifs' },
  { val: '12 000+', label: 'Membres inscrits' },
  { val: '98%', label: 'Taux de satisfaction' },
  { val: '0€', label: 'Pour commencer' },
];

const FAQS = [
  { q: 'Comment fonctionne SundaraFlow pour un coach ?', a: 'Créez votre compte coach, ajoutez vos membres par email, créez des programmes personnalisés et assignez-les en un clic. Gérez nutrition, conseils et suivi depuis votre tableau de bord.' },
  { q: 'Un membre peut-il voir les données des autres ?', a: 'Non. Chaque membre accède uniquement à son propre espace. Les données sont strictement isolées par compte.' },
  { q: 'L\'application est-elle gratuite ?', a: 'L\'accès est gratuit pour démarrer. Des fonctionnalités avancées (Stripe, exports PDF, vidéos) seront disponibles prochainement.' },
  { q: 'Puis-je gérer plusieurs membres simultanément ?', a: 'Oui. Votre tableau de bord vous permet de gérer jusqu\'à 50 membres, avec navigation rapide entre les profils.' },
];

export default function LandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="sf-root">

      {/* ══════════════════════════════════════════
          NAV
      ══════════════════════════════════════════ */}
      <nav className="sf-nav">
        <div className="sf-nav-inner">
          <div className="sf-logo" onClick={() => router.push('/')}>
            Sundara<span>Flow</span>
          </div>

          {/* Desktop links */}
          <div className="sf-nav-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#roles">Coaches & Membres</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="sf-nav-ctas">
            <button className="sf-btn-ghost" onClick={() => router.push('/login')}>
              Connexion
            </button>
            <button className="sf-btn-primary" onClick={() => router.push('/register/coach')}>
              Commencer
            </button>
          </div>

          {/* Mobile burger */}
          <button className="sf-burger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sf-mobile-menu">
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
            <a href="#roles" onClick={() => setMenuOpen(false)}>Coaches & Membres</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <button className="sf-btn-ghost" onClick={() => { router.push('/login'); setMenuOpen(false); }}>Connexion</button>
            <button className="sf-btn-primary" onClick={() => { router.push('/register/coach'); setMenuOpen(false); }}>Commencer gratuitement</button>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="sf-hero">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80"
          alt="Salle de sport premium"
          className="sf-hero-img"
        />
        {/* Overlays */}
        <div className="sf-hero-ov-base" />
        <div className="sf-hero-ov-crimson" />
        <div className="sf-hero-ov-bottom" />

        {/* Content */}
        <div className="sf-hero-content">
          <div className="sf-eyebrow">⚡ Plateforme de coaching d'élite</div>
          <h1 className="sf-hero-title">
            Le système que<br />
            les coachs<br />
            <span className="sf-accent">d'élite utilisent.</span>
          </h1>
          <p className="sf-hero-sub">
            Gérez vos membres, créez des programmes sur-mesure, suivez la nutrition et la progression — dans une interface premium conçue pour les coachs ambitieux.
          </p>
          <div className="sf-hero-btns">
            <button className="sf-btn-primary sf-btn-lg" onClick={() => router.push('/register/coach')}>
              Créer mon espace coach →
            </button>
            <button className="sf-btn-ghost sf-btn-lg" onClick={() => router.push('/register/client')}>
              Je suis membre
            </button>
          </div>
          <p className="sf-hero-note">Gratuit pour démarrer · Sans carte bancaire · Accès instantané</p>
        </div>

        {/* Scroll indicator */}
        <div className="sf-scroll-hint">
          <div className="sf-scroll-dot" />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════ */}
      <section className="sf-stats">
        <div className="sf-stats-inner">
          {STATS.map((s, i) => (
            <div key={i} className="sf-stat-item">
              <div className="sf-stat-val">{s.val}</div>
              <div className="sf-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ROLES  (Coach / Membre)
      ══════════════════════════════════════════ */}
      <section id="roles" className="sf-section">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Deux espaces distincts</div>
            <h2 className="sf-section-title">
              Conçu pour <span className="sf-accent">chaque rôle.</span>
            </h2>
            <p className="sf-section-sub">
              Un espace dédié au coach, un espace dédié au membre. Chacun accède uniquement à ce qui le concerne.
            </p>
          </div>

          <div className="sf-roles-grid">
            {/* Coach card */}
            <div className="sf-role-card">
              <div className="sf-role-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80"
                  alt="Coach professionnel"
                  className="sf-role-img"
                />
                <div className="sf-role-img-ov" />
                <div className="sf-role-badge">🏆 Espace Coach</div>
              </div>
              <div className="sf-role-body">
                <h3 className="sf-role-title">Architecte de performance</h3>
                <p className="sf-role-desc">
                  Créez des programmes ultra-personnalisés, gérez vos membres avec précision chirurgicale et scalez votre business coaching.
                </p>
                <ul className="sf-role-list">
                  {['Tableau de bord coach complet', 'Gestion multi-membres', 'Plans nutrition & jeûne', 'Conseils lifestyle automatisés', 'Analyses & statistiques'].map(item => (
                    <li key={item}><span className="sf-check">✓</span>{item}</li>
                  ))}
                </ul>
                <button className="sf-btn-primary sf-btn-full" onClick={() => router.push('/register/coach')}>
                  Créer mon espace coach →
                </button>
              </div>
            </div>

            {/* Membre card */}
            <div className="sf-role-card">
              <div className="sf-role-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80"
                  alt="Athlète en entraînement"
                  className="sf-role-img"
                />
                <div className="sf-role-img-ov" />
                <div className="sf-role-badge">✨ Espace Membre</div>
              </div>
              <div className="sf-role-body">
                <h3 className="sf-role-title">L'athlète accompagné</h3>
                <p className="sf-role-desc">
                  Accédez à vos programmes personnalisés, suivez votre nutrition et progressez guidé par votre coach, où que vous soyez.
                </p>
                <ul className="sf-role-list">
                  {['Programmes assignés par votre coach', 'Plan nutritionnel & macros', 'Protocole de jeûne intermittent', 'Conseils & lifestyle', 'Suivi de progression'].map(item => (
                    <li key={item}><span className="sf-check">✓</span>{item}</li>
                  ))}
                </ul>
                <button className="sf-btn-outline sf-btn-full" onClick={() => router.push('/register/client')}>
                  Rejoindre en tant que membre →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section id="fonctionnalites" className="sf-section sf-section-alt">
        <div className="sf-container">
          <div className="sf-section-header">
            <div className="sf-tag">Fonctionnalités</div>
            <h2 className="sf-section-title">
              Tout ce qu'il vous faut<br />
              <span className="sf-accent">en un seul endroit.</span>
            </h2>
            <p className="sf-section-sub">
              Une suite complète d'outils professionnels pour gérer votre activité coaching de A à Z.
            </p>
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

      {/* ══════════════════════════════════════════
          SOCIAL PROOF / QUOTE
      ══════════════════════════════════════════ */}
      <section className="sf-quote-section">
        <div className="sf-container">
          <div className="sf-quote-card">
            <div className="sf-quote-mark">"</div>
            <blockquote className="sf-quote-text">
              SundaraFlow a transformé ma façon de coacher. En 3 mois, j'ai doublé mon nombre de membres actifs et réduit mon temps administratif de 70%. C'est l'outil que j'attendais.
            </blockquote>
            <div className="sf-quote-author">
              <div className="sf-quote-av">TM</div>
              <div>
                <div className="sf-quote-name">Thomas M.</div>
                <div className="sf-quote-role">Coach performance · 34 membres actifs</div>
              </div>
              <div className="sf-quote-stars">★★★★★</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section id="faq" className="sf-section">
        <div className="sf-container sf-container-sm">
          <div className="sf-section-header">
            <div className="sf-tag">FAQ</div>
            <h2 className="sf-section-title">
              Questions <span className="sf-accent">fréquentes.</span>
            </h2>
          </div>

          <div className="sf-faq-list">
            {FAQS.map((item, i) => (
              <div key={i} className={`sf-faq-item${openFaq === i ? ' sf-faq-open' : ''}`}>
                <button className="sf-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className="sf-faq-icon">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="sf-faq-a">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════ */}
      <section className="sf-cta-section">
        <div className="sf-cta-bg-img">
          <img
            src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1920&q=80"
            alt="Entraînement intensif"
          />
          <div className="sf-cta-ov" />
        </div>
        <div className="sf-container sf-cta-content">
          <div className="sf-tag">Prêt à franchir le cap ?</div>
          <h2 className="sf-cta-title">
            Votre prochain niveau<br />
            <span className="sf-accent">commence maintenant.</span>
          </h2>
          <p className="sf-cta-sub">
            Rejoignez 500+ coachs d'élite et 12 000+ membres qui ont choisi SundaraFlow pour atteindre leurs objectifs.
          </p>
          <div className="sf-cta-btns">
            <button className="sf-btn-primary sf-btn-lg" onClick={() => router.push('/register/coach')}>
              Créer mon espace coach →
            </button>
            <button className="sf-btn-ghost sf-btn-lg" onClick={() => router.push('/login')}>
              Déjà inscrit ? Connexion
            </button>
          </div>
          <div className="sf-trust-row">
            {['🔒 SSL sécurisé', '⚡ Accès instantané', '✓ Firebase Auth', '0€ Pour démarrer'].map(t => (
              <span key={t} className="sf-trust-badge">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="sf-footer">
        <div className="sf-container">
          <div className="sf-footer-inner">
            <div className="sf-footer-brand">
              <div className="sf-logo">Sundara<span>Flow</span></div>
              <p className="sf-footer-tagline">La plateforme des coachs d'élite.</p>
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
            <span>Conçu pour les coachs d'élite.</span>
          </div>
        </div>
      </footer>

      {/* ══ STYLES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sf-root {
          background: #121212;
          color: #FFFFFF;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
        }

        /* ── NAV ── */
        .sf-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 200;
          background: rgba(18,18,18,.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .sf-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 28px;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .sf-logo {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: 1.15rem;
          letter-spacing: .04em;
          cursor: pointer;
          text-transform: uppercase;
          color: #FFFFFF;
          flex-shrink: 0;
        }
        .sf-logo span { color: #9E1B1B; }
        .sf-nav-links {
          display: flex;
          gap: 28px;
          flex: 1;
          justify-content: center;
        }
        .sf-nav-links a {
          font-size: .78rem;
          font-weight: 500;
          color: rgba(255,255,255,.6);
          letter-spacing: .06em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color .2s;
        }
        .sf-nav-links a:hover { color: #FFFFFF; }
        .sf-nav-ctas { display: flex; align-items: center; gap: 10px; margin-left: auto; }
        .sf-burger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          margin-left: auto;
        }
        .sf-burger span {
          display: block;
          width: 22px;
          height: 2px;
          background: rgba(255,255,255,.7);
          border-radius: 2px;
        }
        .sf-mobile-menu {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px 24px 24px;
          border-top: 1px solid rgba(255,255,255,.06);
          background: #121212;
        }
        .sf-mobile-menu a {
          font-size: .82rem;
          color: rgba(255,255,255,.7);
          text-decoration: none;
          letter-spacing: .06em;
          text-transform: uppercase;
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
        }
        .sf-btn-primary:hover {
          box-shadow: 0 0 36px rgba(158,27,27,.45);
          transform: translateY(-1px);
        }
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
        }
        .sf-btn-ghost:hover {
          border-color: rgba(255,255,255,.4);
          color: #FFFFFF;
        }
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
        }
        .sf-btn-outline:hover {
          border-color: #9E1B1B;
          box-shadow: 0 0 20px rgba(158,27,27,.2);
        }
        .sf-btn-lg { padding: 15px 36px; font-size: .82rem; }
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
        .sf-hero-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 40%;
        }
        .sf-hero-ov-base {
          position: absolute;
          inset: 0;
          background: rgba(10,10,10,.72);
          z-index: 1;
        }
        .sf-hero-ov-crimson {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 70% 60% at 20% 60%, rgba(158,27,27,.28) 0%, transparent 70%);
          z-index: 2;
        }
        .sf-hero-ov-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(to top, #121212 0%, transparent 100%);
          z-index: 3;
        }
        .sf-hero-content {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
          width: 100%;
        }
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
          font-size: clamp(3rem, 8vw, 6rem);
          line-height: .96;
          letter-spacing: -.04em;
          color: #FFFFFF;
          margin-bottom: 22px;
        }
        .sf-accent { color: #9E1B1B; }
        .sf-hero-sub {
          font-family: 'Inter', sans-serif;
          font-size: clamp(.9rem, 1.6vw, 1.1rem);
          color: rgba(255,255,255,.65);
          line-height: 1.8;
          max-width: 520px;
          margin-bottom: 36px;
        }
        .sf-hero-btns {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .sf-hero-note {
          font-size: .68rem;
          color: rgba(255,255,255,.35);
          letter-spacing: .06em;
        }
        .sf-scroll-hint {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .sf-scroll-dot {
          width: 1px;
          height: 48px;
          background: linear-gradient(to bottom, rgba(255,255,255,.5), transparent);
          animation: scrollPulse 2s ease infinite;
        }
        @keyframes scrollPulse {
          0%,100% { opacity: .3; }
          50% { opacity: 1; }
        }

        /* ── STATS ── */
        .sf-stats {
          background: #1a1a1a;
          border-top: 1px solid rgba(255,255,255,.06);
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .sf-stats-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 32px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .sf-stat-item {
          text-align: center;
          padding: 12px 20px;
          border-right: 1px solid rgba(255,255,255,.06);
        }
        .sf-stat-item:last-child { border-right: none; }
        .sf-stat-val {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: clamp(1.8rem, 3vw, 2.8rem);
          letter-spacing: -.04em;
          color: #9E1B1B;
          line-height: 1;
          margin-bottom: 6px;
        }
        .sf-stat-label {
          font-size: .65rem;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.45);
        }

        /* ── SECTIONS ── */
        .sf-section {
          padding: clamp(72px, 10vw, 120px) 0;
        }
        .sf-section-alt {
          background: #1a1a1a;
        }
        .sf-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
        }
        .sf-container-sm {
          max-width: 760px;
        }
        .sf-section-header {
          text-align: center;
          margin-bottom: 64px;
        }
        .sf-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(158,27,27,.12);
          border: 1px solid rgba(158,27,27,.25);
          border-radius: 9999px;
          padding: 5px 16px;
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .62rem;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #f87171;
          margin-bottom: 20px;
        }
        .sf-section-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: clamp(2rem, 4vw, 3.2rem);
          letter-spacing: -.04em;
          line-height: .96;
          color: #FFFFFF;
          margin-bottom: 16px;
        }
        .sf-section-sub {
          font-size: .95rem;
          color: rgba(255,255,255,.55);
          line-height: 1.8;
          max-width: 520px;
          margin: 0 auto;
        }

        /* ── ROLES ── */
        .sf-roles-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .sf-role-card {
          background: #1e1e1e;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 16px;
          overflow: hidden;
          transition: transform .3s, border-color .3s;
        }
        .sf-role-card:hover {
          transform: translateY(-4px);
          border-color: rgba(158,27,27,.25);
        }
        .sf-role-img-wrap {
          position: relative;
          height: 260px;
          overflow: hidden;
        }
        .sf-role-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .6s;
        }
        .sf-role-card:hover .sf-role-img { transform: scale(1.04); }
        .sf-role-img-ov {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(14,14,14,.95) 0%, rgba(14,14,14,.4) 50%, transparent 100%);
        }
        .sf-role-badge {
          position: absolute;
          bottom: 18px;
          left: 20px;
          background: rgba(158,27,27,.22);
          border: 1px solid rgba(158,27,27,.4);
          border-radius: 9999px;
          padding: 5px 14px;
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .65rem;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #f87171;
        }
        .sf-role-body { padding: 28px; }
        .sf-role-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: 1.3rem;
          letter-spacing: -.02em;
          color: #FFFFFF;
          margin-bottom: 10px;
        }
        .sf-role-desc {
          font-size: .85rem;
          color: rgba(255,255,255,.6);
          line-height: 1.75;
          margin-bottom: 20px;
        }
        .sf-role-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-bottom: 4px;
        }
        .sf-role-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: .82rem;
          color: rgba(255,255,255,.72);
        }
        .sf-check {
          color: #9E1B1B;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* ── FEATURES ── */
        .sf-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .sf-feat-card {
          background: #121212;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 14px;
          padding: 28px 24px;
          transition: border-color .3s, transform .3s;
        }
        .sf-feat-card:hover {
          border-color: rgba(158,27,27,.25);
          transform: translateY(-3px);
        }
        .sf-feat-icon {
          font-size: 1.8rem;
          margin-bottom: 14px;
          display: block;
        }
        .sf-feat-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: -.01em;
          color: #FFFFFF;
          margin-bottom: 10px;
        }
        .sf-feat-desc {
          font-size: .82rem;
          color: rgba(255,255,255,.55);
          line-height: 1.75;
        }

        /* ── QUOTE ── */
        .sf-quote-section {
          padding: clamp(60px, 8vw, 100px) 0;
          background: #121212;
        }
        .sf-quote-card {
          background: linear-gradient(135deg, rgba(158,27,27,.1), rgba(158,27,27,.03));
          border: 1px solid rgba(158,27,27,.2);
          border-radius: 20px;
          padding: clamp(36px, 5vw, 60px);
          position: relative;
          overflow: hidden;
        }
        .sf-quote-mark {
          font-family: 'Lexend', sans-serif;
          font-size: 8rem;
          font-weight: 900;
          color: rgba(158,27,27,.12);
          line-height: 1;
          position: absolute;
          top: -10px;
          left: 24px;
          pointer-events: none;
        }
        .sf-quote-text {
          font-family: 'Lexend', sans-serif;
          font-weight: 300;
          font-size: clamp(1.1rem, 2.2vw, 1.6rem);
          line-height: 1.55;
          color: rgba(255,255,255,.88);
          font-style: italic;
          letter-spacing: -.01em;
          margin-bottom: 28px;
          position: relative;
        }
        .sf-quote-author {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sf-quote-av {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9E1B1B, #7a1212);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .75rem;
          color: #FFFFFF;
          flex-shrink: 0;
        }
        .sf-quote-name {
          font-weight: 600;
          font-size: .88rem;
          color: #FFFFFF;
        }
        .sf-quote-role {
          font-size: .72rem;
          color: rgba(255,255,255,.45);
          margin-top: 2px;
        }
        .sf-quote-stars {
          margin-left: auto;
          color: #9E1B1B;
          font-size: 1rem;
          letter-spacing: 2px;
        }

        /* ── FAQ ── */
        .sf-faq-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          overflow: hidden;
        }
        .sf-faq-item {
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: #1a1a1a;
          transition: background .2s;
        }
        .sf-faq-item:last-child { border-bottom: none; }
        .sf-faq-open { background: #1e1e1e; }
        .sf-faq-q {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 24px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: 'Inter', sans-serif;
          font-size: .88rem;
          font-weight: 500;
          color: #FFFFFF;
          line-height: 1.5;
          transition: color .2s;
        }
        .sf-faq-open .sf-faq-q { color: #f87171; }
        .sf-faq-icon {
          font-size: 1.2rem;
          color: #9E1B1B;
          flex-shrink: 0;
          line-height: 1;
          font-weight: 300;
        }
        .sf-faq-a {
          padding: 0 24px 20px;
          font-size: .83rem;
          color: rgba(255,255,255,.6);
          line-height: 1.8;
        }

        /* ── CTA FINAL ── */
        .sf-cta-section {
          position: relative;
          padding: clamp(80px, 12vw, 140px) 0;
          overflow: hidden;
        }
        .sf-cta-bg-img {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .sf-cta-bg-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .sf-cta-ov {
          position: absolute;
          inset: 0;
          background: rgba(10,10,10,.82);
        }
        .sf-cta-content {
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .sf-cta-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: clamp(2rem, 5vw, 3.8rem);
          letter-spacing: -.04em;
          line-height: .96;
          color: #FFFFFF;
          margin-bottom: 18px;
        }
        .sf-cta-sub {
          font-size: .95rem;
          color: rgba(255,255,255,.6);
          line-height: 1.8;
          max-width: 480px;
          margin: 0 auto 36px;
        }
        .sf-cta-btns {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .sf-trust-row {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .sf-trust-badge {
          font-size: .65rem;
          color: rgba(255,255,255,.38);
          letter-spacing: .06em;
        }

        /* ── FOOTER ── */
        .sf-footer {
          background: #0e0e0e;
          border-top: 1px solid rgba(255,255,255,.05);
          padding: 56px 0 32px;
        }
        .sf-footer-inner {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 48px;
        }
        .sf-footer-brand .sf-logo { margin-bottom: 10px; }
        .sf-footer-tagline {
          font-size: .78rem;
          color: rgba(255,255,255,.35);
        }
        .sf-footer-links-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sf-footer-col-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: .62rem;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.4);
          margin-bottom: 4px;
        }
        .sf-footer-links-col button,
        .sf-footer-links-col span {
          background: transparent;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: .8rem;
          color: rgba(255,255,255,.5);
          cursor: pointer;
          text-align: left;
          padding: 0;
          transition: color .2s;
        }
        .sf-footer-links-col button:hover { color: rgba(255,255,255,.85); }
        .sf-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,.05);
          font-size: .68rem;
          color: rgba(255,255,255,.25);
          letter-spacing: .04em;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .sf-nav-links, .sf-nav-ctas { display: none; }
          .sf-burger { display: flex; }
          .sf-stats-inner { grid-template-columns: 1fr 1fr; }
          .sf-stat-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,.06); }
          .sf-stat-item:nth-child(even) { border-right: none; }
          .sf-roles-grid { grid-template-columns: 1fr; }
          .sf-features-grid { grid-template-columns: 1fr 1fr; }
          .sf-footer-inner { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .sf-hero-title { letter-spacing: -.03em; }
          .sf-features-grid { grid-template-columns: 1fr; }
          .sf-footer-inner { grid-template-columns: 1fr; }
          .sf-stats-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
