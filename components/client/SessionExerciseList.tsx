'use client'

import { useState, useRef } from 'react'
import { useSession } from '@/hooks/useSession'

interface Exercise {
  name: string
  sets: number
  reps: any
  rest?: string
  duration?: number | null
  primary_muscle?: string
  muscle?: string
  instructions?: {
    setup?: string
    execution?: string
    tips?: string[]
    common_mistakes?: string[]
  }
}

interface Props {
  clientId: string
  coachId: string
  programId: string
  dayIndex: number
  exercises: Exercise[]
  completions: Record<string, boolean>
  savingCompletion: string | null
  expandedEx: string | null
  setExpandedEx: (id: string | null) => void
  toggleExercise: (assignmentId: string, si: number, ei: number, exName?: string, exReps?: string, exSets?: number) => void
  getMusclePhoto: (muscle: string) => string
  formatReps: (reps: string) => string
}

function SetRow({ setNumber, reps, weight, completed, onUpdate }: {
  setNumber: number
  reps: number | null
  weight: number | null
  completed: boolean
  onUpdate: (data: { reps?: number | null; weight?: number | null; completed?: boolean }) => void
}) {
  const [localReps, setLocalReps] = useState(reps !== null ? String(reps) : '')
  const [localWeight, setLocalWeight] = useState(weight !== null ? String(weight) : '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function debounced(data: { reps?: number | null; weight?: number | null }) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdate(data), 600)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 28px', gap: 6, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '0.68rem', color: completed ? '#16a34a' : '#9CA3AF' }}>{setNumber}</div>
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        value={localReps}
        onChange={e => { setLocalReps(e.target.value); debounced({ reps: e.target.value ? Number(e.target.value) : null }) }}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 8px', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', outline: 'none', width: '100%' }}
      />
      <input
        type="number"
        inputMode="decimal"
        placeholder="kg"
        value={localWeight}
        onChange={e => { setLocalWeight(e.target.value); debounced({ weight: e.target.value ? Number(e.target.value) : null }) }}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 8px', color: '#e5e2e1', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', outline: 'none', width: '100%' }}
      />
      <button
        onClick={() => onUpdate({ completed: !completed })}
        style={{ width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${completed ? '#16a34a' : 'rgba(255,255,255,0.15)'}`, background: completed ? 'rgba(22,163,74,0.15)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ color: completed ? '#16a34a' : '#6B7280', fontSize: '0.72rem', fontWeight: 700 }}>{completed ? '✓' : '○'}</span>
      </button>
    </div>
  )
}

export default function SessionExerciseList({
  clientId, coachId, programId, dayIndex,
  exercises, completions, savingCompletion,
  expandedEx, setExpandedEx,
  toggleExercise, getMusclePhoto, formatReps,
}: Props) {
  const exercisesFromProgram = exercises.map((ex, ei) => ({
    id: String(ei),
    sets: ex.sets || 3,
    reps: typeof ex.reps === 'number' ? ex.reps : null,
    duration: ex.duration ?? null,
  }))

  const { session, updateSet } = useSession({
    clientId, coachId, programId,
    weekNumber: 1, dayIndex,
    exercisesFromProgram,
  })

  return (
    <div style={{ padding: '0 12px 14px' }}>
      {exercises.map((ex: any, ei: number) => {
        const exKey = `${programId}-${dayIndex}-${ei}`
        const compKey = `${programId}_${dayIndex}_${ei}`
        const exIsOpen = expandedEx === exKey
        const isDone = !!completions[compKey]
        const isSaving = savingCompletion === compKey
        const sessionEx = session?.exercises?.find(e => e.exerciseId === String(ei))

        return (
          <div key={ei} style={{ marginBottom: 8 }}>
            {/* Closed card */}
            <div style={{ background: isDone ? 'rgba(22,163,74,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDone ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: exIsOpen ? '10px 10px 0 0' : 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div onClick={() => setExpandedEx(exIsOpen ? null : exKey)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: isDone ? '#86efac' : '#e5e2e1', textDecoration: isDone ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>
                  {ex.primary_muscle || ex.muscle || '—'} · {ex.sets} séries · {formatReps(String(ex.reps ?? ''))} · repos {ex.rest}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={e => { e.stopPropagation(); toggleExercise(programId, dayIndex, ei, ex.name, String(ex.reps ?? ''), ex.sets ?? 0) }}
                  disabled={isSaving}
                  style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${isDone ? '#16a34a' : 'rgba(178,42,39,0.5)'}`, background: isDone ? 'rgba(22,163,74,0.15)' : 'rgba(178,42,39,0.1)', cursor: isSaving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSaving ? 0.6 : 1 }}
                  title={isDone ? 'Marquer non fait' : 'Valider'}
                >
                  <span style={{ color: isDone ? '#16a34a' : '#b22a27', fontSize: '0.85rem', fontWeight: 700 }}>{isDone ? '✓' : '+'}</span>
                </button>
                <span onClick={() => setExpandedEx(exIsOpen ? null : exKey)} style={{ color: '#b22a27', fontSize: '0.75rem', transition: 'transform .2s', transform: exIsOpen ? 'rotate(180deg)' : 'none', cursor: 'pointer' }}>▼</span>
              </div>
            </div>

            {/* Expanded card */}
            {exIsOpen && (
              <div style={{ background: '#1c1b1b', border: '1px solid rgba(178,42,39,0.25)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                {/* Muscle photo */}
                <div style={{ position: 'relative', overflow: 'hidden', background: '#111' }}>
                  <img src={getMusclePhoto(ex.primary_muscle || ex.muscle || '')} alt={ex.name || ''} style={{ width: '100%', height: 'auto', minHeight: 70, maxHeight: 120, objectFit: 'contain', filter: 'brightness(0.28)', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1c1b1b 0%, transparent 70%)' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 14, fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#fff' }}>{ex.name}</div>
                </div>

                {/* Prescription */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'rgba(255,255,255,0.03)', padding: 12 }}>
                  {[{ label: 'SÉRIES', val: String(ex.sets ?? '—') }, { label: 'REPS/DURÉE', val: formatReps(String(ex.reps ?? '—')) }, { label: 'REPOS', val: ex.rest || '—' }].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: '#b22a27', lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#9CA3AF', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Set tracking */}
                {sessionEx && sessionEx.sets.length > 0 && (
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>SUIVI DES SÉRIES</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr 28px', gap: 6, marginBottom: 4 }}>
                      {['#', 'Reps', 'Kg', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#6B7280' }}>{h}</div>
                      ))}
                    </div>
                    {sessionEx.sets.map(s => (
                      <SetRow key={s.setNumber} setNumber={s.setNumber} reps={s.reps} weight={s.weight} completed={s.completed} onUpdate={data => updateSet(String(ei), s.setNumber, data)} />
                    ))}
                  </div>
                )}

                {/* Instructions */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ex.instructions?.setup && (
                    <div>
                      <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 8 }}>MISE EN PLACE</div>
                      <p style={{ fontSize: '0.78rem', color: '#e5e2e1', lineHeight: 1.65, margin: 0 }}>{ex.instructions.setup}</p>
                    </div>
                  )}
                  {ex.instructions?.execution && (
                    <div>
                      <div style={{ fontSize: '0.52rem', textTransform: 'uppercase' as const, letterSpacing: '.16em', color: '#9CA3AF', marginBottom: 10 }}>EXÉCUTION</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ex.instructions.execution.split('. ').filter((p: string) => p.trim().length > 3).map((p: string, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#b22a27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontFamily: 'Lexend, sans-serif', fontWeight: 900, color: '#fff', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                            <span style={{ fontSize: '0.78rem', color: '#e5e2e1', lineHeight: 1.65 }}>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
        )
      })}
    </div>
  )
}
