const features = [
  {
    icon: '🏆',
    title: 'Gestion Multi-Clients',
    desc: 'Gérez jusqu\'à 50 clients simultanément depuis un seul dashboard. Vue d\'ensemble en temps réel, alertes automatiques, priorités intelligentes.',
    bullets: [
      'Tableau de bord centralisé temps réel',
      'Alertes si client inactif 48h+',
      'Priorisation automatique par urgence',
      'Historique complet par client',
    ],
  },
  {
    icon: '🏋️',
    title: 'Programmes d\'Entraînement',
    desc: 'Créez, dupliquez et personnalisez des programmes complets. Bibliothèque de +200 exercices avec vidéos, progressions automatiques calculées.',
    bullets: [
      'Builder drag-and-drop intuitif',
      'Progression automatique semaine/semaine',
      '+200 exercices en HD avec instructions',
      'Mode récupération et déload intégrés',
    ],
  },
  {
    icon: '🥗',
    title: 'Plans Nutritionnels',
    desc: 'Créez des plans nutritionnels personnalisés avec calcul automatique des macros, recettes adaptées et suivi du jeûne intermittent.',
    bullets: [
      'Calcul TDEE et macros automatique',
      'Bibliothèque de 500+ recettes santé',
      'Suivi jeûne intermittent (16/8, 5:2)',
      'Alertes déficit calorique dangereux',
    ],
  },
  {
    icon: '📊',
    title: 'Analytics Avancées',
    desc: 'Données de progression, taux de complétion, revenus, rétention client. Des dashboards analytiques qui informent chaque décision de coaching.',
    bullets: [
      'Rapports automatiques hebdomadaires',
      'Suivi des volumes et intensités',
      'Prévisions de revenus MRR/ARR',
      'Benchmark vs médiane coachs SF',
    ],
  },
  {
    icon: '🤖',
    title: 'Automatisations Smart',
    desc: 'Relances SMS, emails personnalisés, célébrations de milestones, rappels de séance. Votre assistant coaching opérationnel 24h/24.',
    bullets: [
      'Workflows personnalisables par niche',
      'Relance auto si séance manquée',
      'Onboarding automatisé en 7 étapes',
      'Facturation et renouvellement auto',
    ],
  },
  {
    icon: '💳',
    title: 'Paiement & Facturation',
    desc: 'Intégration Stripe complète. Abonnements récurrents, paiements en 3x, devis en 1 clic. Zéro gestion manuelle, 100% automatisé.',
    bullets: [
      'Stripe + PayPal intégrés nativement',
      'Abonnements, paiements fractionnés',
      'Factures automatiques conformes TVA',
      'Tableau de bord revenu temps réel',
    ],
  },
];

export default function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div className="feat-hd reveal">
          <div className="tag">⚡ Fonctionnalités</div>
          <h2>
            Tout ce dont vous avez besoin<br />
            <span className="gold-i">pour scaler votre coaching.</span>
          </h2>
          <div className="divider divider--c"></div>
          <p>
            SundaraFlow n&apos;est pas un outil de plus. C&apos;est l&apos;infrastructure complète qui remplace
            tout ce qui vous ralentit — et automatise ce qui vous enrichit.
          </p>
        </div>

        <div className="g3">
          {features.map((f, i) => (
            <div key={i} className={`feat-card reveal rd${(i % 3) + 1}`}>
              <div className="feat-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <ul className="feat-bullets">
                {f.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
