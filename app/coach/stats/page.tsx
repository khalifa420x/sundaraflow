'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, getDocs, doc, getDoc,
} from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';

/* ══════════════════════════
   TYPES
══════════════════════════ */
interface Completion {
  id: string;
  clientId: string;
  coachId: string;
  programId: string;
  assignmentId: string;
  sessionIndex: number;
  exerciseName: string;
  completedAt: any;
  sets: number;
  reps: string;
}
interface Client {
  id: string;
  name: string;
  clientUserId: string;
  initials: string;
  color: string;
}
interface Assignment {
  id: string;
  clientId: string;
  programId: string;
  programTitle: string;
  status: string;
  sessions: any[];
}

type Period = '7J' | '30J' | 'ALL';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#9E1B1B,#b91c1c)',
  'linear-gradient(135deg,#7a1212,#9E1B1B)',
  'linear-gradient(135deg,#374151,#4B5563)',
  'linear-gradient(135deg,#1e3a5f,#2563eb)',
  'linear-gradient(135deg,#064e3b,#059669)',
];

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/* ══════════════════════════
   HELPERS
══════════════════════════ */
const filterByPeriod = (completions: Completion[], period: Period): Completion[] => {
  const now = new Date();
  return completions.filter(c => {
    const date = c.completedAt?.toDate?.() || new Date(0);
    if (period === '7J') return (now.getTime() - date.getTime()) <= 7 * 86400000;
    if (period === '30J') return (now.getTime() - date.getTime()) <= 30 * 86400000;
    return true;
  });
};

const getClientCompletions = (clientId: string, completions: Completion[]) =>
  completions.filter(c => c.clientId === clientId);

const getTotalExercises = (assignments: Assignment[], clientId?: string): number => {
  const relevant = clientId ? assignments.filter(a => a.clientId === clientId) : assignments;
  return relevant.reduce((acc, a) =>
    acc + (a.sessions?.reduce((s: number, sess: any) =>
      s + (sess.exercises?.length || 0), 0) || 0), 0);
};

const getCompletionRate = (done: number, total: number): number =>
  total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

const getActiveDays = (completions: Completion[]): number => {
  const days = new Set(
    completions.map(c => c.completedAt?.toDate?.()?.toDateString?.() || '').filter(Boolean),
  );
  return days.size;
};

const getWeeklyData = (completions: Completion[]): { label: string; val: number }[] => {
  const weeks: Record<string, number> = {};
  completions.forEach(c => {
    const date = c.completedAt?.toDate?.();
    if (!date) return;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    weeks[key] = (weeks[key] || 0) + 1;
  });
  return Object.entries(weeks).slice(-7).map(([label, val]) => ({ label, val }));
};

const getMuscleDistribution = (completions: Completion[], assignments: Assignment[]) => {
  const muscles: Record<string, number> = {};
  completions.forEach(c => {
    const assignment = assignments.find(a => a.id === c.assignmentId);
    if (!assignment) return;
    const session = assignment.sessions?.[c.sessionIndex];
    const exercise = session?.exercises?.find((e: any) => e.name === c.exerciseName);
    const muscle = exercise?.primary_muscle || 'Autre';
    muscles[muscle] = (muscles[muscle] || 0) + 1;
  });
  const total = Object.values(muscles).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(muscles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, val]) => ({ label, val, pct: Math.round((val / total) * 100) }));
};

