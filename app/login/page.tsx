'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

/* ── TOUTE LA LOGIQUE EST PRÉSERVÉE — SEULE L'UI A ÉTÉ MODIFIÉE ── */

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ── handleLogin ORIGINAL — NON MODIFIÉ ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!snap.exists()) { setError('Utilisateur introuvable dans la base de données.'); setLoading(false); return; }
      const role = snap.data().role;
      window.location.href = role === 'coach' ? '/coach/home' : '/client/home';
    } catch (err: any) {
      const c = err.code || '';
      setError(
        c.includes('wrong-password') || c.includes('invalid-credential') ? 'Email ou mot de passe incorrect.' :
        c.includes('user-not-found')    ? 'Aucun compte associé à cet email.' :
        c.includes('too-many-requests') ? 'Trop de tentatives. Réessayez dans quelques minutes.' :
        c.includes('invalid-email')     ? 'Adresse email invalide.' :
        'Une erreur est survenue. Vérifiez vos identifiants et réessayez.'
      );
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ─── Racine ─── */
        .lp-root {
          min-height: 100vh;
          display: flex;
          background: #121212;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          color: #e5e2e1;
        }

        /* ─── PANNEAU GAUCHE (image) ─── */
        .lp-left {
          position: relative;
          flex: 0 0 58%;
          min-height: 100vh;
          overflow: hidden;
          display: none;
        }
        @media (min-width: 900px) { .lp-left { display: flex; } }

        .lp-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          transition: transform 8s ease;
        }
        .lp-root:hover .lp-img { transform: scale(1.04); }

        /* Dégradés d'overlay */
        .lp-ov1 {
          position: absolute; inset: 0;
          background: linear-gradient(to right, rgba(18,18,18,0) 0%, rgba(18,18,18,.6) 100%);
        }
        .lp-ov2 {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(18,18,18,.95) 0%, rgba(18,18,18,.25) 55%, rgba(18,18,18,.08) 100%);
        }
        .lp-ov3 {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 20% 55%, rgba(158,27,27,.32) 0%, transparent 60%);
        }

        .lp-left-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          padding: 36px 44px 48px;
        }

        /* Marque en haut */
        .lp-brand-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lp-brand-line { height: 1px; width: 36px; background: #9E1B1B; opacity: .8; }
        .lp-brand-name {
          font-family: 'Lexend', sans-serif;
          font-size: .68rem;
          font-weight: 800;
          letter-spacing: .3em;
          text-transform: uppercase;
          color: rgba(229,226,225,.85);
        }

        /* Headline gauche */
        .lp-headline {
          font-family: 'Lexend', sans-serif;
          font-size: clamp(2.4rem, 4vw, 3.6rem);
          font-weight: 900;
          line-height: .96;
          letter-spacing: -.03em;
          text-transform: uppercase;
          color: #e5e2e1;
          margin-bottom: 22px;
        }
        .lp-headline-accent {
          display: block;
          background: linear-gradient(90deg, #c0392b, #9E1B1B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-sub {
          font-size: .9rem;
          color: rgba(229,226,225,.45);
          line-height: 1.82;
          max-width: 360px;
          margin-bottom: 32px;
        }

        /* Badges */
        .lp-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .lp-chip {
          padding: 5px 13px;
          background: rgba(40,40,40,.55);
          border: 1px solid rgba(158,27,27,.22);
          border-radius: 9999px;
          font-size: .6rem;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(229,226,225,.45);
          backdrop-filter: blur(8px);
        }

        /* Stats */
        .lp-stats {
          display: flex;
          gap: 32px;
          padding-top: 26px;
          border-top: 1px solid rgba(158,27,27,.18);
        }
        .lp-stat-val {
          font-family: 'Lexend', sans-serif;
          font-size: 1.55rem;
          font-weight: 800;
          color: #c0392b;
          line-height: 1;
          margin-bottom: 4px;
        }
        .lp-stat-label {
          font-size: .58rem;
          font-weight: 600;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: rgba(229,226,225,.35);
        }

        /* ─── PANNEAU DROIT (formulaire) ─── */
        .lp-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          min-height: 100vh;
          position: relative;
          background: #121212;
          overflow-y: auto;
        }
        .lp-right::before {
          content: '';
          position: absolute;
          top: -140px; right: -140px;
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(158,27,27,.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-right::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(158,27,27,.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-right-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          opacity: 0;
          transform: translateY(22px);
          transition: opacity .65s ease, transform .65s ease;
        }
        .lp-right-inner.visible { opacity: 1; transform: translateY(0); }

        /* Logo mobile */
        .lp-mobile-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          margin-bottom: 40px;
        }
        @media (min-width: 900px) { .lp-mobile-logo { display: none; } }
        .lp-mobile-logo-line { height: 1px; width: 28px; background: #9E1B1B; }
        .lp-mobile-logo-text {
          font-family: 'Lexend', sans-serif;
          font-size: .68rem;
          font-weight: 800;
          letter-spacing: .26em;
          text-transform: uppercase;
          color: #e5e2e1;
        }

        /* Eyebrow */
        .lp-eyebrow {
          font-family: 'Lexend', sans-serif;
          font-size: .58rem;
          font-weight: 700;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: #c0392b;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-eyebrow::before {
          content: '';
          display: block;
          width: 20px; height: 1px;
          background: #9E1B1B;
          flex-shrink: 0;
        }

        /* Titre formulaire */
        .lp-form-headline {
          font-family: 'Lexend', sans-serif;
          font-size: clamp(1.9rem, 4vw, 2.7rem);
          font-weight: 900;
          letter-spacing: -.04em;
          text-transform: uppercase;
          color: #e5e2e1;
          line-height: .95;
          margin-bottom: 8px;
        }
        .lp-form-headline span { color: #c0392b; }

        .lp-form-sub {
          font-size: .8rem;
          color: rgba(229,226,225,.4);
          margin-bottom: 34px;
          line-height: 1.7;
        }

        /* Carte formulaire */
        .lp-card {
          background: rgba(24,24,24,.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(158,27,27,.16);
          border-radius: 16px;
          padding: 30px 26px;
          box-shadow: 0 32px 64px rgba(0,0,0,.55), 0 0 0 1px rgba(158,27,27,.05);
          margin-bottom: 18px;
        }

        /* Champs */
        .lp-field { margin-bottom: 18px; }
        .lp-field label {
          display: block;
          font-family: 'Lexend', sans-serif;
          font-size: .56rem;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: rgba(229,226,225,.38);
          margin-bottom: 8px;
          padding-left: 2px;
        }
        .lp-input-wrap { position: relative; }
        .lp-input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid rgba(158,27,27,.14);
          border-radius: 10px;
          padding: 14px 18px;
          color: #e5e2e1;
          font-family: 'Lexend', sans-serif;
          font-size: .88rem;
          font-weight: 400;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          -webkit-appearance: none;
        }
        .lp-input::placeholder { color: rgba(229,226,225,.2); }
        .lp-input:focus {
          border-color: rgba(158,27,27,.55);
          box-shadow: 0 0 0 3px rgba(158,27,27,.12);
        }

        /* Toggle mot de passe */
        .lp-pw-toggle {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          color: rgba(229,226,225,.28);
          font-size: 1rem;
          transition: color .2s;
          padding: 0; line-height: 1;
        }
        .lp-pw-toggle:hover { color: rgba(229,226,225,.55); }

        /* Message d'erreur */
        .lp-error {
          background: rgba(158,27,27,.1);
          border: 1px solid rgba(158,27,27,.32);
          border-radius: 8px;
          padding: 11px 14px;
          font-size: .78rem;
          color: #e57373;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 16px;
          margin-top: -4px;
        }
        .lp-error-icon { flex-shrink: 0; margin-top: 1px; }

        /* Bouton principal */
        .lp-btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #9E1B1B, #7a1212);
          border: none;
          border-radius: 9999px;
          color: #f0e9e9;
          font-family: 'Lexend', sans-serif;
          font-size: .72rem;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          cursor: pointer;
          transition: box-shadow .25s, transform .18s, opacity .2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 24px rgba(158,27,27,.38);
          margin-top: 6px;
        }
        .lp-btn-primary:hover:not(:disabled) {
          box-shadow: 0 0 40px rgba(158,27,27,.55), 0 8px 32px rgba(158,27,27,.32);
          transform: translateY(-1px);
        }
        .lp-btn-primary:active:not(:disabled) { transform: scale(.97); }
        .lp-btn-primary:disabled { opacity: .6; cursor: not-allowed; }

        /* Spinner */
        .lp-spin {
          width: 14px; height: 14px;
          border: 2px solid rgba(240,233,233,.22);
          border-top-color: #f0e9e9;
          border-radius: 50%;
          animation: lp-rotate .7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes lp-rotate { to { transform: rotate(360deg); } }

        /* Séparateur */
        .lp-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .lp-divider-line { flex: 1; height: 1px; background: rgba(158,27,27,.14); }
        .lp-divider-text {
          font-size: .62rem;
          color: rgba(229,226,225,.28);
          white-space: nowrap;
          font-family: 'Lexend', sans-serif;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        /* Boutons de rôle */
        .lp-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .lp-role-btn {
          padding: 13px 10px;
          background: rgba(30,30,30,.6);
          border: 1px solid rgba(158,27,27,.16);
          border-radius: 9999px;
          color: rgba(229,226,225,.5);
          font-family: 'Lexend', sans-serif;
          font-size: .6rem;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all .22s;
          backdrop-filter: blur(8px);
        }
        .lp-role-btn:hover {
          background: rgba(158,27,27,.12);
          border-color: rgba(158,27,27,.38);
          color: #e57373;
          box-shadow: 0 0 16px rgba(158,27,27,.16);
        }

        /* Badges de confiance */
        .lp-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .lp-trust-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: .58rem;
          color: rgba(229,226,225,.24);
          font-family: 'Lexend', sans-serif;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .lp-trust-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #9E1B1B;
          flex-shrink: 0;
          opacity: .7;
        }

        /* Fond mobile */
        .lp-mobile-bg {
          position: fixed; inset: 0;
          z-index: 0;
          pointer-events: none;
          display: block;
        }
        @media (min-width: 900px) { .lp-mobile-bg { display: none; } }
        .lp-mobile-bg img {
          width: 100%; height: 100%;
          object-fit: cover;
          opacity: .06;
          filter: grayscale(40%);
        }

        /* Filigrane décoratif */
        .lp-watermark {
          position: fixed;
          bottom: 0; right: 0;
          padding: 24px 32px;
          opacity: .03;
          pointer-events: none;
          user-select: none;
          display: none;
        }
        @media (min-width: 1200px) { .lp-watermark { display: block; } }
        .lp-watermark-text {
          font-family: 'Lexend', sans-serif;
          font-size: 7rem;
          font-weight: 900;
          letter-spacing: -.05em;
          text-transform: uppercase;
          color: #e5e2e1;
          line-height: 1;
        }
      `}</style>

      <div className="lp-root">

        {/* Fond mobile */}
        <div className="lp-mobile-bg" aria-hidden>
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop"
            alt=""
          />
        </div>

        {/* ══════════════════════════════════
            PANNEAU GAUCHE — Image + Marque
        ══════════════════════════════════ */}
        <div className="lp-left">
          <img
            className="lp-img"
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80&auto=format&fit=crop"
            alt="Athlète en entraînement intensif"
          />
          <div className="lp-ov1" />
          <div className="lp-ov2" />
          <div className="lp-ov3" />

          <div className="lp-left-content">
            {/* Marque */}
            <div className="lp-brand-top">
              <div className="lp-brand-line" />
              <span className="lp-brand-name">Sundara Flow</span>
              <div className="lp-brand-line" />
            </div>

            {/* Contenu bas */}
            <div>
              <h2 className="lp-headline">
                Bon retour<br />
                dans<br />
                <span className="lp-headline-accent">le Flow</span>
              </h2>

              <div className="lp-chips">
                {['Coaching d\'élite', 'Performance', 'Nutrition', 'Mindset'].map(c => (
                  <span key={c} className="lp-chip">{c}</span>
                ))}
              </div>

              <p className="lp-sub">
                Votre espace personnalisé vous attend. Connectez-vous pour accéder à vos programmes, plans nutritionnels et analyses de progression.
              </p>

              <div className="lp-stats">
                <div>
                  <div className="lp-stat-val">500+</div>
                  <div className="lp-stat-label">Coachs actifs</div>
                </div>
                <div>
                  <div className="lp-stat-val">12k+</div>
                  <div className="lp-stat-label">Athlètes</div>
                </div>
                <div>
                  <div className="lp-stat-val">4.9★</div>
                  <div className="lp-stat-label">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            PANNEAU DROIT — Formulaire
        ══════════════════════════════════ */}
        <div className="lp-right">
          <div className={`lp-right-inner ${mounted ? 'visible' : ''}`}>

            {/* Logo mobile */}
            <div className="lp-mobile-logo">
              <div className="lp-mobile-logo-line" />
              <span className="lp-mobile-logo-text">Sundara Flow</span>
              <div className="lp-mobile-logo-line" />
            </div>

            {/* Accroche */}
            <div className="lp-eyebrow">Espace membres</div>

            <h1 className="lp-form-headline">
              Connexion<br />
              <span>à Sundara</span>
            </h1>
            <p className="lp-form-sub">
              Entrez vos identifiants pour accéder à votre espace personnalisé.
            </p>

            {/* ── CARTE FORMULAIRE ── */}
            <div className="lp-card">
              <form onSubmit={handleLogin}>

                {/* Email */}
                <div className="lp-field">
                  <label htmlFor="lp-email">Adresse e-mail</label>
                  <div className="lp-input-wrap">
                    <input
                      id="lp-email"
                      className="lp-input"
                      type="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="lp-field">
                  <label htmlFor="lp-password">Mot de passe</label>
                  <div className="lp-input-wrap">
                    <input
                      id="lp-password"
                      className="lp-input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      className="lp-pw-toggle"
                      onClick={() => setShowPw(v => !v)}
                      tabIndex={-1}
                      aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Erreur */}
                {error && (
                  <div className="lp-error">
                    <span className="lp-error-icon">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Bouton connexion */}
                <button
                  type="submit"
                  className="lp-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="lp-spin" />
                      Connexion en cours…
                    </>
                  ) : (
                    'Accéder à mon espace →'
                  )}
                </button>
              </form>

              {/* Séparateur */}
              <div className="lp-divider">
                <div className="lp-divider-line" />
                <span className="lp-divider-text">Pas encore de compte ?</span>
                <div className="lp-divider-line" />
              </div>

              {/* Boutons rôle */}
              <div className="lp-role-grid">
                <button
                  type="button"
                  className="lp-role-btn"
                  onClick={() => router.push('/register/coach')}
                >
                  🏆 Je suis coach
                </button>
                <button
                  type="button"
                  className="lp-role-btn"
                  onClick={() => router.push('/register/client')}
                >
                  ⚡ Je suis client
                </button>
              </div>
            </div>

            {/* Badges de confiance */}
            <div className="lp-trust">
              {['🔒 Connexion sécurisée SSL', '⚡ Accès instantané', '✓ Authentification Firebase'].map(s => (
                <div key={s} className="lp-trust-item">
                  <span className="lp-trust-dot" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filigrane décoratif */}
        <div className="lp-watermark" aria-hidden>
          <div className="lp-watermark-text">FLOW</div>
        </div>
      </div>
    </>
  );
}
