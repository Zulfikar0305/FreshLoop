import {
    addDoc,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/firebaseConfig";

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
  photoUrl?: string;
};

export async function addInventoryItem(
  item: InventoryItemInput,
  userId: string
): Promise<void> {
  let photoUrl: string | undefined;

  if (item.photoUri) {
    // Convert local URI to blob and upload to Firebase Storage.
    // Firebase Storage upload replaces the unstable local file:// path.
    const response = await fetch(item.photoUri);
    const blob = await response.blob();
    const storageRef = ref(storage, `inventoryImages/${userId}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    photoUrl = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "inventoryItems"), {
    userId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate ?? null,
    price: item.price,
    ...(photoUrl ? { photoUrl } : {}),
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
      photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined,
    };
  });
}

export async function updateItemStatus(
  itemId: string,
  status: "active" | "used" | "wasted"
): Promise<void> {
  await updateDoc(doc(db, "inventoryItems", itemId), { status });
}

export async function updateItemQuantity(
  itemId: string,
  quantity: number
): Promise<void> {
  await updateDoc(doc(db, "inventoryItems", itemId), { quantity });
}
