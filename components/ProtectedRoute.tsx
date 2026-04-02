'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: string;
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  /* ── Auth guard (logique inchangée) ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) { router.push('/login'); return; }

      const userRole = docSnap.data().role;
      if (role && userRole !== role) { router.push('/login'); return; }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, role]);

  /* ── Loader premium (même fond que le Hero) ── */
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(201,168,76,.1) 0%, transparent 60%), var(--k0)',
          color: 'var(--w)',
        }}
      >
        {/* Spinner doré */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid var(--wf)',
            borderTopColor: 'var(--gold)',
            animation: 'spin .8s linear infinite',
          }}
        />
        <div
          style={{
            fontFamily: 'var(--fd)',
            fontSize: '1.5rem',
            letterSpacing: '.04em',
          }}
        >
          Sundara<span style={{ color: 'var(--gold)' }}>Flow</span>
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--wd)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Vérification en cours…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
