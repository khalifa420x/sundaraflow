'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'

export default function JoinPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token')

  const [clientData, setClientData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }
    loadClientByToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadClientByToken() {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const q = query(
        collection(db, 'clients'),
        where('inviteToken', '==', token)
      )
      const snap = await getDocs(q)

      if (snap.empty) {
        setNotFound(true)
      } else {
        setClientData({ id: snap.docs[0].id, ...snap.docs[0].data() })
      }
    } catch (err) {
      console.error('[join] Error loading client:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!password || password.length < 6) {
      setError('Mot de passe trop court (6 caractères minimum)')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const credential = await createUserWithEmailAndPassword(auth, clientData.email, password)
      await updateProfile(credential.user, { displayName: clientData.name })

      const clientRef = doc(db, 'clients', clientData.id)
      const userRef = doc(db, 'users', clientData.id)

      await Promise.all([
        updateDoc(clientRef, { status: 'active', uid: credential.user.uid, inviteToken: null }),
        updateDoc(userRef,   { status: 'active', uid: credential.user.uid, inviteToken: null }),
      ])

      console.log('[join] Account activated:', clientData.email)
      router.replace('/client/home')

    } catch (err: any) {
      console.error('[join] Error:', err)
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Ce compte existe déjà. Connectez-vous sur /login'
          : err.message
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔗</div>
        <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#e5e2e1', marginBottom: 8 }}>Lien invalide ou expiré</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '.82rem', color: '#9CA3AF' }}>Contactez votre coach pour obtenir un nouveau lien.</p>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@700;800;900&family=Inter:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .join-input {
          width: 100%;
          background: #1c1b1b;
          border: 1px solid rgba(90,64,60,0.2);
          border-radius: 8px;
          padding: 12px 14px;
          color: #e5e2e1;
          font-family: Inter, sans-serif;
          font-size: .88rem;
          outline: none;
          transition: border-color .2s;
        }
        .join-input:focus { border-color: rgba(178,42,39,0.4); box-shadow: 0 0 0 3px rgba(178,42,39,0.08); }
        .join-input:disabled { color: #6B7280; cursor: default; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440, background: '#1c1b1b', borderRadius: 20, padding: 36 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.6rem', letterSpacing: '.2em', textTransform: 'uppercase', color: '#b22a27', marginBottom: 10 }}>
              SUNDARA<span style={{ color: '#e5e2e1' }}>FLOW</span>
            </div>
            <h1 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-.03em', color: '#e5e2e1', lineHeight: 1.1, marginBottom: 8 }}>
              Bienvenue, {clientData?.name} 👋
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '.82rem', color: '#9CA3AF', lineHeight: 1.65 }}>
              Créez votre mot de passe pour accéder à votre espace SundaraFlow.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(178,42,39,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: '.78rem', color: '#e3beb8', fontFamily: 'Inter, sans-serif', marginBottom: 18 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.55rem', letterSpacing: '.15em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>
                Email
              </label>
              <input type="email" value={clientData?.email} disabled className="join-input" />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.55rem', letterSpacing: '.15em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>
                Mot de passe *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
                className="join-input"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.55rem', letterSpacing: '.15em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>
                Confirmer le mot de passe *
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Répétez votre mot de passe"
                className="join-input"
                autoComplete="new-password"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: '100%', background: 'linear-gradient(135deg,#89070e,#b22a27)', border: 'none', borderRadius: 999, color: '#e5e2e1', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', padding: '14px', cursor: 'pointer', minHeight: 48, marginTop: 4, opacity: submitting ? .6 : 1, transition: 'opacity .2s, box-shadow .2s' }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                  Activation…
                </span>
              ) : 'ACCÉDER À MON ESPACE →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
