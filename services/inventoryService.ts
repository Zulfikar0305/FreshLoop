// services/inventoryService.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import { upsertShoppingListItem } from './shoppingListService';

export type InventoryItemInput = {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
  price: number;
  category: string;
  storageLocation: string;
  photoUri?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
  price: number;
  status: string;
  category?: string;
  storageLocation?: string;
  photoUrl?: string;
};

export async function addInventoryItem(
  item: InventoryItemInput,
  userId: string
): Promise<void> {
  let photoUrl: string | undefined;

  if (item.photoUri) {
    const response = await fetch(item.photoUri);
    const blob = await response.blob();
    const storageRef = ref(storage, `inventoryImages/${userId}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    photoUrl = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, 'inventoryItems'), {
    userId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate ?? null,
    price: item.price,
    category: item.category,
    storageLocation: item.storageLocation,
    ...(photoUrl ? { photoUrl } : {}),
    createdAt: serverTimestamp(),
    status: 'active',
  });
}

export async function getUserInventory(userId: string): Promise<InventoryItem[]> {
  const q = query(
    collection(db, 'inventoryItems'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name ?? '',
      quantity: data.quantity ?? 0,
      unit: data.unit ?? '',
      expiryDate:
        data.expiryDate instanceof Timestamp
          ? data.expiryDate.toDate()
          : data.expiryDate ?? null,
      price: typeof data.price === 'number' ? data.price : 0,
      status: data.status ?? 'active',
      category: typeof data.category === 'string' ? data.category : undefined,
      storageLocation:
        typeof data.storageLocation === 'string' ? data.storageLocation : undefined,
      photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
    };
  });
}

export async function updateItemStatus(
  itemId: string,
  status: 'active' | 'used' | 'wasted'
): Promise<void> {
  const ref = doc(db, 'inventoryItems', itemId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();

  await updateDoc(ref, { status });

  if (status === 'used' || status === 'wasted') {
    const uid = typeof data.userId === 'string' ? data.userId : '';
    if (!uid) return;
    await upsertShoppingListItem(uid, {
      itemName: String(data.name ?? ''),
      category: typeof data.category === 'string' ? data.category : 'Other',
      lastKnownPrice: typeof data.price === 'number' ? data.price : 0,
      unit: typeof data.unit === 'string' ? data.unit : undefined,
    }).catch(() => {});
  }
}

export async function updateItemQuantity(
  itemId: string,
  quantity: number
): Promise<void> {
  const ref = doc(db, 'inventoryItems', itemId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();

  await updateDoc(ref, { quantity });

  if (quantity <= 0) {
    const uid = typeof data.userId === 'string' ? data.userId : '';
    if (!uid) return;
    await upsertShoppingListItem(uid, {
      itemName: String(data.name ?? ''),
      category: typeof data.category === 'string' ? data.category : 'Other',
      lastKnownPrice: typeof data.price === 'number' ? data.price : 0,
      unit: typeof data.unit === 'string' ? data.unit : undefined,
    }).catch(() => {});
  }
}