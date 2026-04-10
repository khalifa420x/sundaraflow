'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      // Clean up previous Firestore listener when auth changes
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = undefined; }

      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(fbUser);

      // Real-time sync with users/{uid}
      unsubFirestore = onSnapshot(
        doc(db, 'users', fbUser.uid),
        (snap) => {
          if (snap.exists()) {
            setUser({ uid: fbUser.uid, ...snap.data() } as AppUser);
          } else {
            setUser(null);
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      );
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
