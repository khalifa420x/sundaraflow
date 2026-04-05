'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, getDoc, Timestamp,
} from 'firebase/firestore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast, { fireToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import {
  generateProgram,
  GoalType, LevelType,
  GeneratedProgram, GeneratedSession,
  ExerciseData,
} from '@/lib/programGenerator';
import exercisesRaw from '@/data/exercises.json';

const exercises = exercisesRaw as ExerciseData[];

/* ── Constants ── */
const GOALS: GoalType[] = ['Perte de poids', 'Prise de masse', 'Maintien', 'Force', 'Endurance', 'Renfo général', 'Mobilité'];
const LEVELS: LevelType[] = ['Débutant', 'Intermédiaire', 'Avancé'];
const EQUIPMENT_OPTS = ['Rien', 'Haltères', 'Barre', 'Kettlebell', 'Élastiques', 'Banc', 'Tapis'];

const GOAL_ICON: Record<GoalType, string> = {
  'Perte de poids': '🔥', 'Prise de masse': '💪', 'Maintien': '⚖️',
  'Force': '🏋️', 'Endurance': '🏃', 'Renfo général': '🎯', 'Mobilité': '🧘',
};
const MEAL_LABEL: Record<string, string> = {
  'Petit déjeuner': '🌅', 'Déjeuner': '☀️', 'Collation': '🍎', 'Dîner': '🌙',
};

const AVATAR_COLORS = [
  'linear-gradient(135deg,#9E1B1B,#b91c1c)',
  'linear-gradient(135deg,#7a1212,#9E1B1B)',
  'linear-gradient(135deg,#16a34a,#15803d)',
  'linear-gradient(135deg,#374151,#4B5563)',
];
const initials = (n: string) => n.split(' ').map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || 'CL';

type ViewType = 'list' | 'generate' | 'create' | 'assign';

interface ManualExercise { name: string; sets: number; reps: string; rest: string; notes: string; }
interface ManualSession { label: string; exercises: ManualExercise[]; }

const defaultManualEx = (): ManualExercise => ({ name: '', sets: 3, reps: '12', rest: '60s', notes: '' });
const defaultManualSession = (i: number): ManualSession => ({ label: `Séance ${i + 1}`, exercises: [defaultManualEx()] });

