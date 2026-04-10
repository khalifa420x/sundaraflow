'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { UserRole } from '@/types/models';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    // Ne jamais rediriger pendant le chargement
    if (loading) return;

    if (!user) {
      console.log('[AuthGuard] No user — redirect to /login');
      router.replace('/login');
      return;
    }

    if (user.role !== requiredRole) {
      console.log(`[AuthGuard] Wrong role: ${user.role} vs ${requiredRole}`);
      router.replace(user.role === 'coach' ? '/coach/home' : '/client/home');
    }
  }, [user, loading, requiredRole, router]);

  // Pendant chargement → spinner
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(178,42,39,.08) 0%, transparent 60%), #131313',
        color: '#e5e2e1',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.07)',
          borderTopColor: '#b22a27',
          animation: 'spin .8s linear infinite',
        }} />
        <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.5rem', letterSpacing: '.04em', fontWeight: 900 }}>
          SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
        </div>
        <p style={{ fontSize: '.75rem', color: '#9CA3AF', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Vérification en cours…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Pas de user ou mauvais rôle → null pendant redirection
  if (!user || user.role !== requiredRole) return null;

  return <>{children}</>;
}
