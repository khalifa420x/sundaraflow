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

const mkInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/* ══════════════════════════
   HELPERS  (logique intacte)
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

const getTotalExercises = (assignments: Assignment[]): number =>
  assignments.reduce((acc, a) =>
    acc + (a.sessions?.reduce((s: number, sess: any) =>
      s + (sess.exercises?.length || 0), 0) || 0), 0);

const getCompletionRate = (done: number, total: number): number =>
  total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

const getActiveDays = (completions: Completion[]): number =>
  new Set(completions.map(c => c.completedAt?.toDate?.()?.toDateString?.() || '').filter(Boolean)).size;

const getWeeklyData = (completions: Completion[]): { label: string; val: number }[] => {
  const weeks: Record<string, number> = {};
  completions.forEach(c => {
    const date = c.completedAt?.toDate?.();
    if (!date) return;
    const ws = new Date(date); ws.setDate(date.getDate() - date.getDay());
    const key = ws.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
    .sort((a, b) => b[1] - a[1]).slice(0, 4)
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
  const [isMobile, setIsMobile] = useState(false);

  /* Mobile detection */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
            id: d.id, name,
            clientUserId: data.clientUserId || d.id,
            initials: mkInitials(name),
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
          let sessions: any[] = []; let title = '';
          if (data.programId) {
            try {
              const p = await getDoc(doc(db, 'programs', data.programId));
              if (p.exists()) { const pd = p.data() as any; title = pd.title || ''; sessions = pd.sessions || []; }
            } catch { /* keep empty */ }
          }
          list.push({ id: d.id, clientId: data.clientId, programId: data.programId, programTitle: title, status: data.status, sessions });
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
      snap => { setCompletions(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))); setLoading(false); },
      err => { console.error('[stats:completions]', err); setLoading(false); },
    );
    return () => unsub();
  }, [uid]);

  /* ── Computed ─────────────────────────────────────────
     filteredCompletions = toutes les completions filtrées par période
     displayCompletions  = filtrées par période ET par client sélectionné
     → utilisé PARTOUT dans les calculs et le JSX
  ─────────────────────────────────────────────────────── */
  const filteredCompletions = useMemo(
    () => filterByPeriod(completions, period),
    [completions, period],
  );

  const displayCompletions = useMemo(
    () => selectedClientId
      ? filteredCompletions.filter(c => c.clientId === selectedClientId)
      : filteredCompletions,
    [filteredCompletions, selectedClientId],
  );

  const displayAssignments = useMemo(
    () => selectedClientId
      ? assignments.filter(a => a.clientId === selectedClientId)
      : assignments,
    [assignments, selectedClientId],
  );

  /* KPIs — tous calculés depuis displayCompletions */
  const totalEx       = getTotalExercises(displayAssignments);
  const rate          = getCompletionRate(displayCompletions.length, totalEx);
  const activeDays    = getActiveDays(displayCompletions);
  const activeClients = new Set(displayCompletions.map(c => c.clientId)).size;
  const activeClients7d = useMemo(
    () => new Set(filterByPeriod(completions, '7J').map(c => c.clientId)).size,
    [completions],
  );

  const weeklyData = useMemo(() => getWeeklyData(displayCompletions), [displayCompletions]);
  const muscleData = useMemo(() => getMuscleDistribution(displayCompletions, displayAssignments), [displayCompletions, displayAssignments]);

  const selName = selectedClientId
    ? (clients.find(c => c.clientUserId === selectedClientId)?.name || 'Client')
    : 'Équipe';

  /* Last activity map (always from all completions, for the client list) */
  const lastActivityMap = useMemo(() => {
    const map = new Map<string, number>();
    completions.forEach(c => {
      const t = c.completedAt?.toDate ? c.completedAt.toDate().getTime() : 0;
      if (t > (map.get(c.clientId) || 0)) map.set(c.clientId, t);
    });
    return map;
  }, [completions]);

  /* Insight */
  const insightTitle = displayCompletions.length === 0
    ? 'Démarrage en attente.'
    : rate >= 80 ? 'Performance Élite.'
    : rate >= 50 ? 'Progression Solide.'
    : 'Reprise à planifier.';
  const insightDesc = displayCompletions.length === 0
    ? `Aucune activité enregistrée pour ${selName}. Relancez ce client pour reprendre le suivi.`
    : rate >= 80
    ? `${selName} maintient une assiduité de ${rate}%. Volume optimal atteint — envisagez une montée en intensité progressive.`
    : rate >= 50
    ? `${selName} progresse à ${rate}% d'assiduité. Encouragez la régularité hebdomadaire pour débloquer la phase de progression.`
    : `Assiduité à ${rate}% pour ${selName}. Identifiez les obstacles et proposez un ajustement du volume ou du rythme.`;

  /* ── SVG chart ── */
  const singlePoint = weeklyData.length === 1;
  const chartData = weeklyData.length >= 2 ? weeklyData
    : weeklyData.length === 1 ? weeklyData  // handled separately below
    : Array.from({ length: 4 }, (_, i) => ({ label: `SEM ${i + 1}`, val: 0 }));

  const maxVal = Math.max(...chartData.map(w => w.val), 1);
  const pts = chartData.map((w, i) => ({
    x: 24 + (i / Math.max(chartData.length - 1, 1)) * 352,
    y: 120 - (w.val / maxVal) * 90,
  }));
  const buildPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const linePath = buildPath(pts);
  const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},130 L24,130 Z`;
  const lastPt   = pts[pts.length - 1];

  return (
    <ProtectedRoute role="coach">
      <div style={{ display: 'flex', minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
        <Sidebar role="coach" />

        <main style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 240,
          width: isMobile ? '100%' : 'calc(100vw - 240px)',
          padding: '0 0 80px',
          minWidth: 0,
          overflowX: 'hidden',
        }} className="stp-main">

          {/* ══ 1. HERO ══ */}
          <div style={{ position: 'relative', minHeight: 240, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', marginBottom: 28 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.18)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #131313 0%, rgba(19,19,19,0.55) 55%, transparent 100%)' }} />
            <div className="stp-hero-inner" style={{ position: 'relative', zIndex: 1, width: '100%', padding: '44px 32px 32px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <p style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(229,226,225,0.38)', margin: '0 0 10px' }}>📊 ANALYTICS</p>
                <h1 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,5vw,4rem)', letterSpacing: '-.05em', lineHeight: .9, textTransform: 'uppercase', margin: 0 }}>
                  SUIVI <span style={{ color: '#b22a27', fontStyle: 'italic' }}>PERFORMANCES.</span>
                </h1>
                <p style={{ color: '#6B7280', fontSize: '.82rem', margin: '12px 0 0', fontFamily: 'Inter, sans-serif' }}>
                  Données en temps réel · {clients.length} client{clients.length !== 1 ? 's' : ''} · Période {period === 'ALL' ? 'totale' : period}
                </p>
              </div>
              <div style={{ display: 'inline-flex', background: 'rgba(22,21,21,0.88)', border: '1px solid rgba(255,255,255,0.08)', padding: 4, borderRadius: 9999 }}>
                {(['7J', '30J', 'ALL'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '8px 20px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                    fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.6rem',
                    letterSpacing: '.12em', textTransform: 'uppercase',
                    background: period === p ? '#b22a27' : 'transparent',
                    color: period === p ? '#fff' : '#9CA3AF', transition: 'all .15s',
                  }}>
                    {p === 'ALL' ? 'ALL TIME' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="stp-inner" style={{ padding: '0 24px', overflowX: 'hidden' }}>

            {/* ══ 2. CLIENT PILLS ══ */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
              {[
                { id: null as string | null, name: 'ÉQUIPE', ini: null, color: '' },
                ...clients.map(c => ({ id: c.clientUserId, name: c.name, ini: c.initials, color: c.color })),
              ].map(item => {
                const active = selectedClientId === item.id;
                return (
                  <button key={item.id || 'all'} onClick={() => setSelectedClientId(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
                    padding: '7px 15px', borderRadius: 9999, flexShrink: 0, cursor: 'pointer',
                    border: active ? '1px solid #b22a27' : '1px solid rgba(255,255,255,0.09)',
                    background: active ? 'rgba(178,42,39,0.14)' : '#1c1b1b',
                    color: active ? '#b22a27' : '#9CA3AF',
                    fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.63rem',
                    letterSpacing: '.08em', textTransform: 'uppercase', transition: 'all .15s',
                  }}>
                    {item.ini
                      ? <span style={{ width: 20, height: 20, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.46rem', color: '#fff', flexShrink: 0, fontFamily: 'Lexend, sans-serif', fontWeight: 800 }}>{item.ini}</span>
                      : <span style={{ fontSize: '.8rem' }}>⊞</span>}
                    {item.name}
                  </button>
                );
              })}
            </div>

            {/* ══ 3. BENTO : chart + 2 KPI ══ */}
            <div className="stp-bento" style={{ display: 'grid', gap: 14, marginBottom: 14 }}>

              {/* ── Grande carte graphique ── */}
              <div style={{ background: '#1c1b1b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '22px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: '.54rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 7px' }}>ACTIVITÉ HEBDOMADAIRE</p>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', color: '#e5e2e1', lineHeight: 1, letterSpacing: '-.05em' }}>
                      {displayCompletions.length}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '.72rem', color: '#6B7280', marginLeft: 9 }}>exercices / période</span>
                    </div>
                  </div>
                  {rate > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', background: 'rgba(178,42,39,0.1)', border: '1px solid rgba(178,42,39,0.22)', borderRadius: 9999 }}>
                      <span style={{ fontSize: '.75rem' }}>↗</span>
                      <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.58rem', color: '#b22a27', letterSpacing: '.08em' }}>{rate}% ASSIDUITÉ</span>
                    </div>
                  )}
                </div>

                {/* SVG */}
                <div style={{ padding: '4px 24px 22px', overflowX: 'hidden' }}>
                  {singlePoint ? (
                    /* Special single-point display */
                    <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#b22a27', boxShadow: '0 0 16px rgba(178,42,39,0.6)' }} />
                      <span style={{ fontSize: '.72rem', color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 600 }}>
                        {weeklyData[0].val} exercice{weeklyData[0].val !== 1 ? 's' : ''} · {weeklyData[0].label}
                      </span>
                    </div>
                  ) : (
                    <svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet"
                      style={{ width: '100%', height: 180, display: 'block', overflow: 'hidden' }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#b22a27" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#b22a27" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[40, 80, 120].map(y => (
                        <line key={y} x1="24" y1={y} x2="376" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      ))}
                      {/* Area */}
                      <path d={areaPath} fill="url(#areaGrad)" />
                      {/* Line */}
                      <path d={linePath} stroke="#b22a27" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Peak dot */}
                      <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="#b22a27" />
                      <circle cx={lastPt.x} cy={lastPt.y} r="9" fill="rgba(178,42,39,0.22)" />
                      {/* Week labels */}
                      {chartData.map((d, i) => d.label ? (
                        <text key={i} x={pts[i].x} y="137" textAnchor="middle"
                          fontSize="10" fill="#6B7280" fontFamily="Lexend" fontWeight="600">
                          {d.label}
                        </text>
                      ) : null)}
                    </svg>
                  )}
                </div>
              </div>

              {/* ── 2 KPI cards empilées ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* KPI 1 */}
                <div style={{ background: '#202020', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(178,42,39,0.15)', border: '1px solid rgba(178,42,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#b22a27', fontFamily: 'Lexend, sans-serif', fontWeight: 900 }}>✓</div>
                  </div>
                  <div>
                    <p style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>EXERCICES COMPLÉTÉS</p>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '2.2rem', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>{displayCompletions.length}</div>
                  </div>
                  <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 2 }} />
                </div>

                {/* KPI 2 */}
                <div style={{ background: '#202020', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(178,42,39,0.15)', border: '1px solid rgba(178,42,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {selectedClientId ? '🔥' : '👥'}
                  </div>
                  <div>
                    <p style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                      {selectedClientId ? 'JOURS ACTIFS' : 'CLIENTS ACTIFS'}
                    </p>
                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '2.2rem', color: '#e5e2e1', letterSpacing: '-.05em', lineHeight: 1 }}>
                      {selectedClientId ? activeDays : activeClients}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '.65rem', color: '#6B7280', marginLeft: 7 }}>
                        {selectedClientId ? '/ période' : `/ ${clients.length}`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#16a34a' }}>↑</span>
                    <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.58rem', color: '#16a34a', letterSpacing: '.06em' }}>
                      {rate >= 70 ? `+${rate}% ZONE OPTIMALE` : `${rate}% ASSIDUITÉ`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ══ 4. ROW 2 : distribution + insight ══ */}
            <div className="stp-row2" style={{ display: 'grid', gap: 14, marginBottom: 14 }}>

              {/* Distribution musculaire */}
              <div style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <p style={{ fontSize: '.54rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 }}>DISTRIBUTION MUSCULAIRE</p>
                  <span style={{ color: '#6B7280', fontSize: '.9rem' }}>ⓘ</span>
                </div>
                {muscleData.length === 0 ? (
                  <p style={{ color: '#6B7280', fontSize: '.78rem', margin: '12px 0' }}>Pas encore de données musculaires.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {muscleData.map(m => (
                      <div key={m.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                          <span style={{ fontSize: '.62rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>{m.label}</span>
                          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', color: '#e5e2e1' }}>{m.pct}%</span>
                        </div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${m.pct}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 9999, transition: 'width 1.1s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Insight card */}
              <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', minHeight: 240 }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=50)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.15)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.82)' }} />
                <div style={{ position: 'relative', zIndex: 1, padding: '26px 22px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', background: 'rgba(178,42,39,0.2)', border: '1px solid rgba(178,42,39,0.4)', borderRadius: 9999, alignSelf: 'flex-start' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b22a27' }} />
                    <span style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                      ANALYSE · {selName.toUpperCase()}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.6rem', color: '#fff', lineHeight: 1.1, margin: 0, letterSpacing: '-.02em' }}>
                    {insightTitle}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.78rem', lineHeight: 1.65, margin: 0 }}>
                    {insightDesc}
                  </p>
                  <button
                    onClick={() => setSelectedClientId(selectedClientId ? null : (clients[0]?.clientUserId ?? null))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#b22a27', padding: 0, marginTop: 2 }}
                  >
                    {selectedClientId ? '← VOIR L\'ÉQUIPE' : '→ VOIR UN CLIENT'}
                  </button>
                </div>
              </div>
            </div>

            {/* ══ 5. LISTE CLIENTS ══ */}
            {clients.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {clients
                  .map(cl => {
                    const ts = lastActivityMap.get(cl.clientUserId) || 0;
                    /* Per-client stats always computed from ALL completions, not displayCompletions */
                    const clComps = filterByPeriod(
                      completions.filter(c => c.clientId === cl.clientUserId), period,
                    );
                    const clTotal = getTotalExercises(assignments.filter(a => a.clientId === cl.clientUserId));
                    const clRate  = getCompletionRate(clComps.length, clTotal);
                    const isRecent = ts > 0 && Date.now() - ts < 7 * 86400000;
                    return { ...cl, ts, clRate, isRecent };
                  })
                  .sort((a, b) => b.ts - a.ts)
                  .map(cl => (
                    <div
                      key={cl.id}
                      onClick={() => setSelectedClientId(selectedClientId === cl.clientUserId ? null : cl.clientUserId)}
                      style={{
                        background: selectedClientId === cl.clientUserId ? 'rgba(178,42,39,0.07)' : '#1c1b1b',
                        border: `1px solid ${selectedClientId === cl.clientUserId ? 'rgba(178,42,39,0.28)' : 'rgba(255,255,255,0.06)'}`,
                        borderLeft: `3px solid ${cl.isRecent ? '#b22a27' : 'rgba(178,42,39,0.12)'}`,
                        borderRadius: 10, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                        transition: 'all .18s', flexWrap: 'wrap',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: cl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {cl.initials}
                      </div>
                      {/* Name + last date */}
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 600, fontSize: '.88rem', color: '#e5e2e1', marginBottom: 3 }}>{cl.name}</div>
                        <div style={{ fontSize: '.62rem', color: '#9CA3AF' }}>
                          {cl.ts > 0 ? 'Dernier : ' + new Date(cl.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Aucune activité'}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${cl.clRate}%`, background: '#b22a27', borderRadius: 999, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                      {/* Rate */}
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem', color: '#b22a27', flexShrink: 0, minWidth: 44, textAlign: 'right' }}>{cl.clRate}%</div>
                      {/* Badge */}
                      <div style={{
                        padding: '4px 11px', borderRadius: 9999, flexShrink: 0,
                        background: cl.isRecent ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${cl.isRecent ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        fontSize: '.5rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700,
                        color: cl.isRecent ? '#16a34a' : '#6B7280', letterSpacing: '.1em', textTransform: 'uppercase',
                      }}>
                        {cl.isRecent ? 'ACTIF' : 'INACTIF'}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ══ 6. KPI ROW FINAL ══ */}
            <div className="stp-kpi" style={{ display: 'grid', gap: 12 }}>
              {[
                { label: 'TAUX GLOBAL',       val: rate + '%',                   sub: `${displayCompletions.length} / ${totalEx} exercices`, icon: '📊' },
                { label: 'EXERCICES FAITS',   val: String(displayCompletions.length), sub: 'sur la période sélectionnée',  icon: '✓'  },
                { label: 'JOURS ACTIFS',      val: String(activeDays),           sub: 'jours avec activité',              icon: '📅' },
                { label: 'CLIENTS ACTIFS 7J', val: String(activeClients7d),      sub: `sur ${clients.length} membres`,    icon: '👥' },
              ].map(k => (
                <div key={k.label} style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 16px', borderLeft: '2px solid rgba(178,42,39,0.35)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(178,42,39,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', marginBottom: 14 }}>{k.icon}</div>
                  <p style={{ fontSize: '.52rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>{k.label}</p>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.8rem', color: '#b22a27', letterSpacing: '-.04em', lineHeight: 1 }}>{k.val}</div>
                  <p style={{ fontSize: '.62rem', color: '#6B7280', margin: '8px 0 0' }}>{k.sub}</p>
                </div>
              ))}
            </div>

          </div>{/* /inner */}

          {loading && (
            <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, fontSize: '.72rem', color: '#9CA3AF', zIndex: 99 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite' }} />
              Synchronisation…
            </div>
          )}
        </main>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@600;700;800;900&family=Inter:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          @keyframes spin { to { transform: rotate(360deg); } }

          /* mobile first */
          .stp-bento { grid-template-columns: 1fr; }
          .stp-row2  { grid-template-columns: 1fr; }
          .stp-kpi   { grid-template-columns: repeat(2,1fr); }

          @media (min-width: 900px) {
            .stp-bento { grid-template-columns: 2fr 1fr; }
            .stp-row2  { grid-template-columns: 1fr 1fr; }
            .stp-kpi   { grid-template-columns: repeat(4,1fr); }
          }
          @media (max-width: 767px) {
            .stp-hero-inner { padding: 28px 16px 24px !important; }
            .stp-inner { padding: 0 14px !important; }
          }
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
