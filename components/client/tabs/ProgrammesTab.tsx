'use client';

interface ProgrammesTabProps {
  displayPrograms: any[];
  loading: boolean;
  expandedProgram: string | null;
  setExpandedProgram: (id: string | null) => void;
  expandedProgSession: string | null;
  setExpandedProgSession: (id: string | null) => void;
  expandedEx: string | null;
  setExpandedEx: (id: string | null) => void;
  acceptedPrograms: Record<string, boolean>;
  acceptProgram: (id: string) => void;
  toggleExercise: (assignmentId: string, si: number, ei: number, exName?: string, exReps?: string, exSets?: number) => void;
  completions: Record<string, boolean>;
  savingCompletion: string | null;
  daysSince: (ts: any) => number;
  getSessionPhoto: (label: string, focus: string) => string;
  getMusclePhoto: (muscle: string) => string;
  formatReps: (reps: string) => string;
  TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }>;
}

export default function ProgrammesTab({
  displayPrograms,
  loading,
  expandedProgram,
  setExpandedProgram,
  expandedProgSession,
  setExpandedProgSession,
  expandedEx,
  setExpandedEx,
  acceptedPrograms,
  acceptProgram,
  toggleExercise,
  completions,
  savingCompletion,
  daysSince,
  getSessionPhoto,
  getMusclePhoto,
  formatReps,
  TYPE_CONFIG,
}: ProgrammesTabProps) {
  return (
    <div>
      <div className="cl-page-header">
        <h2 className="cl-page-title">MES PROGRAMMES</h2>
        <p className="cl-page-sub">Programmes assignés par votre coach</p>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="cl-spinner" />
          <p style={{ fontSize: '.73rem', color: '#9CA3AF', marginTop: 12 }}>Chargement…</p>
        </div>
      ) : displayPrograms.length === 0 ? (
        <div style={{ background: '#1c1b1b', borderRadius: 14, padding: '40px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#e5e2e1', marginBottom: 8 }}>Aucun programme assigné</div>
          <p style={{ fontSize: '.78rem', color: '#6B7280', lineHeight: 1.6 }}>Votre coach n'a pas encore assigné de programme. Contactez-le via la messagerie.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {displayPrograms.map((prog: any) => {
            const isOpen = expandedProgram === prog.id;
            const isAccepted = prog.status === 'active' || (!!acceptedPrograms[prog.id] && prog.status !== 'pending');
            const startDateStr = prog.startDate
              ? new Date(prog.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : prog.assignedAt ? new Date((prog.assignedAt.toDate ? prog.assignedAt.toDate() : prog.assignedAt)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
            const days = daysSince(prog.assignedAt);
            const totalEx = (prog.sessions || []).reduce((a: number, s: any) => a + (s.exercises?.length || 0), 0);
            return (
              <div key={prog.id} style={{ background: '#1c1b1b', borderRadius: 14, border: `1px solid ${isAccepted ? 'rgba(255,255,255,0.06)' : 'rgba(178,42,39,0.3)'}`, overflow: 'hidden' }}>
                {/* Accepter le défi banner */}
                {!isAccepted && (
                  <div style={{ background: 'linear-gradient(135deg,rgba(137,7,14,0.15),rgba(178,42,39,0.08))', borderBottom: '1px solid rgba(178,42,39,0.2)', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#e5e2e1', letterSpacing: '-.02em' }}>Nouveau programme assigné !</div>
                      <div style={{ fontSize: '.64rem', color: '#9CA3AF', marginTop: 3 }}>Votre coach vous a préparé un programme. Prêt à relever le défi ?</div>
                    </div>
                    <button
                      onClick={() => acceptProgram(prog.id)}
                      style={{ background: 'linear-gradient(135deg,#89070e,#b22a27)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.72rem', letterSpacing: '.06em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' as const }}
                    >
                      ACCEPTER LE DÉFI
                    </button>
                  </div>
                )}

                {/* Card header */}
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: '.55rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: isAccepted ? '#16a34a' : '#6B7280', background: isAccepted ? 'rgba(22,163,74,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 4 }}>{isAccepted ? '● EN COURS' : 'EN ATTENTE'}</span>
                      </div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: 'clamp(.9rem,2.5vw,1.1rem)', color: '#e5e2e1', letterSpacing: '-.03em', marginBottom: 6 }}>{prog.title}</div>
                      <div style={{ fontSize: '.64rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                        {prog.goal && <span>{prog.goal}</span>}
                        {prog.level && <span> · {prog.level}</span>}
                        {prog.durationWeeks && <span> · {prog.durationWeeks} semaines</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.66rem', color: '#9CA3AF', marginBottom: 2 }}>Début</div>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.78rem', color: '#e5e2e1' }}>{startDateStr}</div>
                      <div style={{ fontSize: '.6rem', color: '#6B7280', marginTop: 4 }}>{days} jours</div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                    {[
                      { label: 'Séances/sem', val: `${prog.sessionsPerWeek || '—'} x` },
                      { label: 'Exercices', val: String(totalEx) },
                      { label: 'Durée', val: `${prog.durationWeeks || '—'} sem.` },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.88rem', color: '#b22a27' }}>{s.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar — based on actual completions */}
                  {(() => {
                    const allDone = (prog.sessions || []).reduce((acc: number, s: any, si: number) => acc + ((s.exercises || []) as any[]).filter((_: any, ei: number) => completions[`${prog.id}_${si}_${ei}`]).length, 0);
                    const progPct = totalEx > 0 ? Math.min(100, Math.round((allDone / totalEx) * 100)) : 0;
                    return (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#6B7280' }}>Progression</span>
                          <span style={{ fontSize: '.56rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: progPct === 100 ? '#16a34a' : '#b22a27' }}>{progPct}%</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progPct}%`, background: progPct === 100 ? 'linear-gradient(90deg,#14532d,#16a34a)' : 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Toggle button — uniquement si programme accepté */}
                  {isAccepted && (prog.sessions?.length > 0 || prog.weeklyMealPlan?.length > 0) && (
                    <button
                      onClick={() => { setExpandedProgram(isOpen ? null : prog.id); setExpandedProgSession(null); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.62rem', letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#9CA3AF', transition: 'all .15s' }}
                    >
                      {isOpen ? '▲ MASQUER LE DÉTAIL' : '▼ VOIR LE DÉTAIL'}
                    </button>
                  )}
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Meal plan */}
                    {prog.weeklyMealPlan?.length > 0 && (
                      <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginBottom: 12 }}>🍽️ Plan repas de la semaine</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                          {prog.weeklyMealPlan.map((m: any, i: number) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '.66rem', color: '#b22a27', letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 5 }}>{m.meal}</div>
                              <div style={{ fontSize: '.72rem', color: '#9CA3AF', lineHeight: 1.6 }}>{m.recipe}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sessions accordion */}
                    {prog.sessions?.length > 0 && (
                      <div style={{ padding: '18px 22px' }}>
                        <div style={{ fontSize: '.56rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#9CA3AF', marginBottom: 16 }}>📅 Sessions d'entraînement</div>

                        {/* ── BARRE DE PROGRESSION SÉANCES ── */}
                        <div style={{ marginBottom: 20, paddingBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                            {prog.sessions.map((session: any, si: number) => {
                              const exCount = (session.exercises?.length || 0);
                              const doneCount = exCount > 0 ? (session.exercises as any[]).filter((_: any, ei: number) => completions[`${prog.id}_${si}_${ei}`]).length : 0;
                              const status = doneCount >= exCount && exCount > 0 ? 'done' : doneCount > 0 ? 'current' : 'todo';
                              return (
                                <div key={si} style={{ display: 'flex', alignItems: 'center' }}>
                                  {si > 0 && <div style={{ width: 12, height: 2, background: status === 'current' ? '#b22a27' : status === 'done' ? '#b22a27' : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: status === 'done' ? '#b22a27' : 'transparent', border: status === 'done' ? 'none' : status === 'current' ? '2px solid #b22a27' : '2px solid rgba(255,255,255,0.18)', fontSize: '.62rem', color: status === 'done' ? '#fff' : status === 'current' ? '#b22a27' : '#6B7280', fontFamily: 'Lexend, sans-serif', fontWeight: 900, transition: 'all .2s' }}>
                                      {status === 'done' ? '✓' : status === 'current' ? '→' : String(si + 1)}
                                    </div>
                                    <div style={{ fontSize: '.48rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, letterSpacing: '.06em', color: status === 'done' ? '#b22a27' : status === 'current' ? '#e5e2e1' : '#6B7280', textAlign: 'center', lineHeight: 1.2 }}>S{si + 1}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── SESSION ACCORDIONS ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {prog.sessions.map((session: any, si: number) => {
                            const sessKey = `${prog.id}-${si}`;
                            const sessOpen = expandedProgSession === sessKey;
                            const sessionPhoto = getSessionPhoto(session.label || '', session.focus || '');
                            return (
                              <div key={si} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sessOpen ? 'rgba(178,42,39,0.22)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color .2s' }}>
                                {/* Session header */}
                                <div
                                  onClick={() => { setExpandedProgSession(sessOpen ? null : sessKey); setExpandedEx(null); }}
                                  style={{ display: 'flex', alignItems: 'stretch', cursor: 'pointer', userSelect: 'none' as const, minHeight: 58 }}
                                >
                                  <div style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 800, fontSize: '.82rem', color: '#e5e2e1', letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        JOUR {session.day} — {session.label}
                                      </div>
                                      {session.focus && <div style={{ fontSize: '.6rem', color: '#9CA3AF', marginTop: 2 }}>{session.focus}</div>}
                                      <div style={{ fontSize: '.58rem', color: '#6B7280', marginTop: 2 }}>{session.exercises?.length || 0} exercice{(session.exercises?.length || 0) !== 1 ? 's' : ''}</div>
                                    </div>
                                    <span style={{ color: '#b22a27', fontSize: '.78rem', transition: 'transform .2s', transform: sessOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
                                  </div>
                                  {/* Photo strip — hidden < 400px via CSS */}
                                  <div className="cl-sess-photo" style={{ width: 60, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                                    <img src={sessionPhoto} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.28) saturate(0.65)' }} />
                                  </div>
                                </div>

                                {/* Session progress bar */}
                                {session.exercises?.length > 0 && (() => {
                                  const done = (session.exercises as any[]).filter((_, ei) => completions[`${prog.id}_${si}_${ei}`]).length;
                                  const total = session.exercises.length;
                                  const pct = Math.round((done / total) * 100);
                                  return (
                                    <div style={{ padding: '8px 14px 2px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: '0.6rem', fontFamily: 'Inter, sans-serif', color: '#9CA3AF', letterSpacing: '.08em' }}>PROGRESSION</span>
                                        <span style={{ fontSize: '0.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 700, color: pct === 100 ? '#16a34a' : '#b22a27' }}>{done}/{total}</span>
                                      </div>
                                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#14532d,#16a34a)' : 'linear-gradient(90deg,#89070e,#b22a27)', borderRadius: 999, transition: 'width .5s ease' }} />
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Exercises */}
                                {sessOpen && session.exercises?.length > 0 && (
                                  <div style={{ padding: '0 12px 14px' }}>
                                    {session.exercises.map((ex: any, ei: number) => {
                                      const exKey = `${prog.id}-${si}-${ei}`;
                                      const compKey = `${prog.id}_${si}_${ei}`;
                                      const exIsOpen = expandedEx === exKey;
                                      const isDone = !!completions[compKey];
                                      const isSaving = savingCompletion === compKey;
                                      return (
                                        <div key={ei} style={{ marginBottom: 8 }}>
                                          {/* Card FERMÉE */}
                                          <div
                                            style={{ background: isDone ? 'rgba(22,163,74,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDone ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: exIsOpen ? '10px 10px 0 0' : 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                                          >
                                            {/* Left: expand zone */}
                                            <div onClick={() => setExpandedEx(exIsOpen ? null : exKey)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                                              <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: isDone ? '#86efac' : '#e5e2e1', textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
                                              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>
                                                {ex.primary_muscle || ex.muscle || '—'} · {ex.sets} séries · {formatReps(String(ex.reps ?? ''))} · repos {ex.rest}
                                              </div>
                                            </div>
                                            {/* Right: validate + expand arrow */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                              <button
                                                onClick={e => { e.stopPropagation(); toggleExercise(prog.id, si, ei, ex.name, String(ex.reps ?? ''), ex.sets ?? 0); }}
                                                disabled={isSaving}
                                                style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${isDone ? '#16a34a' : 'rgba(178,42,39,0.5)'}`, background: isDone ? 'rgba(22,163,74,0.15)' : 'rgba(178,42,39,0.1)', cursor: isSaving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', opacity: isSaving ? 0.6 : 1 }}
                                                title={isDone ? 'Marquer non fait' : 'Valider'}
                                              >
                                                <span style={{ color: isDone ? '#16a34a' : '#b22a27', fontSize: '0.85rem', fontWeight: 700, transition: 'color .15s' }}>{isDone ? '✓' : '+'}</span>
                                              </button>
                                              <span onClick={() => setExpandedEx(exIsOpen ? null : exKey)} style={{ color: '#b22a27', fontSize: '0.75rem', transition: 'transform .2s', transform: exIsOpen ? 'rotate(180deg)' : 'none', cursor: 'pointer' }}>▼</span>
                                            </div>
                                          </div>

                                          {/* Card OUVERTE */}
                                          {exIsOpen && (
                                            <div style={{ background: '#1c1b1b', border: '1px solid rgba(178,42,39,0.25)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                                              {/* Photo */}
                                              <div style={{ position: 'relative', overflow: 'hidden', background: '#111' }}>
                                                <img
                                                  src={getMusclePhoto(ex.primary_muscle || ex.muscle || '')}
                                                  alt={ex.name || ''}
                                                  style={{ width: '100%', height: 'auto', minHeight: 70, maxHeight: 120, objectFit: 'contain', filter: 'brightness(0.28)', display: 'block' }}
                                                />
                                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1c1b1b 0%, transparent 70%)' }} />
                                                <div style={{ position: 'absolute', bottom: 10, left: 14, fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#fff' }}>{ex.name}</div>
                                              </div>

                                              {/* Prescription 3 col */}
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'rgba(255,255,255,0.03)', padding: 12 }}>
                                                {[
                                                  { label: 'SÉRIES', val: String(ex.sets ?? '—') },
                                                  { label: 'REPS/DURÉE', val: formatReps(String(ex.reps ?? '—')) },
                                                  { label: 'REPOS', val: ex.rest || '—' },
                                                ].map(s => (
                                                  <div key={s.label} style={{ textAlign: 'center' }}>
                                                    <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: '#b22a27', lineHeight: 1 }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#9CA3AF', marginTop: 4 }}>{s.label}</div>
                                                  </div>
                                                ))}
                                              </div>

                                              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {/* MISE EN PLACE */}
                                                {ex.instructions?.setup && (
                                                  <div>
                                                    <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>MISE EN PLACE</div>
                                                    <p style={{ fontSize: '0.78rem', color: '#e5e2e1', lineHeight: 1.65, margin: 0 }}>{ex.instructions.setup}</p>
                                                  </div>
                                                )}

                                                {/* EXÉCUTION */}
                                                {ex.instructions?.execution && (
                                                  <div>
                                                    <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 10 }}>EXÉCUTION</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                      {ex.instructions.execution
                                                        .split('. ')
                                                        .filter((phrase: string) => phrase.trim().length > 3)
                                                        .map((phrase: string, i: number) => (
                                                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#b22a27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 900, color: '#fff', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                                                            <span style={{ fontSize: '0.78rem', color: '#e5e2e1', lineHeight: 1.65 }}>{phrase}</span>
                                                          </div>
                                                        ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* CONSEILS */}
                                                {(ex.instructions?.tips?.length ?? 0) > 0 && (
                                                  <div>
                                                    <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>CONSEILS</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                      {ex.instructions!.tips!.map((tip: string, i: number) => (
                                                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                          <span style={{ color: '#16a34a', fontSize: '0.8rem', flexShrink: 0, lineHeight: 1.4 }}>✓</span>
                                                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.55 }}>{tip}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* ERREURS */}
                                                {(ex.instructions?.common_mistakes?.length ?? 0) > 0 && (
                                                  <div>
                                                    <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>ERREURS À ÉVITER</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                      {ex.instructions!.common_mistakes!.map((m: string, i: number) => (
                                                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                          <span style={{ color: '#b22a27', fontSize: '0.8rem', flexShrink: 0, lineHeight: 1.4 }}>✗</span>
                                                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.55 }}>{m}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
