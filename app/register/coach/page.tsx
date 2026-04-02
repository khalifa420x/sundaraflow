'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '../../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const PERKS = [
  { icon: '👥', text: 'Gérez jusqu\'à 50 clients simultanément' },
  { icon: '📋', text: 'Programmes entraînement & nutrition sur-mesure' },
  { icon: '📈', text: 'Suivi de progression en temps réel' },
  { icon: '💡', text: 'Conseils lifestyle & mindset automatisés' },
  { icon: '🔥', text: 'Plans de jeûne intermittent personnalisés' },
];

export default function RegisterCoach() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email, name: name.trim(), role: 'coach', createdAt: new Date().toISOString(),
      });
      router.push('/coach/home');
    } catch (err: any) {
      const c = err.code || '';
      setError(
        c.includes('email-already-in-use') ? 'Un compte existe déjà avec cet email.' :
        c.includes('weak-password')         ? 'Mot de passe trop faible (minimum 6 caractères).' :
        c.includes('invalid-email')         ? 'Adresse email invalide.' :
        'Une erreur est survenue. Réessayez.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="rc-root">
      {/* ══ LEFT — Image Panel ══ */}
      <div className="rc-left">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=80"
          alt="Coach professionnel"
          className="rc-img"
        />
        {/* Overlays */}
        <div className="rc-ov-right" />
        <div className="rc-ov-bottom" />
        <div className="rc-ov-crimson" />

        {/* Left panel content */}
        <div className="rc-left-content" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(24px)', transition: 'opacity .7s ease .1s, transform .7s ease .1s' }}>
          {/* Logo */}
          <div className="rc-logo">
            Sundara<span>Flow</span>
          </div>

          {/* Badge */}
          <div className="rc-badge">🏆 Espace Coach</div>

          {/* Headline */}
          <h1 className="rc-headline">
            Créez votre<br />
            <span className="rc-accent">espace coach.</span>
          </h1>

          <p className="rc-sub">
            Rejoignez les coachs d'élite qui transforment leurs clients grâce à des programmes ultra-personnalisés et un suivi complet.
          </p>

          {/* Perks */}
          <div className="rc-perks">
            {PERKS.map((p, i) => (
              <div key={i} className="rc-perk" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateX(-14px)', transition: `opacity .5s ease ${.2 + i * .08}s, transform .5s ease ${.2 + i * .08}s` }}>
                <span className="rc-perk-icon">{p.icon}</span>
                <span>{p.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="rc-stats">
            {[{ val: '500+', label: 'Coachs actifs' }, { val: '4.8★', label: 'Note moyenne' }, { val: '0€', label: 'Pour démarrer' }].map(s => (
              <div key={s.label} className="rc-stat">
                <div className="rc-stat-val">{s.val}</div>
                <div className="rc-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Form Panel ══ */}
      <div className="rc-right">
        <div className="rc-form-wrap" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)', transition: 'opacity .65s ease .2s, transform .65s ease .2s' }}>

          {/* Back link */}
          <button className="rc-back" onClick={() => router.push('/login')}>
            ← Connexion
          </button>

          {/* Form card */}
          <div className="rc-card">
            <div className="rc-card-header">
              <h2 className="rc-card-title">Créer mon compte coach</h2>
              <p className="rc-card-sub">Gratuit · Sans carte bancaire requise</p>
            </div>

            <form onSubmit={handleRegister} className="rc-form">
              <div className="rc-field">
                <label>Votre nom complet</label>
                <input
                  type="text"
                  placeholder="Thomas Martin"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="rc-field">
                <label>Adresse email</label>
                <input
                  type="email"
                  placeholder="coach@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="rc-field">
                <label>Mot de passe</label>
                <div className="rc-pw-wrap">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Au moins 6 caractères"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="rc-pw-toggle" onClick={() => setShowPw(v => !v)}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rc-error">
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="rc-btn-primary" disabled={loading}>
                {loading
                  ? <><span className="rc-spin" /> Création en cours…</>
                  : 'Créer mon espace coach →'
                }
              </button>
            </form>

            <div className="rc-footer-links">
              <p>
                Déjà un compte ?{' '}
                <span className="rc-link" onClick={() => router.push('/login')}>Se connecter</span>
              </p>
              <p>
                Vous êtes client ?{' '}
                <span className="rc-link rc-link-dim" onClick={() => router.push('/register/client')}>Créer un compte client</span>
              </p>
            </div>
          </div>

          {/* SSL notice */}
          <p className="rc-ssl">🔒 Connexion sécurisée SSL · Vos données sont protégées</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rc-root {
          display: flex;
          height: 100vh;
          background: #121212;
          color: #FFFFFF;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }

        /* ── Left Panel ── */
        .rc-left {
          position: relative;
          width: 58%;
          flex-shrink: 0;
          overflow: hidden;
        }
        .rc-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .rc-ov-right {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent 40%, #121212 100%);
          z-index: 1;
        }
        .rc-ov-bottom {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(10,10,10,.92) 0%, transparent 50%);
          z-index: 2;
        }
        .rc-ov-crimson {
          position: absolute;
          top: -20%;
          left: -10%;
          width: 65%;
          height: 65%;
          background: radial-gradient(circle, rgba(158,27,27,.28) 0%, transparent 70%);
          z-index: 3;
          pointer-events: none;
        }
        .rc-left-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10;
          padding: 0 44px 52px;
        }
        .rc-logo {
          font-family: 'Lexend', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          letter-spacing: .05em;
          text-transform: uppercase;
          color: #FFFFFF;
          margin-bottom: 28px;
          opacity: .9;
        }
        .rc-logo span { color: #9E1B1B; }
        .rc-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(158,27,27,.18);
          border: 1px solid rgba(158,27,27,.35);
          border-radius: 9999px;
          padding: 5px 14px;
          font-size: .7rem;
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #f87171;
          margin-bottom: 20px;
        }
        .rc-headline {
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: clamp(2rem, 3.5vw, 3rem);
          line-height: 1.05;
          letter-spacing: -.03em;
          margin-bottom: 14px;
          color: #FFFFFF;
        }
        .rc-accent { color: #9E1B1B; }
        .rc-sub {
          font-size: .88rem;
          color: rgba(255,255,255,.65);
          line-height: 1.75;
          max-width: 360px;
          margin-bottom: 26px;
        }
        .rc-perks {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 30px;
        }
        .rc-perk {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: .82rem;
          color: rgba(255,255,255,.75);
        }
        .rc-perk-icon {
          width: 28px;
          height: 28px;
          background: rgba(158,27,27,.15);
          border: 1px solid rgba(158,27,27,.25);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: .82rem;
        }
        .rc-stats {
          display: flex;
          gap: 28px;
        }
        .rc-stat-val {
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          color: #9E1B1B;
          line-height: 1;
        }
        .rc-stat-label {
          font-size: .6rem;
          color: rgba(255,255,255,.5);
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-top: 4px;
        }

        /* ── Right Panel ── */
        .rc-right {
          flex: 1;
          background: #121212;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
        }
        .rc-form-wrap {
          width: 100%;
          max-width: 420px;
        }
        .rc-back {
          background: transparent;
          border: none;
          color: rgba(255,255,255,.45);
          font-family: 'Lexend', sans-serif;
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          cursor: pointer;
          margin-bottom: 28px;
          padding: 0;
          transition: color .2s;
        }
        .rc-back:hover { color: #9E1B1B; }
        .rc-card {
          background: rgba(24,24,24,.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(158,27,27,.16);
          border-radius: 16px;
          padding: 36px 32px;
          box-shadow: 0 32px 80px rgba(0,0,0,.55);
        }
        .rc-card-header { margin-bottom: 28px; }
        .rc-card-title {
          font-family: 'Lexend', sans-serif;
          font-weight: 700;
          font-size: 1.55rem;
          letter-spacing: -.02em;
          color: #FFFFFF;
          margin-bottom: 6px;
        }
        .rc-card-sub {
          font-size: .75rem;
          color: #9CA3AF;
        }
        .rc-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rc-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rc-field label {
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: #9CA3AF;
        }
        .rc-field input,
        .rc-pw-wrap input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 8px;
          padding: 13px 16px;
          font-size: .88rem;
          font-family: 'Inter', sans-serif;
          color: #FFFFFF;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .rc-field input:focus,
        .rc-pw-wrap input:focus {
          border-color: rgba(158,27,27,.55);
          box-shadow: 0 0 0 3px rgba(158,27,27,.12);
        }
        .rc-field input::placeholder,
        .rc-pw-wrap input::placeholder { color: #4B5563; }
        .rc-pw-wrap {
          position: relative;
        }
        .rc-pw-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: .9rem;
          opacity: .55;
          transition: opacity .2s;
          padding: 0;
        }
        .rc-pw-toggle:hover { opacity: 1; }
        .rc-error {
          background: rgba(127,29,29,.18);
          border: 1px solid rgba(239,68,68,.22);
          border-radius: 8px;
          padding: 11px 14px;
          font-size: .78rem;
          color: #f87171;
        }
        .rc-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #9E1B1B, #7a1212);
          border: none;
          border-radius: 9999px;
          color: #FFFFFF;
          font-family: 'Lexend', sans-serif;
          font-weight: 800;
          font-size: .82rem;
          letter-spacing: .08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity .2s, box-shadow .25s, transform .15s;
          margin-top: 4px;
        }
        .rc-btn-primary:hover:not(:disabled) {
          box-shadow: 0 0 32px rgba(158,27,27,.4);
          transform: translateY(-1px);
        }
        .rc-btn-primary:disabled { opacity: .65; cursor: not-allowed; }
        .rc-spin {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,.25);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: rcSpin .7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes rcSpin { to { transform: rotate(360deg); } }
        .rc-footer-links {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: center;
        }
        .rc-footer-links p { font-size: .73rem; color: #9CA3AF; }
        .rc-link {
          color: #9E1B1B;
          cursor: pointer;
          text-decoration: underline;
          transition: color .2s;
        }
        .rc-link:hover { color: #b91c1c; }
        .rc-link-dim { color: #6B7280; }
        .rc-link-dim:hover { color: #9CA3AF; }
        .rc-ssl {
          margin-top: 20px;
          text-align: center;
          font-size: .65rem;
          color: rgba(255,255,255,.3);
          letter-spacing: .04em;
        }

        /* Scrollbar */
        .rc-right::-webkit-scrollbar { width: 4px; }
        .rc-right::-webkit-scrollbar-track { background: #121212; }
        .rc-right::-webkit-scrollbar-thumb { background: #9E1B1B; border-radius: 10px; }
        .rc-right::-webkit-scrollbar-thumb:hover { background: #b91c1c; }

        @media (max-width: 768px) {
          .rc-root { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }
          .rc-left { width: 100%; height: 280px; flex-shrink: 0; }
          .rc-left-content { padding: 0 24px 28px; }
          .rc-perks { display: none; }
          .rc-stats { display: none; }
          .rc-sub { display: none; }
          .rc-right { padding: 32px 20px; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
