'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';

/* ── Helpers ── */
const TYPE_CONFIG: Record<string, { icon: string; badge: string; label: string; color: string }> = {
  nutrition: { icon: '🥗', badge: 'badge-green',  label: 'Nutrition', color: 'var(--green)'  },
  sport:     { icon: '🏋️', badge: 'badge-blue',   label: 'Sport',     color: 'var(--blue)'   },
  business:  { icon: '🧠', badge: 'badge-dim',    label: 'Business',  color: '#9CA3AF'       },
};

const formatDate = (ts: Timestamp | null | undefined): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* ════════════════════════════════════════
   CLIENT DASHBOARD
════════════════════════════════════════ */
export default function ClientDashboard() {
  const router = useRouter();

  /* ── State (identique à l'original + assignedAt) ── */
  const [user, setUser]                 = useState<import('firebase/auth').User | null>(null);
  const [assignments, setAssignments]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [lastDoc, setLastDoc]           = useState<any>(null);
  const [selectedType, setSelectedType] = useState('');
  const [hasMore, setHasMore]           = useState(false);

  const [mounted, setMounted] = useState(false);

  const PAGE_SIZE = 5; // identique à l'original

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  /* ── Auth (inchangé) ── */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => { if (u) setUser(u as any); });
    return () => unsub();
  }, []);

  /* ── Fetch assignments (logique inchangée + assignedAt récupéré) ── */
  const fetchAssignments = async (loadMore = false) => {
    if (!user) return;
    loadMore ? setLoadingMore(true) : setLoading(true);

    try {
      let q = query(
        collection(db, 'program_assignments'),
        where('clientId', '==', user.uid),
        orderBy('assignedAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const data: any[] = [];

      for (const docSnap of snapshot.docs) {
        const { programId, assignedAt } = docSnap.data();
        const programDoc = await getDoc(doc(db, 'programs', programId));
        if (programDoc.exists()) {
          // assignedAt ajouté sans casser la logique existante
          data.push({ id: docSnap.id, assignedAt, ...programDoc.data() });
        }
      }

      setAssignments(loadMore ? [...assignments, ...data] : data);
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastDoc(lastVisible);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error(error);
      fireToast('❌', 'Erreur', 'Impossible de charger les programmes.');
    }

    loadMore ? setLoadingMore(false) : setLoading(false);
  };

  useEffect(() => { if (user) fetchAssignments(); }, [user]);

  /* ── Filtre local (inchangé) ── */
  const filteredAssignments = assignments.filter(
    (p) => !selectedType || p.type === selectedType
  );

  /* ── Déconnexion ── */
  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <ProtectedRoute role="client">
      <>
        <Toast />
        <div
          style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse 65% 40% at 50% -5%, rgba(158,27,27,.07) 0%, transparent 55%), #121212',
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            /* ── Color token overrides — Kinetic Monolith system ── */
            ['--gold' as any]: '#9E1B1B', ['--gold-d' as any]: '#7a1212', ['--gold-glow' as any]: 'rgba(158,27,27,0.14)',
            ['--amber' as any]: '#9E1B1B', ['--blue' as any]: '#9E1B1B', ['--purple' as any]: '#9E1B1B',
            ['--green' as any]: '#16a34a', ['--red' as any]: '#dc2626',
            ['--k0' as any]: '#121212', ['--k2' as any]: '#1a1a1a', ['--k3' as any]: '#1e1e1e', ['--k4' as any]: '#252525',
            ['--wf' as any]: 'rgba(255,255,255,0.07)', ['--w' as any]: '#FFFFFF', ['--wd' as any]: '#9CA3AF',
            ['--fd' as any]: 'Lexend, sans-serif', ['--fb' as any]: 'Inter, sans-serif',
            ['--r' as any]: '6px', ['--rl' as any]: '12px', ['--rxl' as any]: '16px',
          }}
        >
          {/* ══ HEADER ══ */}
          <header
            style={{
              borderBottom: '1px solid var(--wf)',
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: 'rgba(6,6,6,.92)',
              backdropFilter: 'blur(20px)',
              position: 'sticky',
              top: 0,
              zIndex: 100,
            }}
          >
            <div style={{ fontFamily: 'Lexend, sans-serif', fontSize: '1.35rem', letterSpacing: '.04em', fontWeight: 700 }}>
              Sundara<span style={{ color: '#9E1B1B' }}>Flow</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: 'rgba(158,27,27,.2)', border: '1px solid rgba(158,27,27,.35)', borderRadius: '9999px', padding: '3px 10px', fontSize: '.65rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#f87171' }}>👤 Membre</span>
              <span style={{ fontSize: '.72rem', color: 'var(--wd)' }}>
                {(user as any)?.email}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Déconnexion
              </button>
            </div>
          </header>

          {/* ══ CONTENT ══ */}
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '0 24px 80px',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(16px)',
              transition: 'opacity .45s ease, transform .45s ease',
            }}
          >
            {/* ── KPI ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                margin: '28px 0 28px',
              }}
            >
              {[
                { icon: '📋', label: 'Programmes assignés', val: assignments.length },
                { icon: '🔍', label: 'Filtre actif', val: selectedType ? TYPE_CONFIG[selectedType]?.label : 'Tous' },
              ].map((k) => (
                <div className="kpi-card" key={k.label}>
                  <div className="kpi-label">{k.icon} {k.label}</div>
                  <div className="kpi-val" style={{ fontSize: '1.6rem' }}>{k.val}</div>
                </div>
              ))}
            </div>

            {/* ── TITRE ── */}
            <div style={{ marginBottom: 24 }}>
              <div className="tag">📚 Mes Programmes</div>
              <h1
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  marginBottom: 8,
                }}
              >
                Votre espace <span style={{ color: '#9E1B1B' }}>d&apos;entraînement.</span>
              </h1>
              <p style={{ fontSize: '.85rem', color: 'var(--wd)' }}>
                Programmes assignés par votre coach, mis à jour en temps réel.
              </p>
            </div>

            {/* ── FILTRES ── */}
            <div style={{ marginBottom: 24 }}>
              <div className="prog-seg">
                {[
                  { val: '',          label: 'Tous'         },
                  { val: 'nutrition', label: '🥗 Nutrition' },
                  { val: 'sport',     label: '🏋️ Sport'    },
                  { val: 'business',  label: '🧠 Business'  },
                ].map((f) => (
                  <button
                    key={f.val}
                    className={`seg-btn${selectedType === f.val ? ' active' : ''}`}
                    onClick={() => setSelectedType(f.val)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── LOADER INITIAL ── */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '2px solid var(--wf)',
                    borderTopColor: '#9E1B1B',
                    animation: 'spin .8s linear infinite',
                    margin: '0 auto 16px',
                  }}
                />
                <p style={{ fontSize: '.78rem', color: 'var(--wd)' }}>Chargement de vos programmes…</p>
              </div>
            )}

            {/* ── EMPTY STATE ── */}
            {!loading && filteredAssignments.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  background: 'var(--k2)',
                  border: '1px solid var(--wf)',
                  borderRadius: 'var(--rl)',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>
                  {selectedType ? TYPE_CONFIG[selectedType]?.icon : '📭'}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--fd)',
                    fontSize: '1.3rem',
                    fontWeight: 300,
                    marginBottom: 10,
                  }}
                >
                  {selectedType
                    ? `Aucun programme de type ${TYPE_CONFIG[selectedType]?.label}.`
                    : 'Aucun programme assigné pour le moment.'}
                </h3>
                <p style={{ fontSize: '.82rem', color: 'var(--wd)', lineHeight: 1.7 }}>
                  Votre coach vous assignera bientôt un programme personnalisé.<br />
                  {selectedType && (
                    <span
                      style={{ color: '#9E1B1B', cursor: 'pointer' }}
                      onClick={() => setSelectedType('')}
                    >
                      Voir tous les types →
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* ── PROGRAMME CARDS ── */}
            {!loading && filteredAssignments.length > 0 && (
              <div className="g3">
                {filteredAssignments.map((p, i) => {
                  const cfg = TYPE_CONFIG[p.type] || { icon: '📄', badge: 'badge-dim', label: p.type, color: 'var(--wd)' };
                  return (
                    <div
                      className="feat-card"
                      key={p.id}
                      style={{
                        animationDelay: `${i * 60}ms`,
                        animation: 'fadeUp .4s ease both',
                      }}
                    >
                      {/* Type badge + icon */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div className="feat-icon">{cfg.icon}</div>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>

                      {/* Titre */}
                      <h3
                        style={{
                          fontFamily: 'var(--fd)',
                          fontSize: '1.1rem',
                          fontWeight: 300,
                          marginBottom: 8,
                          lineHeight: 1.2,
                        }}
                      >
                        {p.title}
                      </h3>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: '.8rem',
                          color: 'var(--wd)',
                          lineHeight: 1.72,
                          marginBottom: 16,
                          minHeight: 44,
                        }}
                      >
                        {p.description || <em>Aucune description.</em>}
                      </p>

                      {/* Méta : coach + date */}
                      <div
                        style={{
                          borderTop: '1px solid var(--wf)',
                          paddingTop: 12,
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 6,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '.6rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 3 }}>
                            Coach
                          </div>
                          <div style={{ fontSize: '.78rem', fontWeight: 500 }}>
                            {p.coachName || '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '.6rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--wd)', marginBottom: 3 }}>
                            Assigné le
                          </div>
                          <div style={{ fontSize: '.78rem', color: '#9E1B1B' }}>
                            {formatDate(p.assignedAt) || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Préparation future : accès vidéos / PDF / nutrition */}
                      <div style={{ marginTop: 14 }}>
                        <button
                          className="btn btn-outline btn-xs btn"
                          style={{ width: '100%', opacity: .55, cursor: 'not-allowed' }}
                          title="Disponible prochainement"
                        >
                          📂 Accéder au contenu — Bientôt
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── LOAD MORE ── */}
            {hasMore && !loading && !selectedType && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  className="btn btn-outline"
                  onClick={() => fetchAssignments(true)}
                  disabled={loadingMore}
                  style={{ minWidth: 200, opacity: loadingMore ? .7 : 1 }}
                >
                  {loadingMore ? (
                    <>
                      <span style={{ display: 'inline-block', animation: 'spin .8s linear infinite' }}>⟳</span>
                      &nbsp;Chargement…
                    </>
                  ) : (
                    '+ Charger plus de programmes'
                  )}
                </button>
                <p style={{ fontSize: '.68rem', color: 'var(--wd)', marginTop: 8 }}>
                  {assignments.length} programme{assignments.length !== 1 ? 's' : ''} chargé{assignments.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Préparation structure future Stripe / Xendit */}
            {/* TODO: <StripePortal /> */}
            {/* TODO: <XenditCheckout /> */}
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
