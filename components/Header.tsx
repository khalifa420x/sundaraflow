'use client';

import { useEffect, useState } from 'react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const startProg = () => {
    scrollTo('#dashboard');
    setTimeout(() => {
      const evt = new CustomEvent('sundara:toast', {
        detail: { icon: '🚀', title: 'SundaraFlow activé!', msg: 'Votre dashboard coach est prêt.' },
      });
      window.dispatchEvent(evt);
    }, 600);
  };

  return (
    <nav id="mainNav" className={scrolled ? 'scrolled' : ''}>
      <a href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
        Sundara<span>Flow</span>
      </a>
      <div className="nav-center">
        <a href="#dashboard" onClick={(e) => { e.preventDefault(); scrollTo('#dashboard'); }}>Dashboard</a>
        <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features'); }}>Fonctionnalités</a>
        <a href="#temoignages" onClick={(e) => { e.preventDefault(); scrollTo('#temoignages'); }}>Témoignages</a>
        <a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('#faq'); }}>FAQ</a>
      </div>
      <div className="nav-right">
        <div className="nav-pill">
          <div className="nav-dot"></div>
          <div className="nav-av">RC</div>
          <span>Coach Romain</span>
        </div>
        <button className="btn btn-gold btn-sm" onClick={startProg}>
          Commencer
        </button>
      </div>
    </nav>
  );
}
