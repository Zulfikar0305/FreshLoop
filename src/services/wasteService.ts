import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

type WasteStatus = "used" | "wasted";

type InventoryItemInput = {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
  price?: number;
};

export async function createWasteLog(
  item: InventoryItemInput,
  userId: string,
  status: WasteStatus
): Promise<void> {
  await addDoc(collection(db, "wasteLogs"), {
    userId,
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate ?? null,
    price: typeof item.price === "number" ? item.price : 0,
    wastedAt: serverTimestamp(),
    status,
  });
}
