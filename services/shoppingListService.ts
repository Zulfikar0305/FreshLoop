import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export type ShoppingListItem = {
  id: string;
  userId: string;
  itemName: string;
  category: string;
  lastKnownPrice: number;
  unit?: string;
  addedAt: Date | null;
  updatedAt: Date | null;
};

/** Stable Firestore doc id per user + normalised item name (avoids duplicate docs). */
export function shoppingListDocId(userId: string, itemName: string): string {
  const slug = itemName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  const safeSlug = slug.length > 0 ? slug : 'item';
  return `${userId}_${safeSlug}`;
}

export type ReplenishPayload = {
  itemName: string;
  category: string;
  lastKnownPrice: number;
  unit?: string;
};

/**
 * Upserts a shopping-list row when pantry stock is depleted or an item is marked used/wasted.
 * Merges on same item name so replace price refreshes from Quick Add history.
 */
export async function upsertShoppingListItem(
  userId: string,
  payload: ReplenishPayload
): Promise<void> {
  const name = payload.itemName.trim();
  if (!name || !userId) return;

  const id = shoppingListDocId(userId, name);
  const ref = doc(db, 'shoppingList', id);
  const snap = await getDoc(ref);

  const base = {
    userId,
    itemName: name,
    category: payload.category.trim() || 'Other',
    lastKnownPrice:
      typeof payload.lastKnownPrice === 'number' && !Number.isNaN(payload.lastKnownPrice)
        ? payload.lastKnownPrice
        : 0,
    updatedAt: serverTimestamp(),
    ...(payload.unit?.trim() ? { unit: payload.unit.trim() } : {}),
  };

  await setDoc(
    ref,
    {
      ...base,
      ...(!snap.exists() ? { addedAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );
}

export async function removeShoppingListItem(docId: string): Promise<void> {
  await deleteDoc(doc(db, 'shoppingList', docId));
}

function sortShoppingRows(rows: ShoppingListItem[]): ShoppingListItem[] {
  rows.sort((a, b) => {
    const ta = a.updatedAt?.getTime() ?? a.addedAt?.getTime() ?? 0;
    const tb = b.updatedAt?.getTime() ?? b.addedAt?.getTime() ?? 0;
    return tb - ta;
  });
  return rows;
}

/** One-shot fetch (same ordering as subscription). */
export async function fetchShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const q = query(collection(db, 'shoppingList'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => mapSnap(d.id, d.data()));
  return sortShoppingRows(rows);
}

function mapSnap(id: string, data: Record<string, unknown>): ShoppingListItem {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    itemName: typeof data.itemName === 'string' ? data.itemName : '',
    category: typeof data.category === 'string' ? data.category : 'Other',
    lastKnownPrice:
      typeof data.lastKnownPrice === 'number' ? data.lastKnownPrice : 0,
    unit: typeof data.unit === 'string' ? data.unit : undefined,
    addedAt:
      data.addedAt instanceof Timestamp ? data.addedAt.toDate() : null,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  };
}

/** Live subscription — newest updates first when sorting client-side. */
export function subscribeShoppingList(
  userId: string,
  onItems: (items: ShoppingListItem[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'shoppingList'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = sortShoppingRows(
        snapshot.docs.map((d) => mapSnap(d.id, d.data()))
      );
      onItems(rows);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}
