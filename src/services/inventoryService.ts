import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export type InventoryItemInput = {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
  price: number;
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
};

export async function addInventoryItem(
  item: InventoryItemInput,
  userId: string
): Promise<void> {
  await addDoc(collection(db, "inventoryItems"), {
    userId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate ?? null,
    price: item.price,
    ...(item.photoUri ? { photoUri: item.photoUri } : {}),
    createdAt: serverTimestamp(),
    status: "active",
  });
}

export async function getUserInventory(userId: string): Promise<InventoryItem[]> {
  const q = query(
    collection(db, "inventoryItems"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name ?? "",
      quantity: data.quantity ?? 0,
      unit: data.unit ?? "",
      expiryDate:
        data.expiryDate instanceof Timestamp
          ? data.expiryDate.toDate()
          : data.expiryDate ?? null,
      price: typeof data.price === "number" ? data.price : 0,
      status: data.status ?? "active",
    };
  });
}

export async function updateItemStatus(
  itemId: string,
  status: "active" | "used" | "wasted"
): Promise<void> {
  await updateDoc(doc(db, "inventoryItems", itemId), { status });
}