/* ══════════════════════════
   PAGE
══════════════════════════ */
export default function CoachStatsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30J');
  const [loading, setLoading] = useState(true);

  /* Auth */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => { if (u) setUid(u.uid); });
    return () => unsub();
  }, []);

  /* Clients */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'clients'), where('coachId', '==', uid)));
        const list: Client[] = [];
        let ci = 0;
        for (const d of snap.docs) {
          const data = d.data() as any;
          let name = data.name || 'Client';
          if (data.clientUserId) {
            try {
              const us = await getDoc(doc(db, 'users', data.clientUserId));
              if (us.exists()) {
                const ud = us.data() as any;
                name = ud.name || ud.displayName || ud.email?.split('@')[0] || name;
              }
            } catch { /* keep default */ }
          }
          list.push({
            id: d.id,
            name,
            clientUserId: data.clientUserId || d.id,
            initials: initials(name),
            color: AVATAR_COLORS[ci % AVATAR_COLORS.length],
          });
          ci++;
        }
        setClients(list);
      } catch (e) { console.error('[stats:clients]', e); }
    })();
  }, [uid]);

  /* Assignments + programs */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'program_assignments'),
          where('coachId', '==', uid),
          where('status', '==', 'active'),
        ));
        const list: Assignment[] = [];
        for (const d of snap.docs) {
          const data = d.data() as any;
          let sessions: any[] = [];
          let title = '';
          if (data.programId) {
            try {
              const p = await getDoc(doc(db, 'programs', data.programId));
              if (p.exists()) {
                const pd = p.data() as any;
                title = pd.title || '';
                sessions = pd.sessions || [];
              }
            } catch { /* keep empty */ }
          }
          list.push({
            id: d.id,
            clientId: data.clientId,
            programId: data.programId,
            programTitle: title,
            status: data.status,
            sessions,
          });
        }
        setAssignments(list);
      } catch (e) { console.error('[stats:assignments]', e); }
    })();
  }, [uid]);

  /* Completions realtime */
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'exercise_completions'), where('coachId', '==', uid)),
      snap => {
        setCompletions(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      err => { console.error('[stats:completions]', err); setLoading(false); },
    );
    return () => unsub();
  }, [uid]);

  /* Computed */
  const filtered = useMemo(() => {
    const base = selectedClientId
      ? getClientCompletions(selectedClientId, completions)
      : completions;
    return filterByPeriod(base, period);
  }, [completions, selectedClientId, period]);

  const filteredAssignments = useMemo(() =>
    selectedClientId
      ? assignments.filter(a => a.clientId === selectedClientId)
      : assignments,
  [assignments, selectedClientId]);

  const totalEx = getTotalExercises(filteredAssignments);
  const rate = getCompletionRate(filtered.length, totalEx);
  const activeDays = getActiveDays(filtered);
  const activeClients = new Set(filtered.map(c => c.clientId)).size;
  const weeklyData = useMemo(() => getWeeklyData(filtered), [filtered]);
  const maxWeek = Math.max(1, ...weeklyData.map(d => d.val));
  const muscleData = useMemo(() => getMuscleDistribution(filtered, filteredAssignments), [filtered, filteredAssignments]);
  const selName = selectedClientId
    ? (clients.find(c => c.clientUserId === selectedClientId)?.name || 'Client')
    : 'Équipe';

  /* Last activity map */
  const lastActivityMap = useMemo(() => {
    const map = new Map<string, number>();
    completions.forEach(c => {
      const t = c.completedAt?.toDate ? c.completedAt.toDate().getTime() : 0;
      if (t > (map.get(c.clientId) || 0)) map.set(c.clientId, t);
    });
    return map;
  }, [completions]);

  const insightText = filtered.length === 0
    ? 'Aucune activité enregistrée sur cette période. Relancez ce client pour reprendre le suivi.'
    : rate >= 80
    ? `Excellente assiduité à ${rate}%. Augmentez progressivement l'intensité pour maximiser la progression.`
    : rate >= 50
    ? `Bonne progression à ${rate}%. Encouragez la régularité — la constance est la clé des résultats.`
    : `Activité faible à ${rate}%. Identifiez les obstacles et proposez un ajustement du programme.`;

  return (
    <ProtectedRoute role="coach">
      <div style={{ display: 'flex', minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
        <Sidebar role="coach" />

        <main style={{ flex: 1, marginLeft: 240, padding: '36px 32px 80px', minWidth: 0 }} className="stm">

          {/* ══ HERO ══ */}
          <header style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 40 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <p style={{ fontSize: '.58rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                  📊 ANALYTICS
                </p>
                <h1 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2.8rem,7vw,5.5rem)', letterSpacing: '-.05em', lineHeight: .88, textTransform: 'uppercase', margin: 0, color: '#e5e2e1' }}>
                  SUIVI <span style={{ color: '#b22a27' }}>PERFORMANCES.</span>
                </h1>
                <p style={{ color: '#6B7280', fontSize: '.85rem', margin: '12px 0 0', maxWidth: 520 }}>
                  Métriques synthétisées et suivi biométrique de votre équipe en temps réel.
                </p>
              </div>
              {/* Period pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', background: '#1c1b1b', padding: 4, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {(['7J', '30J', 'ALL'] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                      padding: '8px 22px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                      fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.62rem',
                      letterSpacing: '.1em', textTransform: 'uppercase',
                      background: period === p ? '#353534' : 'transparent',
                      color: period === p ? '#b22a27' : '#9CA3AF',
                      transition: 'all .15s',
                    }}>
                      {p === 'ALL' ? 'ALL TIME' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* ══ CLIENT PILLS ══ */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 32, scrollbarWidth: 'none' }}>
            {[{ id: null as string | null, name: 'ÉQUIPE', ini: '⊞', color: '' },
              ...clients.map(c => ({ id: c.clientUserId, name: c.name, ini: c.initials, color: c.color })),
            ].map(item => {
              const active = selectedClientId === item.id;
              return (
                <button key={item.id || 'all'} onClick={() => setSelectedClientId(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 9999, flexShrink: 0, cursor: 'pointer',
                  border: active ? '1px solid #b22a27' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(178,42,39,0.12)' : '#1c1b1b',
                  color: active ? '#b22a27' : '#e5e2e1',
                  fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem',
                  letterSpacing: '.06em', textTransform: 'uppercase', transition: 'all .15s',
                }}>
                  {item.id && (
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem', color: '#fff', flexShrink: 0 }}>
                      {item.ini}
                    </span>
                  )}
                  {!item.id && <span style={{ fontSize: '.8rem' }}>⊞</span>}
                  {item.name}
                </button>
              );
            })}
          </div>

          {/* ══ BENTO MAIN GRID ══ */}
          <div className="stm-bento" style={{ display: 'grid', gap: 20, marginBottom: 20 }}>

            {/* ── CHART CARD (col-span-8) ── */}
            <div style={{ background: '#1c1b1b', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minHeight: 360 }}>
              <div style={{ padding: '28px 28px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 6px' }}>ACTIVITÉ HEBDOMADAIRE</p>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#e5e2e1', lineHeight: 1, letterSpacing: '-.04em' }}>
                    {filtered.length} <span style={{ fontSize: '.75rem', fontWeight: 500, color: '#9CA3AF' }}>exercices / période</span>
                  </div>
                </div>
                {rate > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(178,42,39,0.12)', border: '1px solid rgba(178,42,39,0.25)', borderRadius: 9999 }}>
                    <span style={{ fontSize: '.78rem' }}>↗</span>
                    <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.62rem', color: '#b22a27' }}>{rate}% assiduité</span>
                  </div>
                )}
              </div>

              {/* SVG area chart */}
              <div style={{ flex: 1, padding: '0 28px 28px', overflowX: 'auto' }}>
                {weeklyData.length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '.78rem' }}>Aucune activité sur cette période.</div>
                ) : (
                  <div style={{ position: 'relative', width: '100%', minWidth: 340, height: 220 }}>
                    <svg viewBox="0 0 700 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#b22a27" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#89070e" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const pts = weeklyData;
                        const n = pts.length;
                        if (n < 2) return null;
                        const xs = pts.map((_, i) => (i / (n - 1)) * 680 + 10);
                        const ys = pts.map(d => 160 - (d.val / maxWeek) * 130);
                        const area = `M${xs[0]},${ys[0]} ` +
                          xs.slice(1).map((x, i) => `Q${(xs[i] + x) / 2},${(ys[i] + ys[i + 1]) / 2} ${x},${ys[i + 1]}`).join(' ') +
                          ` V180 H10 Z`;
                        const line = `M${xs[0]},${ys[0]} ` +
                          xs.slice(1).map((x, i) => `Q${(xs[i] + x) / 2},${(ys[i] + ys[i + 1]) / 2} ${x},${ys[i + 1]}`).join(' ');
                        const topIdx = pts.reduce((best, d, i) => d.val > pts[best].val ? i : best, 0);
                        return (
                          <>
                            <path d={area} fill="url(#areaGrad)" />
                            <path d={line} fill="none" stroke="#b22a27" strokeWidth="3" strokeLinecap="round" />
                            {/* Peak dot */}
                            <circle cx={xs[topIdx]} cy={ys[topIdx]} r="6" fill="#b22a27" />
                            <circle cx={xs[topIdx]} cy={ys[topIdx]} r="10" fill="rgba(178,42,39,0.25)" />
                            {/* Week labels */}
                            {pts.map((d, i) => (
                              <text key={i} x={xs[i]} y="196" textAnchor="middle" fontSize="9" fill="#6B7280" fontFamily="Lexend" fontWeight="600">
                                {d.label}
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* ── KPI CARDS COLUMN (col-span-4) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card 1 — Exercices complétés */}
              <div style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(178,42,39,0.15)', border: '1px solid rgba(178,42,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✓</div>
                </div>
                <div>
                  <p style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>EXERCICES COMPLÉTÉS</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2.2rem,4vw,3rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>{filtered.length}</span>
                  </div>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, totalEx > 0 ? (filtered.length / totalEx) * 100 : 0)}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1s ease' }} />
                </div>
              </div>

              {/* Card 2 — Jours actifs / clients actifs */}
              <div style={{ background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(178,42,39,0.15)', border: '1px solid rgba(178,42,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {selectedClientId ? '🔥' : '👥'}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                    {selectedClientId ? 'JOURS ACTIFS' : 'CLIENTS ACTIFS'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(2.2rem,4vw,3rem)', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>
                      {selectedClientId ? activeDays : activeClients}
                    </span>
                    <span style={{ fontSize: '.7rem', color: '#9CA3AF', fontWeight: 500 }}>
                      {selectedClientId ? '/ période' : `/ ${clients.length}`}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '.8rem', color: '#16a34a' }}>↑</span>
                  <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.62rem', color: '#16a34a' }}>
                    {rate >= 70 ? '+' + rate + '% optimal' : rate + '% assiduité'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ SECOND ROW ══ */}
          <div className="stm-row2" style={{ display: 'grid', gap: 20, marginBottom: 20 }}>

            {/* ── Muscle distribution (col-span-5) ── */}
            <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <p style={{ fontSize: '.58rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 }}>DISTRIBUTION MUSCULAIRE</p>
                <span style={{ fontSize: '.78rem', color: '#6B7280' }}>ℹ</span>
              </div>
              {muscleData.length === 0 ? (
                <div style={{ color: '#6B7280', fontSize: '.78rem', padding: '20px 0' }}>Pas encore de données musculaires.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {muscleData.map(m => (
                    <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.65rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                        <span style={{ color: '#e5e2e1' }}>{m.label}</span>
                        <span style={{ color: '#b22a27' }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 10, background: '#353534', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${m.pct}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Insight / Activity card (col-span-7) ── */}
            <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, position: 'relative', overflow: 'hidden', minHeight: 280 }}>
              {/* BG image */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: .15 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1c1b1b 40%, rgba(28,27,27,0.7) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 1, padding: '32px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(178,42,39,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(178,42,39,0.35)', borderRadius: 9999, alignSelf: 'flex-start' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b22a27' }} />
                  <span style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                    ANALYSE · {selName.toUpperCase()}
                  </span>
                </div>
                <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', color: '#e5e2e1', lineHeight: 1.15, margin: 0, letterSpacing: '-.02em' }}>
                  {rate >= 80
                    ? 'Pic de performance atteint.'
                    : rate >= 50
                    ? 'Progression en cours.'
                    : 'Reprise à planifier.'}
                </h3>
                <p style={{ color: '#9CA3AF', fontSize: '.82rem', lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
                  {insightText}
                </p>
                {selectedClientId && (
                  <button
                    onClick={() => setSelectedClientId(null)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase', color: '#b22a27', padding: 0, marginTop: 4 }}
                  >
                    ← VOIR L'ÉQUIPE
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ══ BOTTOM STATS — Last activity ══ */}
          <div className="stm-bottom" style={{ display: 'grid', gap: 20 }}>
            {clients.length === 0 ? (
              <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '32px', textAlign: 'center', color: '#6B7280', fontSize: '.82rem' }}>
                Aucun client assigné.
              </div>
            ) : (
              clients
                .map(cl => {
                  const ts = lastActivityMap.get(cl.clientUserId) || 0;
                  const clComps = filterByPeriod(getClientCompletions(cl.clientUserId, completions), period);
                  const clTotal = getTotalExercises(assignments.filter(a => a.clientId === cl.clientUserId));
                  const clRate = getCompletionRate(clComps.length, clTotal);
                  const isRecent = ts > 0 && Date.now() - ts < 7 * 86400000;
                  return { ...cl, ts, clRate, clComps: clComps.length, isRecent };
                })
                .sort((a, b) => b.ts - a.ts)
                .map(cl => (
                  <div
                    key={cl.id}
                    onClick={() => setSelectedClientId(selectedClientId === cl.clientUserId ? null : cl.clientUserId)}
                    style={{
                      background: selectedClientId === cl.clientUserId ? 'rgba(178,42,39,0.08)' : '#1c1b1b',
                      border: `1px solid ${selectedClientId === cl.clientUserId ? 'rgba(178,42,39,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      borderLeft: `3px solid ${cl.isRecent ? '#b22a27' : 'rgba(178,42,39,0.15)'}`,
                      borderRadius: 14, padding: '18px 22px',
                      display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                      transition: 'all .2s', flexWrap: 'wrap',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: cl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.62rem', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {cl.initials}
                    </div>
                    {/* Name + last activity */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', color: '#e5e2e1', marginBottom: 3 }}>{cl.name}</div>
                      <div style={{ fontSize: '.65rem', color: '#9CA3AF' }}>
                        {cl.ts > 0 ? 'Dernier : ' + new Date(cl.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Aucune activité'}
                      </div>
                    </div>
                    {/* Rate */}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: '#e5e2e1', lineHeight: 1, letterSpacing: '-.03em' }}>{cl.clRate}%</div>
                      <div style={{ fontSize: '.52rem', color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 3 }}>assiduité</div>
                    </div>
                    {/* Badge */}
                    <div style={{
                      padding: '5px 12px', borderRadius: 9999, flexShrink: 0,
                      background: cl.isRecent ? 'rgba(22,163,74,0.12)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${cl.isRecent ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700,
                      color: cl.isRecent ? '#16a34a' : '#6B7280', letterSpacing: '.1em', textTransform: 'uppercase',
                    }}>
                      {cl.isRecent ? 'ACTIF' : 'INACTIF'}
                    </div>
                  </div>
                ))
            )}
          </div>

          {loading && (
            <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, fontSize: '.72rem', color: '#9CA3AF' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite' }} />
              Chargement…
            </div>
          )}
        </main>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes spin { to { transform: rotate(360deg); } }
          /* Bento: default mobile */
          .stm-bento { grid-template-columns: 1fr; }
          .stm-row2  { grid-template-columns: 1fr; }
          .stm-bottom{ grid-template-columns: 1fr; }
          /* ≥900px : reference bento layout */
          @media (min-width: 900px) {
            .stm-bento  { grid-template-columns: 2fr 1fr; }
            .stm-row2   { grid-template-columns: 5fr 7fr; }
            .stm-bottom { grid-template-columns: repeat(2,1fr); }
          }
          @media (min-width: 1200px) {
            .stm-bottom { grid-template-columns: repeat(3,1fr); }
          }
          /* Mobile */
          @media (max-width: 767px) {
            .stm { margin-left: 0 !important; padding: 20px 14px 100px !important; }
          }
          /* Hide scrollbar on pills */
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
