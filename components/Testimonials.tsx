const testimonials = [
  {
    initials: 'ML',
    name: 'Marie-Laure Bonnet',
    role: 'Coach Nutrition & Performance',
    text: '"Avant SundaraFlow, je jonglais entre Notion, Stripe, Gmail et des Google Sheets. Je passais 15h/semaine sur l\'administratif. Maintenant tout est centralisé : mes 14 clients, leurs programmes, leur nutrition, leurs paiements. J\'ai récupéré 12h/semaine pour coacher et créer."',
    metrics: [
      { val: '+280%', label: 'CA en 5 mois' },
      { val: '14', label: 'Clients actifs' },
      { val: '-12h', label: 'Admin/semaine' },
    ],
  },
  {
    initials: 'TK',
    name: 'Thomas Keller',
    role: 'Coach Business & Mindset',
    text: '"Le tableau de bord coach est exactement ce dont j\'avais besoin. Je vois en 30 secondes quels clients sont actifs, qui a besoin d\'encouragement, qui risque d\'abandonner. J\'ai multiplié ma capacité cliente par 3 sans sacrifier la qualité de mon accompagnement."',
    metrics: [
      { val: '×3', label: 'Capacité clients' },
      { val: '94%', label: 'Rétention' },
      { val: '€18k', label: 'CA mensuel' },
    ],
  },
  {
    initials: 'AC',
    name: 'Amira Chaoui',
    role: 'Coach Dating & Confiance',
    text: '"J\'hésitais à cause du prix. En semaine 3, j\'avais déjà récupéré 100% de l\'investissement grâce à 2 nouvelles ventes générées par ma landing page SundaraFlow. En mois 2, j\'avais triplé mon tarif et mes clients acceptaient sans négocier — la qualité perçue est incomparable."',
    metrics: [
      { val: '3 sem.', label: 'ROI atteint' },
      { val: '×3', label: 'Tarifs' },
      { val: '€22k', label: 'CA mois 3' },
    ],
  },
];

export default function Testimonials() {
  return (
    <section id="temoignages" className="section">
      <div className="container">
        <div className="temo-hd reveal">
          <div className="tag">💬 Témoignages coachs</div>
          <h2>
            Ce que disent les coachs<br />
            <span className="gold-i">qui ont changé de niveau.</span>
          </h2>
          <div className="divider divider--c"></div>
          <p>
            Des coachs ambitieux qui ont transformé leur activité grâce à un système qui vend,
            livre et fidélise.
          </p>
        </div>

        <div className="g3">
          {testimonials.map((t, i) => (
            <div key={i} className={`temo-card reveal rd${i + 1}`}>
              <div className="stars">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="star">★</span>
                ))}
              </div>
              <p className="temo-text">{t.text}</p>
              <div className="temo-author">
                <div className="temo-av">{t.initials}</div>
                <div>
                  <div className="temo-name">{t.name}</div>
                  <div className="temo-role">{t.role}</div>
                </div>
              </div>
              <div className="temo-metrics">
                {t.metrics.map((m, j) => (
                  <div key={j}>
                    <div className="tm-val">{m.val}</div>
                    <div className="tm-label">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
