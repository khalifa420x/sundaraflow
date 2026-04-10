'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ExerciseSet {
  setNumber: number
  reps: number | null
  weight: number | null
  completed: boolean
}

export interface SessionExercise {
  exerciseId: string
  completed: boolean
  sets: ExerciseSet[]
}

export interface Session {
  sessionId: string
  clientId: string
  coachId: string
  programId: string
  weekNumber: number
  dayIndex: number
  date: string
  status: 'pending' | 'in_progress' | 'completed'
  completedAt: number | null
  exercises: SessionExercise[]
}

interface UseSessionParams {
  clientId: string
  coachId: string
  programId: string
  weekNumber: number
  dayIndex: number
  exercisesFromProgram: Array<{
    id: string
    sets: number
    reps: number | null
    duration: number | null
  }>
}

export function useSession({
  clientId,
  coachId,
  programId,
  weekNumber,
  dayIndex,
  exercisesFromProgram,
}: UseSessionParams) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const date = new Date().toISOString().split('T')[0]
  const sessionId = `${clientId}_${programId}_w${weekNumber}_d${dayIndex}_${date}`

  useEffect(() => {
    if (!clientId || !programId) return
    loadOrCreateSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, programId, weekNumber, dayIndex])

  async function loadOrCreateSession() {
    setLoading(true)
    try {
      const sessionRef = doc(db, 'sessions', sessionId)
      const snap = await getDoc(sessionRef)

      if (snap.exists()) {
        console.log('[useSession] Session loaded:', sessionId)
        setSession(snap.data() as Session)
      } else {
        const newSession: Session = {
          sessionId,
          clientId,
          coachId,
          programId,
          weekNumber,
          dayIndex,
          date,
          status: 'in_progress',
          completedAt: null,
          exercises: exercisesFromProgram.map(ex => ({
            exerciseId: ex.id,
            completed: false,
            sets: Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: ex.reps,
              weight: null,
              completed: false,
            })),
          })),
        }
        await setDoc(sessionRef, newSession)
        console.log('[useSession] Session created:', sessionId)
        setSession(newSession)
      }
    } catch (err: any) {
      console.error('[useSession] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function markExerciseComplete(exerciseId: string, completed: boolean) {
    if (!session) return
    try {
      const updatedExercises = session.exercises.map(ex =>
        ex.exerciseId === exerciseId ? { ...ex, completed } : ex
      )
      const allCompleted = updatedExercises.every(ex => ex.completed)
      const updates: Partial<Session> = {
        exercises: updatedExercises,
        status: allCompleted ? 'completed' : 'in_progress',
        completedAt: allCompleted ? Date.now() : null,
      }
      await updateDoc(doc(db, 'sessions', sessionId), updates)
      setSession(prev => prev ? { ...prev, ...updates } : null)
      console.log('[useSession] Exercise marked:', exerciseId, completed)
    } catch (err: any) {
      console.error('[useSession] markExerciseComplete error:', err)
    }
  }

  async function updateSet(exerciseId: string, setNumber: number, data: Partial<ExerciseSet>) {
    if (!session) return
    try {
      const updatedExercises = session.exercises.map(ex => {
        if (ex.exerciseId !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map(s =>
            s.setNumber === setNumber ? { ...s, ...data } : s
          ),
        }
      })
      await updateDoc(doc(db, 'sessions', sessionId), { exercises: updatedExercises })
      setSession(prev => prev ? { ...prev, exercises: updatedExercises } : null)
    } catch (err: any) {
      console.error('[useSession] updateSet error:', err)
    }
  }

  return { session, loading, error, markExerciseComplete, updateSet }
}
