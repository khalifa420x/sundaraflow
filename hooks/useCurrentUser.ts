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

async function findUserDoc(uid: string): Promise<{ ref: any; data: any } | null> {
  // 1. Coach ancien système — docId = Firebase UID
  try {
    const directRef = doc(db, 'users', uid);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      console.log('[useCurrentUser] Found by docId');
      return { ref: directRef, data: directSnap.data() };
    }
  } catch (e) {
    console.warn('[useCurrentUser] Direct lookup failed:', e);
  }

  // 2. Client nouveau système — docId = emailToDocId, champ uid = Firebase UID
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    if (!snap.empty) {
      console.log('[useCurrentUser] Found by uid field');
      return { ref: snap.docs[0].ref, data: snap.docs[0].data() };
    }
  } catch (e) {
    console.warn('[useCurrentUser] Query by uid failed:', e);
  }

  // 3. Fallback sur /clients
  try {
    const snap2 = await getDocs(query(collection(db, 'clients'), where('uid', '==', uid)));
    if (!snap2.empty) {
      console.log('[useCurrentUser] Found in /clients');
      const d = snap2.docs[0].data();
      return { ref: snap2.docs[0].ref, data: { ...d, role: 'client', displayName: d.name } };
    }
  } catch (e) {
    console.warn('[useCurrentUser] Clients fallback failed:', e);
  }

  return null;
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
        const result = await findUserDoc(fbUser.uid);
        if (!result) {
          console.warn('[useCurrentUser] User not found in Firestore');
          setUser(null);
          setLoading(false);
          return;
        }
        setUser({ uid: fbUser.uid, ...result.data } as AppUser);
        setLoading(false);
        unsubFirestore = onSnapshot(result.ref, (snap: any) => {
          if (snap.exists()) setUser({ uid: fbUser.uid, ...snap.data() } as AppUser);
        });
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
