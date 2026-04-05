'use client';

import { useEffect } from 'react';

export default function Hero() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.cnt').forEach((el) => {
      const target = parseInt(el.dataset.target || '0');
      const suffix = el.dataset.suffix || '';
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              let n = 0;
              const step = target / 60;
              const t = setInterval(() => {
                n = Math.min(n + step, target);
                el.textContent = Math.floor(n).toLocaleString('fr') + suffix;
                if (n >= target) clearInterval(t);
              }, 18);
              obs.disconnect();
            }
          });
        },
        { threshold: 0.8 }
      );
      obs.observe(el);
    });
  }, []);

  const startProg = () => {
    const dash = document.getElementById('dashboard');
    if (dash) dash.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('sundara:toast', {
          detail: { icon: '🚀', title: 'SundaraFlow activé!', msg: 'Votre dashboard coach est prêt.' },
        })
      );
    }, 600);
  };

  return (
    <section id="hero">
      <div className="hero-bg"></div>
      <div className="hero-grid-lines"></div>
      <div className="hero-orb orb-1"></div>

      <div className="hero-content">
        <div className="hero-eyebrow">Système de Coaching Premium</div>
        <h1 className="hero-headline">
          Gérez votre coaching.<br />
          <span className="gold-i">Maîtrisez chaque résultat.</span>
        </h1>
        <p className="hero-sub">
          SundaraFlow centralise la gestion de vos clients, programmes d&apos;entraînement, plans
          nutritionnels et suivi de progression — dans une interface premium conçue pour les coachs
          qui veulent scaler sans perdre en qualité.
        </p>
        <div className="hero-cta">
          <button
            className="btn btn-gold"
            onClick={startProg}
            style={{ fontSize: '.88rem', padding: '16px 38px' }}
          >
            <span>▶</span> Commencez votre programme
          </button>
          <a
            href="#dashboard"
            className="btn btn-outline"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explorer le dashboard
          </a>
        </div>

        <div className="hero-status">
          <div className="hs-item">
            <span className="cnt" data-target="127" data-suffix="+">0+</span>
            &nbsp;<strong>coachs actifs</strong>
          </div>
          <div className="hs-sep"></div>
          <div className="hs-item">
            <span className="cnt" data-target="3840" data-suffix="">0</span>
            &nbsp;<strong>clients gérés</strong>
          </div>
          <div className="hs-sep"></div>
          <div className="hs-item">
            <span className="cnt" data-target="98" data-suffix="%">0%</span>
            &nbsp;<strong>satisfaction</strong>
          </div>
          <div className="hs-sep"></div>
          <div className="hs-item">⚡&nbsp;<strong>Déploiement 48h</strong></div>
        </div>
      </div>

      <div className="scroll-cue">
        <span>Découvrir</span>
        <div className="scroll-line"></div>
      </div>
    </section>
  );
}
