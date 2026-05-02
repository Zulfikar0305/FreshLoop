import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { type InventoryItem } from "./inventoryService";

type WasteStatus = "used" | "wasted";

export async function createWasteLog(
  item: InventoryItem,
  userId: string,
  status: WasteStatus,
  quantityOverride?: number
): Promise<void> {
  await addDoc(collection(db, "wasteLogs"), {
    userId,
    itemName: item.name,
    quantity: quantityOverride ?? item.quantity,
    unit: item.unit,
    expiryDate: item.expiryDate ?? null,
    price: typeof item.price === "number" ? item.price : 0,
    wastedAt: serverTimestamp(),
    status,
  });
}
