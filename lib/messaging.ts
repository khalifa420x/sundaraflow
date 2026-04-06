import { db } from '@/lib/firebase';
import {
  doc, collection, addDoc, setDoc,
  onSnapshot, query, orderBy, Timestamp, increment,
} from 'firebase/firestore';

/* ── ID du document de conversation (toujours coachId_clientId) ── */
export function getConversationId(coachId: string, clientId: string): string {
  return `${coachId}_${clientId}`;
}

/* ── Envoyer un message ── */
export async function sendMessage(
  coachId: string,
  clientId: string,
  senderId: string,
  senderName: string,
  content: string,
): Promise<void> {
  const convId = getConversationId(coachId, clientId);
  const convRef = doc(db, 'conversations', convId);
  const messagesRef = collection(db, 'conversations', convId, 'messages');
  const isCoach = senderId === coachId;

  try {
    await addDoc(messagesRef, {
      senderId,
      senderName,
      content,
      timestamp: Timestamp.now(),
      read: false,
      type: 'text',
    });

    await setDoc(
      convRef,
      {
        coachId,
        clientId,
        lastMessage: content,
        lastMessageAt: Timestamp.now(),
        ...(isCoach
          ? { unreadClient: increment(1) }
          : { unreadCoach: increment(1) }),
      },
      { merge: true },
    );
  } catch (e) {
    console.error('sendMessage error:', e);
    throw e;
  }
}

/* ── Marquer comme lu ── */
export async function markAsRead(
  coachId: string,
  clientId: string,
  role: 'coach' | 'client',
): Promise<void> {
  const convId = getConversationId(coachId, clientId);
  const convRef = doc(db, 'conversations', convId);
  try {
    await setDoc(
      convRef,
      { [role === 'coach' ? 'unreadCoach' : 'unreadClient']: 0 },
      { merge: true },
    );
  } catch (e) {
    console.error('markAsRead error:', e);
  }
}

/* ── Abonnement temps réel aux messages ── */
export function subscribeToMessages(
  coachId: string,
  clientId: string,
  callback: (messages: any[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const convId = getConversationId(coachId, clientId);
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('timestamp', 'asc'),
  );

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error('subscribeToMessages error:', err);
      onError?.(err);
    },
  );
}
