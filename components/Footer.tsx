'use client';

export default function Footer() {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer>
      <div className="footer-logo">
        Sundara<span>Flow</span>
      </div>
      <div className="footer-tag">L&apos;infrastructure invisible derrière les coachs qui scalen.</div>
      <div className="footer-links">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Accueil</a>
        <a href="#dashboard" onClick={(e) => { e.preventDefault(); scrollTo('#dashboard'); }}>Dashboard</a>
        <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('#features'); }}>Fonctionnalités</a>
        <a href="#temoignages" onClick={(e) => { e.preventDefault(); scrollTo('#temoignages'); }}>Témoignages</a>
        <a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('#faq'); }}>FAQ</a>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          scrollTo('#dashboard');
          setTimeout(() => window.dispatchEvent(new CustomEvent('sundara:toast', {
            detail: { icon: '🚀', title: 'SundaraFlow activé!', msg: 'Votre dashboard coach est prêt.' }
          })), 600);
        }}>Commencer</a>
        <a href="#">Mentions légales</a>
      </div>
      <div className="footer-copy">© 2025 SundaraFlow. Tous droits réservés.</div>
    </footer>
  );
}
