'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AppUser } from '@/types/models';

export interface UseCurrentUserResult {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  isCoach: boolean;
  isClient: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubFirestore: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = undefined; }

      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(fbUser);

      try {
        // Tentative 1 — anciens users : docId = Firebase UID (coaches)
        const directRef = doc(db, 'users', fbUser.uid);
        const directSnap = await getDoc(directRef);

        if (directSnap.exists()) {
          console.log('[useCurrentUser] Found by docId');
          setUser({ uid: fbUser.uid, ...directSnap.data() } as AppUser);
          setLoading(false);
          unsubFirestore = onSnapshot(directRef, (snap) => {
            if (snap.exists()) setUser({ uid: fbUser.uid, ...snap.data() } as AppUser);
          });
          return;
        }

        // Tentative 2 — nouveaux users : docId = emailToDocId, champ uid = Firebase UID (clients invités)
        const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', fbUser.uid)));
        if (!snap.empty) {
          console.log('[useCurrentUser] Found by uid field');
          const userRef = snap.docs[0].ref;
          setUser({ uid: fbUser.uid, ...snap.docs[0].data() } as AppUser);
          setLoading(false);
          unsubFirestore = onSnapshot(userRef, (s) => {
            if (s.exists()) setUser({ uid: fbUser.uid, ...s.data() } as AppUser);
          });
          return;
        }

        console.warn('[useCurrentUser] User not found in Firestore');
        setUser(null);
        setLoading(false);
      } catch (err: any) {
        console.error('[useCurrentUser] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  return {
    user,
    firebaseUser,
    loading,
    error,
    isCoach: user?.role === 'coach',
    isClient: user?.role === 'client',
  };
}
