// components/Sidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, getDocs, getDoc,
} from 'firebase/firestore';

interface SidebarProps {
  role: 'coach' | 'client';
  activeTab?: string;
  onNavTo?: (key: string) => void;
  onSignOut?: () => void;
}

export default function Sidebar({ role, onNavTo }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('');

  /* ── Auth + nom + badge non-lus ── */
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const authUnsub = auth.onAuthStateChanged(async (u) => {
      if (unsub) { unsub(); unsub = undefined; }
      if (!u) { setUnread(0); return; }

      // Récupérer le nom pour l'avatar mobile
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const d = snap.exists() ? snap.data() : {};
        setUserName(d.name || u.displayName || u.email?.split('@')[0] || '');
      } catch {
        setUserName(u.displayName || u.email?.split('@')[0] || '');
      }

      if (role === 'coach') {
        const q = query(
          collection(db, 'conversations'),
          where('coachId', '==', u.uid),
        );
        unsub = onSnapshot(q, (snap) => {
          const total = snap.docs.reduce(
            (acc, d) => acc + ((d.data().unreadCoach as number) || 0), 0,
          );
          setUnread(total);
        }, () => setUnread(0));
      } else {
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

    return () => { authUnsub(); if (unsub) unsub(); };
  }, [role]);

  /* ── Bloquer scroll quand menu ouvert ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ── Liens ── */
  const coachLinks = [
    { label: 'Tableau de bord', href: '/coach/home',     icon: '⊞' },
    { label: 'Membres',         href: '/coach/page',     icon: '👥' },
    { label: 'Programmes',      href: '/coach/programmes', icon: '📋' },
    { label: 'Nutrition',       href: '/coach/page',     icon: '🥗' },
    { label: 'Conseils',        href: '/coach/page',     icon: '💡' },
    { label: 'Statistiques',    href: '/coach/stats',    icon: '📊' },
    { label: 'Messages',        href: '/coach/messages', icon: '💬', badge: true },
  ];
  const clientLinks = [
    { label: 'Tableau de bord',  href: '/client/home',     icon: '⊞' },
    { label: 'Mes Programmes',   href: '/client/home',     icon: '📋', tab: 'programmes' },
    { label: 'Ma Nutrition',     href: '/client/home',     icon: '🥗', tab: 'nutrition' },
    { label: 'Mon Profil',       href: '/client/home',     icon: '👤', tab: 'profil' },
    { label: 'Mes Statistiques', href: '/client/home',     icon: '📊', tab: 'statistiques' },
    { label: 'Messages',         href: '/client/messages', icon: '💬', badge: true },
  ];

  const links = role === 'coach' ? coachLinks : clientLinks;
  const homeHref = role === 'coach' ? '/coach/home' : '/client/home';
  const initials = (userName.split(' ')[0] || userName).slice(0, 2).toUpperCase() || (role === 'coach' ? 'CO' : 'MB');

  const handleSignOut = async () => { await signOut(auth); router.push('/login'); };

  const NavLink = ({ label, href, icon, badge, tab }: {
    label: string; href: string; icon: string; badge?: boolean; tab?: string;
  }) => {
    const isActive = pathname === href || (badge && pathname?.startsWith(href));
    const showBadge = badge && unread > 0;
    const handleClick = () => {
      if (tab && onNavTo) {
        onNavTo(tab);
      } else {
        router.push(href);
      }
      setMobileOpen(false);
    };
    return (
      <div
        onClick={handleClick}
        style={{
          height: 48, minHeight: 48,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 12px', borderRadius: 8, cursor: 'pointer',
          borderLeft: isActive ? '2px solid #b22a27' : '2px solid transparent',
          background: isActive ? 'rgba(178,42,39,0.12)' : 'transparent',
          transition: 'all 0.15s ease', position: 'relative',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0, position: 'relative' }}>
          {icon}
          {showBadge && (
            <span style={{ position: 'absolute', top: -5, right: -6, minWidth: 16, height: 16, background: '#b22a27', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#fff', padding: '0 3px', lineHeight: 1 }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.85rem', color: isActive ? '#e5e2e1' : '#9CA3AF', whiteSpace: 'nowrap', flex: 1 }}>
          {label}
        </span>
        {showBadge && (
          <span style={{ background: '#b22a27', borderRadius: 10, padding: '2px 7px', fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ══════════════════════════════════════
          HEADER MOBILE UNIFIÉ
          Visible uniquement sur mobile (<768px)
          Remplace tous les headers custom des pages
      ══════════════════════════════════════ */}
      <header className="sb-mobile-header">
        <button
          className="sb-hamburger-btn"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        <div onClick={() => router.push(homeHref)} style={{ cursor: 'pointer' }}>
          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.95rem', letterSpacing: '.06em', textTransform: 'uppercase', color: '#e5e2e1' }}>
            SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
          </span>
        </div>

        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#89070e,#b22a27)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#e5e2e1', flexShrink: 0 }}>
          {initials}
        </div>
      </header>

      {/* Spacer — compense la hauteur du header fixed sur mobile */}
      <div className="sb-mobile-spacer" />

      {/* ── Overlay (rendu uniquement si ouvert) ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 149 }}
        />
      )}

      {/* ── Panneau sidebar ── */}
      <div
        id="sb-panel"
        className={mobileOpen ? 'sb-open' : ''}
        style={{ position: 'fixed', top: 0, left: 0, width: 240, height: '100vh', background: '#1a1a1a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', zIndex: 150, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {/* Logo (visible desktop + dans la sidebar mobile ouverte) */}
        <div
          onClick={() => { router.push(homeHref); setMobileOpen(false); }}
          style={{ height: 64, minHeight: 64, maxHeight: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', flexShrink: 0 }}
        >
          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1rem', letterSpacing: '.06em', color: '#e5e2e1', textTransform: 'uppercase', userSelect: 'none' }}>
            SUNDARA<span style={{ color: '#b22a27' }}>FLOW</span>
          </span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {links.map(link => <NavLink key={link.href + link.label} {...link} />)}
        </div>

        {/* Déconnexion */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px', flexShrink: 0 }}>
          <div
            onClick={handleSignOut}
            style={{ height: 44, display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', borderRadius: 8, cursor: 'pointer', color: '#6B7280', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 500, transition: 'color .15s, background .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = '#f87171'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(248,113,113,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = '#6B7280'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <span>→</span><span>Déconnexion</span>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@900&family=Inter:wght@400;500&display=swap');

        /* Header mobile — fixed, hors du flux flex */
        .sb-mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 200;
          height: 56px;
          min-height: 56px;
          padding: 0 16px;
          background: #1c1b1b;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
        }

        /* Bouton hamburger */
        .sb-hamburger-btn {
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: #e5e2e1;
          cursor: pointer;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        /* Spacer pour compenser le header fixed sur mobile */
        .sb-mobile-spacer {
          display: none;
          height: 56px;
          min-height: 56px;
          flex-shrink: 0;
          width: 100%;
        }

        @media (max-width: 767px) {
          .sb-mobile-header { display: flex; }
          .sb-mobile-spacer { display: block; }
          #sb-panel {
            transform: translateX(-100%);
            transition: transform .28s cubic-bezier(.4,0,.2,1);
          }
          #sb-panel.sb-open { transform: translateX(0); }
          /* Tout contenu principal doit être décalé de 56px */
          .page-main, .cl-main, .ch-main, .cp-main, .stp-main {
            padding-top: 56px;
          }
        }

        @media (min-width: 768px) {
          .sb-mobile-header { display: none !important; }
          .sb-mobile-spacer { display: none !important; }
          #sb-panel { transform: none !important; }
        }
      `}</style>
    </>
  );
}
