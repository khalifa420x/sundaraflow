'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'En combien de temps puis-je être opérationnel avec mes premiers clients ?',
    a: "En 48 à 72 heures après votre onboarding. Notre équipe configure votre espace coach, intègre votre branding, crée vos premiers programmes templates et active votre système de paiement. Vous pouvez envoyer votre première invitation client dès le jour 2.",
  },
  {
    q: 'Combien de clients puis-je gérer simultanément ?',
    a: "Le plan Standard permet jusqu'à 20 clients actifs simultanément. Le plan Scale monte à 50 clients, avec fonctionnalités d'équipe pour recruter des coachs assistants. Au-delà, notre plan Enterprise est personnalisé selon vos besoins. La majorité de nos coachs opèrent entre 8 et 25 clients simultanément.",
  },
  {
    q: "Est-ce que je garde mes programmes si je décide d'arrêter SundaraFlow ?",
    a: "Oui. Toutes vos données — programmes, plans nutritionnels, historiques clients, fichiers — sont exportables en PDF et CSV à tout moment. Nous ne prenons pas votre contenu en otage. Votre travail vous appartient intégralement.",
  },
  {
    q: "Puis-je personnaliser l'interface que verront mes clients ?",
    a: "Complètement. Votre logo, vos couleurs, votre nom de domaine personnalisé, votre branding complet. Vos clients voient votre marque — pas SundaraFlow. Nous sommes l'infrastructure invisible derrière votre expérience premium.",
  },
  {
    q: 'SundaraFlow prend-il une commission sur mes ventes ?',
    a: "Non. Zéro commission sur vos revenus. Vous payez un abonnement mensuel fixe — c'est tout. Que vous fassiez €2 000 ou €50 000 par mois, votre coût SundaraFlow reste identique. Contrairement à d'autres plateformes qui prennent jusqu'à 5% de commission.",
  },
  {
    q: 'Y a-t-il un support technique en français ?',
    a: "Oui — support 100% en français. Chat en direct (9h-19h, du lundi au vendredi), email (réponse sous 4h) et base de connaissances complète en français. Les coachs plan Scale bénéficient en plus d'un account manager dédié joignable par WhatsApp.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  return (
    <section id="faq" className="section">
      <div className="container container--n">
        <div className="faq-hd reveal">
          <div className="tag">❓ FAQ</div>
          <h2>
            Vos questions.<br />
            <span className="gold-i">Nos réponses directes.</span>
          </h2>
          <div className="divider divider--c"></div>
          <p>Tout ce que vous voulez savoir avant de commencer votre programme.</p>
        </div>

        <div className="reveal">
          {faqs.map((f, i) => (
            <div key={i} className={`faq-item${open === i ? ' open' : ''}`}>
              <div className="faq-q" onClick={() => toggle(i)}>
                <span className="faq-q-txt">{f.q}</span>
                <div className="faq-ico">+</div>
              </div>
              <div className={`faq-a${open === i ? ' open' : ''}`}>
                <div className="faq-a-inner">{f.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
