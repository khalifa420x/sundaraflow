// components/Sidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, getDocs,
} from 'firebase/firestore';

interface SidebarProps {
  role: 'coach' | 'client';
  /* Props legacy (ignorées — gérées en interne) */
  activeTab?: string;
  onNavTo?: (key: string) => void;
  onSignOut?: () => void;
}

export default function Sidebar({ role }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Badge non-lus en temps réel ── */
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const authUnsub = auth.onAuthStateChanged(async (u) => {
      if (unsub) { unsub(); unsub = undefined; }
      if (!u) { setUnread(0); return; }

      if (role === 'coach') {
        /* Coach : somme de unreadCoach sur toutes ses conversations */
        const q = query(
          collection(db, 'conversations'),
          where('coachId', '==', u.uid),
        );
        unsub = onSnapshot(q, (snap) => {
          const total = snap.docs.reduce(
            (acc, d) => acc + ((d.data().unreadCoach as number) || 0),
            0,
          );
          setUnread(total);
        }, () => setUnread(0));
      } else {
        /* Client : trouver sa conversation via la collection clients */
        try {
          const cSnap = await getDocs(
            query(collection(db, 'clients'), where('clientUserId', '==', u.uid)),
          );
          if (cSnap.empty) { setUnread(0); return; }
          const coachId = cSnap.docs[0].data().coachId as string;
          const convId = `${coachId}_${u.uid}`;

          unsub = onSnapshot(doc(db, 'conversations', convId), (d) => {
            setUnread(d.exists() ? ((d.data()?.unreadClient as number) || 0) : 0);
          }, () => setUnread(0));
        } catch {
          setUnread(0);
        }
      }
    });

    return () => {
      authUnsub();
      if (unsub) unsub();
    };
  }, [role]);

  /* ── Liens de navigation ── */
  const coachLinks = [
    { label: 'Tableau de bord', href: '/coach/home',     icon: '⊞' },
    { label: 'Membres',         href: '/coach/page',     icon: '👥' },
    { label: 'Programmes',      href: '/coach/page',     icon: '📋' },
    { label: 'Nutrition',       href: '/coach/page',     icon: '🥗' },
    { label: 'Conseils',        href: '/coach/page',     icon: '💡' },
    { label: 'Statistiques',    href: '/coach/page',     icon: '📊' },
    { label: 'Messages',        href: '/coach/messages', icon: '💬', badge: true },
  ];

  const clientLinks = [
    { label: 'Tableau de bord', href: '/client/home',     icon: '⊞' },
    { label: 'Mes Programmes',  href: '/client',          icon: '📋' },
    { label: 'Ma Nutrition',    href: '/client',          icon: '🥗' },
    { label: 'Mon Profil',      href: '/client',          icon: '👤' },
    { label: 'Mes Statistiques',href: '/client',          icon: '📊' },
    { label: 'Messages',        href: '/client/messages', icon: '💬', badge: true },
  ];

  const links = role === 'coach' ? coachLinks : clientLinks;
  const homeHref = role === 'coach' ? '/coach/home' : '/client/home';

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const NavLink = ({
    label, href, icon, badge,
  }: { label: string; href: string; icon: string; badge?: boolean }) => {
    const isActive = pathname === href || (badge && pathname?.startsWith(href));
    const showBadge = badge && unread > 0;

    return (
      <div
        onClick={() => router.push(href)}
        style={{
          height: 48,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 12px',
          borderRadius: 8,
          cursor: 'pointer',
          borderLeft: isActive ? '2px solid #b22a27' : '2px solid transparent',
          background: isActive ? 'rgba(178,42,39,0.12)' : 'transparent',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!isActive)
            (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
        }}
        onMouseLeave={e => {
          if (!isActive)
            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0, position: 'relative' }}>
          {icon}
          {showBadge && (
            <span style={{
              position: 'absolute',
              top: -5,
              right: -6,
              minWidth: 16,
              height: 16,
              background: '#b22a27',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '.52rem',
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 700,
              color: '#fff',
              padding: '0 3px',
              lineHeight: 1,
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '0.85rem',
          color: isActive ? '#e5e2e1' : '#9CA3AF',
          letterSpacing: '.01em',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {label}
        </span>
        {showBadge && (
          <span style={{
            background: '#b22a27',
            borderRadius: 10,
            padding: '2px 7px',
            fontSize: '.52rem',
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── Hamburger mobile (fixed) ── */}
      <button
        className="sb-hamburger"
        onClick={() => setMobileOpen(o => !o)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 14,
          left: 14,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          color: '#e5e2e1',
          cursor: 'pointer',
          zIndex: 60,
          fontSize: '1.2rem',
        }}
      >
        ☰
      </button>

      {/* ── Overlay mobile ── */}
      <div
        className={`sb-overlay${mobileOpen ? ' sb-visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 49,
        }}
      />

      {/* ── Panneau sidebar ── */}
      <div
        id="sb-panel"
        className={mobileOpen ? 'sb-open' : ''}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 240,
          height: '100vh',
          background: '#1a1a1a',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* LOGO — hauteur fixe isolée */}
        <div
          onClick={() => router.push(homeHref)}
          style={{
            height: 64,
            minHeight: 64,
            maxHeight: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontFamily: 'Lexend, sans-serif',
            fontWeight: 900,
            fontSize: '1rem',
            letterSpacing: '.06em',
            color: '#e5e2e1',
            textTransform: 'uppercase',
            userSelect: 'none',
          }}>
            SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
          </span>
        </div>

        {/* NAV — commence strictement après le logo */}
        <div style={{
          flex: 1,
          padding: '12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginTop: 0,
          overflowY: 'auto',
        }}>
          {links.map(link => (
            <NavLink key={link.href + link.label} {...link} />
          ))}
        </div>

        {/* BAS SIDEBAR */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flexShrink: 0,
        }}>
          <div
            onClick={handleSignOut}
            style={{
              height: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 12px',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#6B7280',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'color .15s, background .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.color = '#f87171';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(248,113,113,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.color = '#6B7280';
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <span>→</span>
            <span>Déconnexion</span>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@900&family=Inter:wght@400;500&display=swap');

        @media (max-width: 767px) {
          .sb-hamburger { display: flex !important; }
          #sb-panel { transform: translateX(-100%); transition: transform .28s cubic-bezier(.4,0,.2,1); }
          #sb-panel.sb-open { transform: translateX(0); }
          .sb-overlay { display: block !important; pointer-events: none; }
          #sb-panel.sb-open ~ .sb-overlay,
          .sb-overlay.sb-visible { pointer-events: auto; }
        }
        @media (min-width: 768px) {
          .sb-hamburger { display: none !important; }
          #sb-panel { transform: none !important; }
        }
      `}</style>
    </>
  );
}
