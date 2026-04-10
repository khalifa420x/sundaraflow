'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, getDocs, collection, query, where, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { AppUser } from '@/types/models'

interface AuthContextType {
  user: AppUser | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  error: string | null
  isCoach: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  isCoach: false,
  isClient: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubFirestoreRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current()
        unsubFirestoreRef.current = null
      }

      setFirebaseUser(fbUser)

      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        // Tentative 1 — docId = uid (coach ancien système)
        const directRef = doc(db, 'users', fbUser.uid)
        const directSnap = await getDoc(directRef)

        if (directSnap.exists()) {
          console.log('[Auth] Found by docId')
          setUser({ uid: fbUser.uid, ...directSnap.data() } as AppUser)
          setLoading(false)
          unsubFirestoreRef.current = onSnapshot(directRef, (snap) => {
            if (snap.exists()) setUser({ uid: fbUser.uid, ...snap.data() } as AppUser)
          })
          return
        }

        // Tentative 2 — uid field (clients nouveau système)
        const q = query(collection(db, 'users'), where('uid', '==', fbUser.uid))
        const snap = await getDocs(q)

        if (!snap.empty) {
          console.log('[Auth] Found by uid field')
          const userRef = snap.docs[0].ref
          setUser({ uid: fbUser.uid, ...snap.docs[0].data() } as AppUser)
          setLoading(false)
          unsubFirestoreRef.current = onSnapshot(userRef, (s) => {
            if (s.exists()) setUser({ uid: fbUser.uid, ...s.data() } as AppUser)
          })
          return
        }

        // Tentative 3 — fallback /clients
        const q2 = query(collection(db, 'clients'), where('uid', '==', fbUser.uid))
        const snap2 = await getDocs(q2)

        if (!snap2.empty) {
          console.log('[Auth] Found in /clients fallback')
          const d = snap2.docs[0].data()
          setUser({ uid: fbUser.uid, role: 'client', displayName: d.name, ...d } as AppUser)
          setLoading(false)
          return
        }

        console.warn('[Auth] User not found anywhere')
        setUser(null)
        setLoading(false)
      } catch (err: any) {
        console.error('[Auth] Error:', err)
        setError(err.message)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubFirestoreRef.current) unsubFirestoreRef.current()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      error,
      isCoach: user?.role === 'coach',
      isClient: user?.role === 'client',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
