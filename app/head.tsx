export default function Head() {
  return (
    <>
      {/* Titre de l'application */}
      <title>SundraFlow - Coaching & Gestion Fitness</title>

      {/* Description SEO */}
      <meta
        name="description"
        content="SundraFlow est l'application ultime pour coachs et clients : créez et gérez vos programmes de fitness, suivez vos abonnements et boostez vos performances en un seul endroit."
      />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />

      {/* Open Graph pour partage sur réseaux sociaux */}
      <meta property="og:title" content="SundraFlow - Coaching & Gestion Fitness" />
      <meta
        property="og:description"
        content="SundraFlow : l'outil complet pour gérer vos programmes de fitness, suivre vos clients et optimiser vos abonnements."
      />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/favicon.ico" />
    </>
  )
}