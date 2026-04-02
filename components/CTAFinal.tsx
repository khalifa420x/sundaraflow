'use client';

export default function CTAFinal() {
  return (
    <section id="cta-final">
      <div className="cta-rings">
        <div className="cr"></div>
        <div className="cr"></div>
        <div className="cr"></div>
      </div>
      <div className="cta-content reveal">
        <div className="tag">🚀 Passez à l&apos;action</div>
        <h2>
          Démarrez votre transformation<br />
          <span className="gold-i">maintenant.</span>
        </h2>
        <div className="divider divider--c"></div>
        <p>
          Chaque semaine sans système est une semaine de clients perdus, de revenus manqués et
          d&apos;énergie gaspillée. SundaraFlow change tout — en 48 heures.
        </p>
        <div className="cta-btns">
          <button
            className="btn btn-gold"
            style={{ fontSize: '.9rem', padding: '17px 44px' }}
            onClick={() => {
              document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('sundara:toast', {
                    detail: { icon: '🚀', title: 'SundaraFlow activé!', msg: 'Votre dashboard coach est prêt.' },
                  })
                );
              }, 600);
            }}
          >
            Démarrez votre transformation maintenant →
          </button>
          <a
            href="#dashboard"
            className="btn btn-outline"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Tester le dashboard
          </a>
        </div>
        <div className="cta-reas">
          <span>✓ Opérationnel en 48h</span>&nbsp;&nbsp;
          <span>✓ Zéro commission</span>&nbsp;&nbsp;
          <span>✓ Support FR dédié</span>
        </div>
      </div>
    </section>
  );
}