/* ════════════════════════════════════════════════════════
   PROGRAMME CARD (sub-component)
════════════════════════════════════════════════════════ */
function ProgramCard({
  p, onAssign, onDelete, deleting,
}: { p: any; onAssign: () => void; onDelete: () => void; deleting: boolean }) {
  const totalExercises = (p.sessions || []).reduce((acc: number, s: any) => acc + (s.exercises?.length || 0), 0);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#1c1b1b', borderRadius: 14, padding: 22,
        border: `1px solid ${hovered ? 'rgba(178,42,39,0.35)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex', flexDirection: 'column', position: 'relative',
        transition: 'all .2s',
        transform: hovered ? 'scale(1.015)' : 'scale(1)',
        boxShadow: hovered ? '0 0 24px rgba(178,42,39,0.12)' : 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(178,42,39,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            {GOAL_ICON[p.goal as GoalType] || '📋'}
          </div>
          <span style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#b22a27', background: 'rgba(178,42,39,0.1)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(178,42,39,0.2)' }}>
            {p.goal || 'Programme'}
          </span>
        </div>
        <button
          onClick={onDelete} disabled={deleting}
          style={{ background: 'rgba(220,38,38,0.08)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .15s', opacity: deleting ? .6 : 1 }}
        >
          {deleting
            ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#f87171', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
            : <span style={{ fontSize: '.85rem' }}>🗑️</span>}
        </button>
      </div>

      {/* Title + subtitle */}
      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em', color: '#e5e2e1', marginBottom: 4, lineHeight: 1.2 }}>{p.title}</div>
      <div style={{ fontSize: '.64rem', color: '#9CA3AF', marginBottom: 16 }}>{p.level} · {p.durationWeeks} semaines</div>

      {/* Tabular stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16, flex: 1 }}>
        {[
          { label: 'Séances / semaine', val: `${p.sessionsPerWeek || 0} x/sem` },
          { label: 'Exercices total', val: String(totalExercises) },
          { label: 'Durée', val: `${p.durationWeeks || 0} sem.` },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.72rem' }}>
            <span style={{ color: '#9CA3AF' }}>{s.label}</span>
            <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#b22a27' }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${Math.min(100, (p.sessionsPerWeek || 3) * 15)}%`, background: 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width 1.2s ease' }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onAssign}
          style={{ flex: 1, padding: '9px', borderRadius: 6, border: 'none', background: '#b22a27', color: '#fff', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.63rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#89070e'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#b22a27'; }}
        >ASSIGNER →</button>
        <button style={{ flex: 1, padding: '9px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9CA3AF', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.63rem', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s' }}>
          MODIFIER
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function CoachProgrammes() {
  const router = useRouter();

  /* Auth */
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);

  /* Data */
  const [programs, setPrograms] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  /* UI */
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('list');
  const [filterGoal, setFilterGoal] = useState<string>('TOUS');

  /* Generate state */
  const [genGoal, setGenGoal] = useState<GoalType>('Perte de poids');
  const [genLevel, setGenLevel] = useState<LevelType>('Intermédiaire');
  const [genWeeks, setGenWeeks] = useState(8);
  const [genSpw, setGenSpw] = useState(3);
  const [genEquipment, setGenEquipment] = useState<string[]>(['Rien', 'Tapis']);
  const [genResult, setGenResult] = useState<GeneratedProgram | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genSaving, setGenSaving] = useState(false);
  const [expandedGenSession, setExpandedGenSession] = useState<number | null>(0);
  const [editedSessions, setEditedSessions] = useState<GeneratedSession[]>([]);

  /* Create state */
  const [createTitle, setCreateTitle] = useState('');
  const [createGoal, setCreateGoal] = useState<GoalType>('Renfo général');
  const [createLevel, setCreateLevel] = useState<LevelType>('Intermédiaire');
  const [createWeeks, setCreateWeeks] = useState(8);
  const [createSpw, setCreateSpw] = useState(3);
  const [createSessions, setCreateSessions] = useState<ManualSession[]>([defaultManualSession(0), defaultManualSession(1), defaultManualSession(2)]);
  const [expandedCreateSession, setExpandedCreateSession] = useState<number | null>(0);
  const [createSaving, setCreateSaving] = useState(false);

  /* Assign state */
  const [assignProgram, setAssignProgram] = useState<any>(null);
  const [assignClientDocId, setAssignClientDocId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignSaving, setAssignSaving] = useState(false);

  /* Delete state */
  const [deletingId, setDeletingId] = useState('');

  /* Mount */
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  /* Auth */
  useEffect(() => { return auth.onAuthStateChanged(u => setUser(u)); }, []);

  /* Sync createSessions when spw changes */
  useEffect(() => {
    setCreateSessions(prev => {
      const next = [...prev];
      while (next.length < createSpw) next.push(defaultManualSession(next.length));
      return next.slice(0, createSpw);
    });
  }, [createSpw]);

  /* Fetch programs */
  const fetchPrograms = useCallback(async (u = user) => {
    if (!u) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'programs'), where('coachId', '==', u.uid)));
      setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { fireToast('❌', 'Erreur', 'Impossible de charger les programmes.'); }
    setLoading(false);
  }, [user]);

  /* Fetch clients */
  const fetchClients = useCallback(async (u = user) => {
    if (!u) return;
    try {
      const cSnap = await getDocs(query(collection(db, 'clients'), where('coachId', '==', u.uid)));
      const clientData: any[] = [];
      for (const d of cSnap.docs) {
        const cd = d.data(); let cName = cd.name || '';
        if (!cName && cd.clientUserId) {
          try {
            const uDoc = await getDoc(doc(db, 'users', cd.clientUserId));
            if (uDoc.exists()) cName = uDoc.data().name || uDoc.data().email || 'Client';
          } catch {}
        }
        clientData.push({
          docId: d.id, ...cd, name: cName || 'Client',
          initials: initials(cName || 'Client'),
          color: AVATAR_COLORS[clientData.length % AVATAR_COLORS.length],
        });
      }
      setClients(clientData);
    } catch {}
  }, [user]);

  useEffect(() => { if (user) { fetchPrograms(user); fetchClients(user); } }, [user]);

  /* ── Handlers ── */
  const handleGenerate = () => {
    setGenLoading(true);
    setTimeout(() => {
      const pool = genEquipment.includes('Rien')
        ? exercises
        : exercises.filter(ex => ex.equipment.some(e => genEquipment.includes(e)));
      const result = generateProgram(genGoal, genLevel, pool.length > 0 ? pool : exercises, genSpw, genWeeks);
      setGenResult(result);
      setEditedSessions(result.sessions.map(s => ({ ...s, exercises: s.exercises.map(e => ({ ...e })) })));
      setExpandedGenSession(0);
      setGenLoading(false);
    }, 900);
  };

  const handleSaveGenerated = async () => {
    if (!user || !genResult) return;
    setGenSaving(true);
    try {
      await addDoc(collection(db, 'programs'), {
        coachId: user.uid,
        title: genResult.title,
        goal: genResult.goal,
        level: genResult.level,
        durationWeeks: genResult.durationWeeks,
        sessionsPerWeek: genResult.sessionsPerWeek,
        sessions: editedSessions,
        summary: genResult.summary,
        weeklyMealPlan: genResult.weeklyMealPlan,
        generatedBy: 'ai',
        createdAt: Timestamp.now(),
      });
      fireToast('✅', 'Programme sauvegardé', genResult.title);
      setGenResult(null);
      setView('list');
      fetchPrograms(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible de sauvegarder.'); }
    setGenSaving(false);
  };

  const handleSaveManual = async () => {
    if (!user || !createTitle.trim()) return;
    setCreateSaving(true);
    try {
      const sessions = createSessions.map((s, i) => ({
        day: i + 1, label: s.label, focus: '',
        exercises: s.exercises.filter(e => e.name.trim()).map(e => ({
          exerciseId: '', name: e.name, type: 'Force', primary_muscle: '',
          mode: 'reps' as const, sets: e.sets, reps: e.reps, rest: e.rest, notes: e.notes,
          meals: [], instructions: { setup: '', execution: '', tips: [], common_mistakes: [] },
        })),
      }));
      await addDoc(collection(db, 'programs'), {
        coachId: user.uid, title: createTitle.trim(), goal: createGoal, level: createLevel,
        durationWeeks: createWeeks, sessionsPerWeek: createSpw, sessions,
        summary: '', weeklyMealPlan: [], generatedBy: 'manual', createdAt: Timestamp.now(),
      });
      fireToast('✅', 'Programme créé', createTitle);
      setCreateTitle(''); setView('list'); fetchPrograms(user);
    } catch { fireToast('❌', 'Erreur', 'Impossible de sauvegarder.'); }
    setCreateSaving(false);
  };

  const handleDeleteProgram = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'programs', id));
      fireToast('🗑️', 'Programme supprimé', '');
      setPrograms(p => p.filter(x => x.id !== id));
    } catch { fireToast('❌', 'Erreur', 'Impossible de supprimer.'); }
    setDeletingId('');
  };

  const handleAssign = async () => {
    if (!user || !assignProgram || !assignClientDocId) return;
    setAssignSaving(true);
    try {
      const clientDoc = clients.find(c => c.docId === assignClientDocId);
      await addDoc(collection(db, 'program_assignments'), {
        coachId: user.uid,
        clientId: clientDoc?.clientUserId || '',
        clientDocId: assignClientDocId,
        programId: assignProgram.id,
        programTitle: assignProgram.title,
        startDate: assignStartDate,
        status: 'active',
        assignedAt: Timestamp.now(),
      });
      fireToast('✅', 'Assigné', `${assignProgram.title} → ${clientDoc?.name || 'Client'}`);
      setView('list');
    } catch { fireToast('❌', 'Erreur', 'Impossible d\'assigner.'); }
    setAssignSaving(false);
  };

  /* ── Shared styles ── */
  const S = {
    gradBtn: { background: 'linear-gradient(135deg,#89070e,#0e0e0e)', color: '#e5e2e1', border: 'none', borderRadius: 6, padding: '11px 22px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all .2s' },
    ghostBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '10px 18px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#9CA3AF', cursor: 'pointer', transition: 'all .2s' },
    tag: { fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase' as const, color: '#b22a27', display: 'block', marginBottom: 8 },
    label: { fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF' },
    card: { background: '#1c1b1b', borderRadius: 14, padding: 22, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    input: { width: '100%', background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '9px 12px', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', fontSize: '.84rem', outline: 'none' } as React.CSSProperties,
    spin: { width: 13, height: 13, border: '2px solid rgba(255,255,255,.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' } as React.CSSProperties,
  };

  const filteredPrograms = filterGoal === 'TOUS' ? programs : programs.filter(p => p.goal === filterGoal);
  const exNames = exercises.map(e => e.name);

  const updateEditedEx = (si: number, ei: number, patch: Partial<GeneratedSession['exercises'][0]>) => {
    setEditedSessions(prev => prev.map((s, sIdx) => sIdx !== si ? s : {
      ...s, exercises: s.exercises.map((ex, exIdx) => exIdx !== ei ? ex : { ...ex, ...patch }),
    }));
  };

  const updateCreateEx = (si: number, ei: number, patch: Partial<ManualExercise>) => {
    setCreateSessions(prev => prev.map((s, sIdx) => sIdx !== si ? s : {
      ...s, exercises: s.exercises.map((ex, exIdx) => exIdx !== ei ? ex : { ...ex, ...patch }),
    }));
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <ProtectedRoute role="coach">
      <>
        <Toast />
        <div className="cp-root" style={{ display: 'flex', minHeight: '100vh', background: '#131313', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

          <Sidebar role="coach" />

          <main className="cp-main">

            {/* ══════════════════════════════════
                VUE : LIST
            ══════════════════════════════════ */}
            {view === 'list' && (
              <>
                {/* HERO */}
                <section style={{ position: 'relative', height: 'clamp(280px,40vh,440px)', overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80"
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.22) saturate(0.8)' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(19,19,19,0.6)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(19,19,19,0.95) 0%, rgba(19,19,19,0.5) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, #131313, transparent)' }} />
                  <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(20px,4vw,48px)', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)', transition: 'opacity .6s ease, transform .6s ease' }}>
                    <span style={S.tag}>📋 BIBLIOTHÈQUE</span>
                    <h1 style={{ fontFamily: 'Lexend, sans-serif', fontSize: 'clamp(2rem,7vw,4.8rem)', fontWeight: 900, letterSpacing: '-.05em', lineHeight: .88, marginBottom: 14, color: '#e5e2e1' }}>
                      MES <span style={{ color: '#b22a27', fontStyle: 'italic' }}>PROGRAMMES.</span>
                    </h1>
                    <p style={{ fontSize: 'clamp(.82rem,1.5vw,.92rem)', color: '#9CA3AF', marginBottom: 22, maxWidth: 500, lineHeight: 1.75 }}>
                      Créez, générez et assignez des programmes personnalisés à vos clients.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button style={S.gradBtn} onClick={() => setView('generate')}>⚡ GÉNÉRER UN PROGRAMME →</button>
                      <button style={S.ghostBtn} onClick={() => { setCreateTitle(''); setView('create'); }}>CRÉER MANUELLEMENT</button>
                    </div>
                  </div>
                </section>

                {/* FILTER PILLS */}
                <div style={{ padding: 'clamp(14px,2vw,22px) clamp(16px,3vw,32px)', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
                    {['TOUS', ...GOALS].map(g => (
                      <button key={g} onClick={() => setFilterGoal(g)} style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.6rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, background: filterGoal === g ? '#b22a27' : 'rgba(255,255,255,0.06)', color: filterGoal === g ? '#fff' : '#9CA3AF', transition: 'all .2s', whiteSpace: 'nowrap' as const }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PROGRAMME GRID */}
                <div style={{ padding: 'clamp(16px,2.5vw,32px)', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'opacity .4s ease .2s, transform .4s ease .2s' }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.07)', borderTopColor: '#b22a27', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: '.73rem', color: '#9CA3AF' }}>Chargement…</p>
                    </div>
                  ) : (
                    <>
                      {!loading && filteredPrograms.length === 0 && filterGoal !== 'TOUS' && (
                        <p style={{ fontSize: '.8rem', color: '#6B7280', marginBottom: 20 }}>Aucun programme pour cet objectif.</p>
                      )}
                      <div className="cp-prog-grid">
                        {filteredPrograms.map(p => (
                          <ProgramCard
                            key={p.id} p={p}
                            onAssign={() => { setAssignProgram(p); setAssignClientDocId(clients[0]?.docId || ''); setView('assign'); }}
                            onDelete={() => handleDeleteProgram(p.id)}
                            deleting={deletingId === p.id}
                          />
                        ))}
                        {/* Add card */}
                        <div
                          onClick={() => setView('generate')}
                          className="cp-add-card"
                          style={{ background: 'transparent', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 200, gap: 10 }}
                        >
                          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(178,42,39,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', color: '#b22a27' }}>+</div>
                          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#6B7280', textAlign: 'center' }}>NOUVEAU PROGRAMME</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ══════════════════════════════════
                VUE : GENERATE
            ══════════════════════════════════ */}
            {view === 'generate' && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
                  <button style={{ ...S.ghostBtn, padding: '8px 14px' }} onClick={() => { setGenResult(null); setView('list'); }}>← RETOUR</button>
                  <div>
                    <span style={S.tag}>⚡ Intelligence adaptative</span>
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.8rem)', letterSpacing: '-.04em', color: '#e5e2e1', margin: 0, lineHeight: .88 }}>
                      GÉNÉRER UN <span style={{ color: '#b22a27', fontStyle: 'italic' }}>PROGRAMME.</span>
                    </h2>
                  </div>
                </div>

                {/* FORM */}
                <div style={{ ...S.card, marginBottom: 24 }}>
                  {/* Objectif */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ ...S.label, marginBottom: 12 }}>Objectif</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {GOALS.map(g => (
                        <button key={g} onClick={() => setGenGoal(g)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase' as const, background: genGoal === g ? '#b22a27' : 'rgba(255,255,255,0.06)', color: genGoal === g ? '#fff' : '#9CA3AF', transition: 'all .2s' }}>
                          <span>{GOAL_ICON[g]}</span>{g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Niveau */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ ...S.label, marginBottom: 12 }}>Niveau</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {LEVELS.map(l => (
                        <button key={l} onClick={() => setGenLevel(l)} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.06em', textTransform: 'uppercase' as const, background: genLevel === l ? '#b22a27' : 'rgba(255,255,255,0.06)', color: genLevel === l ? '#fff' : '#9CA3AF', transition: 'all .2s' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Durée + Séances */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    <div>
                      <div style={{ ...S.label, marginBottom: 10 }}>Durée — {genWeeks} semaines</div>
                      <input type="range" min={4} max={24} value={genWeeks} onChange={e => setGenWeeks(+e.target.value)} style={{ width: '100%', accentColor: '#b22a27', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.58rem', color: '#6B7280', marginTop: 4 }}><span>4 sem.</span><span>24 sem.</span></div>
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: 10 }}>Séances / semaine</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                          <button key={n} onClick={() => setGenSpw(n)} style={{ width: 34, height: 34, borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.78rem', background: genSpw === n ? '#b22a27' : 'rgba(255,255,255,0.06)', color: genSpw === n ? '#fff' : '#9CA3AF', transition: 'all .2s' }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Matériel */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ ...S.label, marginBottom: 12 }}>Matériel disponible</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {EQUIPMENT_OPTS.map(eq => {
                        const active = genEquipment.includes(eq);
                        return (
                          <button key={eq} onClick={() => setGenEquipment(prev => active ? prev.filter(e => e !== eq) : [...prev, eq])} style={{ padding: '8px 14px', borderRadius: 8, border: active ? '1px solid rgba(178,42,39,0.45)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '.7rem', background: active ? 'rgba(178,42,39,0.15)' : 'rgba(255,255,255,0.04)', color: active ? '#e5e2e1' : '#9CA3AF', transition: 'all .2s' }}>
                            {eq}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 10, opacity: genLoading ? .6 : 1 }} onClick={handleGenerate} disabled={genLoading}>
                    {genLoading ? <><span style={S.spin} /> Génération en cours…</> : '⚡ GÉNÉRER LE PROGRAMME →'}
                  </button>
                </div>

                {/* RESULT */}
                {genResult && (
                  <div style={{ animation: 'fadeInUp .4s ease' }}>
                    {/* Résumé card */}
                    <div style={{ ...S.card, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <span style={{ fontSize: '.55rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: '#b22a27', background: 'rgba(178,42,39,0.1)', padding: '3px 9px', borderRadius: 4, border: '1px solid rgba(178,42,39,0.25)', display: 'inline-block', marginBottom: 12 }}>⚡ IA GÉNÉRÉ</span>
                          <h3 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1rem,2.5vw,1.4rem)', letterSpacing: '-.03em', color: '#e5e2e1', margin: '0 0 10px' }}>{genResult.title}</h3>
                          <p style={{ fontSize: '.78rem', color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>{genResult.summary}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
                          {[
                            { label: 'Durée', val: `${genResult.durationWeeks} sem.` },
                            { label: 'Séances', val: `${genResult.sessionsPerWeek} x/sem.` },
                            { label: 'Sessions', val: String(genResult.sessions.length) },
                          ].map(s => (
                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', minWidth: 70 }}>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: '#b22a27', letterSpacing: '-.04em' }}>{s.val}</div>
                              <div style={S.label}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Plan repas */}
                    {genResult.weeklyMealPlan.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ ...S.label, marginBottom: 12 }}>🍽️ Plan repas de la semaine</div>
                        <div className="cp-meal-grid">
                          {genResult.weeklyMealPlan.map((m, i) => (
                            <div key={i} style={{ background: '#1c1b1b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.7rem', color: '#b22a27', letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
                                {MEAL_LABEL[m.meal] || '🍽️'} {m.meal}
                              </div>
                              <div style={{ fontSize: '.74rem', color: '#9CA3AF', lineHeight: 1.65 }}>{m.recipe}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sessions accordion */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                      {editedSessions.map((session, si) => (
                        <div key={si} style={{ background: '#1c1b1b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div
                            onClick={() => setExpandedGenSession(expandedGenSession === si ? null : si)}
                            style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' as const }}
                          >
                            <div>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.9rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>
                                JOUR {session.day} — {session.label}
                              </div>
                              <div style={{ fontSize: '.64rem', color: '#9CA3AF', marginTop: 3 }}>
                                {session.focus} · {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''}
                              </div>
                            </div>
                            <span style={{ color: '#b22a27', fontSize: '.9rem', transition: 'transform .2s', transform: expandedGenSession === si ? 'rotate(180deg)' : 'none' }}>▼</span>
                          </div>
                          {expandedGenSession === si && (
                            <div style={{ padding: '0 18px 18px', overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem', minWidth: 520 }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                    {['Exercice', 'Muscle', 'Séries', 'Reps', 'Repos', 'Note'].map(h => (
                                      <th key={h} style={{ padding: '8px 8px', textAlign: 'left', ...S.label }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {session.exercises.map((ex, ei) => (
                                    <tr key={ei} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                      <td style={{ padding: '8px', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: '#e5e2e1', fontSize: '.76rem', maxWidth: 150 }}>{ex.name}</td>
                                      <td style={{ padding: '8px', color: '#9CA3AF', fontSize: '.7rem' }}>{ex.primary_muscle}</td>
                                      <td style={{ padding: '8px' }}>
                                        <input type="number" value={ex.sets} min={1} max={10} onChange={e => updateEditedEx(si, ei, { sets: +e.target.value })} style={{ width: 50, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '4px 6px', color: '#e5e2e1', fontSize: '.72rem', outline: 'none', fontFamily: 'Lexend, sans-serif' }} />
                                      </td>
                                      <td style={{ padding: '8px' }}>
                                        <input type="text" value={ex.reps} onChange={e => updateEditedEx(si, ei, { reps: e.target.value })} style={{ width: 60, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '4px 6px', color: '#b22a27', fontSize: '.72rem', outline: 'none', fontFamily: 'Lexend, sans-serif', fontWeight: 700 }} />
                                      </td>
                                      <td style={{ padding: '8px' }}>
                                        <input type="text" value={ex.rest} onChange={e => updateEditedEx(si, ei, { rest: e.target.value })} style={{ width: 60, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '4px 6px', color: '#e5e2e1', fontSize: '.72rem', outline: 'none', fontFamily: 'Lexend, sans-serif' }} />
                                      </td>
                                      <td style={{ padding: '8px', color: '#6B7280', fontSize: '.65rem', fontStyle: 'italic', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.notes || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 8, opacity: genSaving ? .6 : 1 }} onClick={handleSaveGenerated} disabled={genSaving}>
                        {genSaving ? <><span style={S.spin} /> Sauvegarde…</> : 'SAUVEGARDER →'}
                      </button>
                      <button style={S.ghostBtn} onClick={handleGenerate} disabled={genLoading}>🔄 RÉGÉNÉRER</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════
                VUE : CREATE (manuel)
            ══════════════════════════════════ */}
            {view === 'create' && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
                  <button style={{ ...S.ghostBtn, padding: '8px 14px' }} onClick={() => setView('list')}>← RETOUR</button>
                  <div>
                    <span style={S.tag}>✏️ Création manuelle</span>
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.8rem)', letterSpacing: '-.04em', color: '#e5e2e1', margin: 0, lineHeight: .88 }}>
                      CRÉER UN <span style={{ color: '#b22a27', fontStyle: 'italic' }}>PROGRAMME.</span>
                    </h2>
                  </div>
                </div>

                <div style={{ ...S.card, marginBottom: 20 }}>
                  {/* Titre */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>Titre du programme *</div>
                    <input type="text" placeholder="Ex : Force & Hypertrophie Avancé" value={createTitle} onChange={e => setCreateTitle(e.target.value)} style={S.input} />
                  </div>

                  {/* Objectif + Niveau */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                    <div>
                      <div style={{ ...S.label, marginBottom: 8 }}>Objectif</div>
                      <select value={createGoal} onChange={e => setCreateGoal(e.target.value as GoalType)} style={S.input}>
                        {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: 8 }}>Niveau</div>
                      <select value={createLevel} onChange={e => setCreateLevel(e.target.value as LevelType)} style={S.input}>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Durée + Séances */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    <div>
                      <div style={{ ...S.label, marginBottom: 8 }}>Durée (semaines)</div>
                      <input type="number" min={1} max={52} value={createWeeks} onChange={e => setCreateWeeks(+e.target.value)} style={S.input} />
                    </div>
                    <div>
                      <div style={{ ...S.label, marginBottom: 8 }}>Séances / semaine</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                          <button key={n} onClick={() => setCreateSpw(n)} style={{ width: 34, height: 34, borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.78rem', background: createSpw === n ? '#b22a27' : 'rgba(255,255,255,0.06)', color: createSpw === n ? '#fff' : '#9CA3AF', transition: 'all .2s' }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sessions accordion */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                  {createSessions.map((session, si) => (
                    <div key={si} style={{ background: '#1c1b1b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedCreateSession(expandedCreateSession === si ? null : si)}
                        style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="text" value={session.label}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { const copy = [...createSessions]; copy[si] = { ...copy[si], label: e.target.value }; setCreateSessions(copy); }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '5px 10px', color: '#e5e2e1', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.82rem', outline: 'none', width: 220 }}
                          />
                          <span style={{ fontSize: '.64rem', color: '#6B7280' }}>{session.exercises.filter(e => e.name).length} ex.</span>
                        </div>
                        <span style={{ color: '#b22a27', fontSize: '.9rem', transition: 'transform .2s', transform: expandedCreateSession === si ? 'rotate(180deg)' : 'none' }}>▼</span>
                      </div>
                      {expandedCreateSession === si && (
                        <div style={{ padding: '0 18px 18px' }}>
                          {/* Column headers */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 1fr 28px', gap: 8, marginBottom: 6 }}>
                            {['Exercice', 'Séries', 'Reps', 'Repos', 'Notes', ''].map(h => (
                              <div key={h} style={S.label}>{h}</div>
                            ))}
                          </div>
                          {session.exercises.map((ex, ei) => (
                            <div key={ei} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px 1fr 28px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ position: 'relative' }}>
                                <input type="text" placeholder="Nom exercice" value={ex.name} list={`exn-${si}-${ei}`} onChange={e => updateCreateEx(si, ei, { name: e.target.value })} style={{ ...S.input, fontSize: '.78rem', padding: '6px 10px' }} />
                                <datalist id={`exn-${si}-${ei}`}>{exNames.map(n => <option key={n} value={n} />)}</datalist>
                              </div>
                              <input type="number" value={ex.sets} min={1} onChange={e => updateCreateEx(si, ei, { sets: +e.target.value })} style={{ ...S.input, padding: '6px 8px', fontSize: '.76rem' }} />
                              <input type="text" placeholder="12" value={ex.reps} onChange={e => updateCreateEx(si, ei, { reps: e.target.value })} style={{ ...S.input, padding: '6px 8px', fontSize: '.76rem' }} />
                              <input type="text" placeholder="60s" value={ex.rest} onChange={e => updateCreateEx(si, ei, { rest: e.target.value })} style={{ ...S.input, padding: '6px 8px', fontSize: '.76rem' }} />
                              <input type="text" placeholder="Notes…" value={ex.notes} onChange={e => updateCreateEx(si, ei, { notes: e.target.value })} style={{ ...S.input, padding: '6px 8px', fontSize: '.76rem' }} />
                              <button onClick={() => { const copy = [...createSessions]; copy[si].exercises = copy[si].exercises.filter((_, idx) => idx !== ei); setCreateSessions([...copy]); }} style={{ width: 28, height: 28, background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#f87171', fontSize: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>
                          ))}
                          <button onClick={() => { const copy = [...createSessions]; copy[si].exercises.push(defaultManualEx()); setCreateSessions([...copy]); }} style={{ ...S.ghostBtn, fontSize: '.62rem', padding: '6px 14px', marginTop: 8 }}>+ Ajouter un exercice</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', gap: 8, opacity: createSaving || !createTitle.trim() ? .55 : 1 }} onClick={handleSaveManual} disabled={createSaving || !createTitle.trim()}>
                  {createSaving ? <><span style={S.spin} /> Sauvegarde…</> : 'CRÉER LE PROGRAMME →'}
                </button>
              </div>
            )}

            {/* ══════════════════════════════════
                VUE : ASSIGN
            ══════════════════════════════════ */}
            {view === 'assign' && assignProgram && (
              <div style={{ padding: 'clamp(16px,2.5vw,32px)', flex: 1, maxWidth: 680 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
                  <button style={{ ...S.ghostBtn, padding: '8px 14px' }} onClick={() => setView('list')}>← RETOUR</button>
                  <div>
                    <span style={S.tag}>📤 Assignation client</span>
                    <h2 style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.8rem)', letterSpacing: '-.04em', color: '#e5e2e1', margin: 0, lineHeight: .88 }}>
                      ASSIGNER À <span style={{ color: '#b22a27', fontStyle: 'italic' }}>UN CLIENT.</span>
                    </h2>
                  </div>
                </div>

                {/* Programme recap */}
                <div style={{ ...S.card, marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#e5e2e1', marginBottom: 10 }}>{assignProgram.title}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[assignProgram.goal, assignProgram.level, `${assignProgram.durationWeeks} sem.`, `${assignProgram.sessionsPerWeek} x/sem.`].map((b, i) => (
                      <span key={i} style={{ fontSize: '.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.06em', padding: '4px 12px', borderRadius: 20, background: 'rgba(178,42,39,0.12)', color: '#b22a27', border: '1px solid rgba(178,42,39,0.25)' }}>{b}</span>
                    ))}
                  </div>
                </div>

                {/* Client selection */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ ...S.label, marginBottom: 12 }}>Sélectionner un client</div>
                  {clients.length === 0 ? (
                    <div style={{ color: '#6B7280', fontSize: '.8rem', padding: '24px', textAlign: 'center', background: '#1c1b1b', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                      Aucun client trouvé. Ajoutez des clients depuis votre tableau de bord.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {clients.map(c => (
                        <div key={c.docId} onClick={() => setAssignClientDocId(c.docId)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${assignClientDocId === c.docId ? 'rgba(178,42,39,0.5)' : 'rgba(255,255,255,0.06)'}`, background: assignClientDocId === c.docId ? 'rgba(178,42,39,0.08)' : '#1c1b1b', transition: 'all .15s' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Lexend, sans-serif' }}>{c.initials}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.88rem', color: '#e5e2e1' }}>{c.name}</div>
                            <div style={{ fontSize: '.62rem', color: '#9CA3AF', marginTop: 2 }}>{c.goal || 'Objectif non défini'}</div>
                          </div>
                          {assignClientDocId === c.docId && <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#b22a27', flexShrink: 0 }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date de début */}
                <div style={{ marginBottom: 30 }}>
                  <div style={{ ...S.label, marginBottom: 8 }}>Date de début</div>
                  <input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} style={{ ...S.input, colorScheme: 'dark' } as React.CSSProperties} />
                </div>

                <button style={{ ...S.gradBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', opacity: assignSaving || !assignClientDocId ? .55 : 1 }} onClick={handleAssign} disabled={assignSaving || !assignClientDocId}>
                  {assignSaving ? <><span style={S.spin} /> Assignation en cours…</> : 'ASSIGNER CE PROGRAMME →'}
                </button>
              </div>
            )}

          </main>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          .cp-root, .cp-root * { font-family: 'Inter', sans-serif; }
          .cp-root h1, .cp-root h2, .cp-root h3 { font-family: 'Lexend', sans-serif !important; font-weight: 900 !important; letter-spacing: -.04em !important; margin: 0; color: #e5e2e1; }
          .cp-root p { margin: 0; color: #9CA3AF; }

          .cp-main { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 100vh; overflow-x: hidden; }
          @media (min-width: 768px) { .cp-main { margin-left: 240px; width: calc(100vw - 240px); } }
          @media (max-width: 767px) {
            .cp-root { flex-direction: column !important; }
            .cp-main { margin-left: 0 !important; width: 100% !important; }
          }

          .cp-prog-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
          @media (min-width: 580px) { .cp-prog-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1000px) { .cp-prog-grid { grid-template-columns: repeat(3, 1fr); } }

          .cp-meal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }

          .cp-add-card { transition: border-color .2s, background .2s; }
          .cp-add-card:hover { border-color: rgba(178,42,39,0.4) !important; background: rgba(178,42,39,0.03) !important; }

          .cp-root input[type="range"] { -webkit-appearance: none; appearance: none; height: 4px; background: rgba(255,255,255,0.08); border-radius: 4px; outline: none; }
          .cp-root input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #b22a27; cursor: pointer; }

          .cp-root input:not([type="range"]), .cp-root textarea, .cp-root select {
            font-family: 'Inter', sans-serif !important; color: #e5e2e1 !important;
            background: #2a2a2a !important; border: 1px solid rgba(255,255,255,0.07) !important;
            border-radius: 7px !important; width: 100%; outline: none !important;
          }
          .cp-root input:not([type="range"]):focus, .cp-root textarea:focus, .cp-root select:focus {
            border-color: rgba(178,42,39,0.5) !important; box-shadow: 0 0 0 3px rgba(178,42,39,0.09) !important;
          }
          .cp-root select option { background: #2a2a2a; color: #e5e2e1; }

          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

          .cp-root ::-webkit-scrollbar { width: 4px; height: 4px; }
          .cp-root ::-webkit-scrollbar-track { background: transparent; }
          .cp-root ::-webkit-scrollbar-thumb { background: rgba(178,42,39,0.35); border-radius: 10px; }
        `}</style>
      </>
    </ProtectedRoute>
  );
}
