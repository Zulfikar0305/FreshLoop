// services/inAppNotificationService.ts
// Firestore-backed in-app notifications for all home user events.
// Collection: notifications/{auto-id}
// Fields: userId, type, title, message, isRead, createdAt

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export type NotificationType = 'expiry' | 'donation' | 'claim' | 'report' | 'system';

export type InAppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | null;
};

const VALID_TYPES: NotificationType[] = ['expiry', 'donation', 'claim', 'report', 'system'];

function mapNotifSnap(id: string, data: Record<string, unknown>): InAppNotification {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    type: VALID_TYPES.includes(data.type as NotificationType)
      ? (data.type as NotificationType)
      : 'system',
    title: typeof data.title === 'string' ? data.title : '',
    message: typeof data.message === 'string' ? data.message : '',
    isRead: data.isRead === true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  };
}

export async function createNotification(
  userId: string,
  data: { type: NotificationType; title: string; message: string },
): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type: data.type,
    title: data.title,
    message: data.message,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeNotifications(
  userId: string,
  onItems: (items: InAppNotification[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) =>
        mapNotifSnap(d.id, d.data() as Record<string, unknown>),
      );
      // Sort newest-first client-side — avoids composite Firestore index requirement
      items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      onItems(items);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', notificationId));
}
