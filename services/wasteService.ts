/**
 * Waste logs only. Shopping-list auto-add runs from inventoryService when
 * quantity hits 0 or status becomes used/wasted (after pantry rows update).
 */
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { InventoryItem } from './inventoryService';

export type WasteStatus = 'used' | 'wasted';

export type WasteLog = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  price: number;
  status: WasteStatus;
  wastedAt: Date;
};

export async function createWasteLog(
  item: InventoryItem,
  userId: string,
  status: WasteStatus,
  quantityOverride?: number
): Promise<void> {
  await addDoc(collection(db, 'wasteLogs'), {
    userId,
    itemName: item.name,
    quantity: quantityOverride ?? item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate ?? null,
    price: typeof item.price === 'number' ? item.price : 0,
    wastedAt: serverTimestamp(),
    status,
  });
}

export async function getUserWasteLogs(userId: string): Promise<WasteLog[]> {
  const q = query(collection(db, 'wasteLogs'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    const st = data.status === 'used' ? 'used' : 'wasted';
    return {
      id: d.id,
      itemName: data.itemName ?? '',
      quantity: typeof data.quantity === 'number' ? data.quantity : 0,
      unit: typeof data.unit === 'string' ? data.unit : '',
      price: typeof data.price === 'number' ? data.price : 0,
      status: st,
      wastedAt:
        data.wastedAt instanceof Timestamp ? data.wastedAt.toDate() : new Date(),
    };
  });
}
