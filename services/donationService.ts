// services/donationService.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { createNotification } from './inAppNotificationService';

export type DonationStatus = 'available' | 'claimed' | 'completed' | 'cancelled';

export type DonationListing = {
  id: string;
  donorId: string;
  donorRole: 'home' | 'business';
  donorName: string;
  foodName: string;
  quantity: string;
  unit: string;
  category: string;
  storageInstructions: string;
  expiryDate: Date | null;
  pickupAddress: string;
  pickupWindow: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  status: DonationStatus;
  claimedBy: string | null;
  claimedByName: string | null;
  claimedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  visibleUntil: Date | null;
};

export type CreateDonationInput = {
  donorId: string;
  donorRole: 'home' | 'business';
  donorName: string;
  foodName: string;
  quantity: string;
  unit: string;
  category: string;
  storageInstructions: string;
  expiryDate: string;
  pickupAddress: string;
  pickupWindow: string;
  city: string;
  latitude?: number;
  longitude?: number;
  notes: string;
  visibleUntil?: string;
};

function mapSnap(id: string, data: Record<string, unknown>): DonationListing {
  return {
    id,
    donorId: typeof data.donorId === 'string' ? data.donorId : '',
    donorRole: (data.donorRole === 'home' || data.donorRole === 'business') ? data.donorRole : 'business',
    donorName: typeof data.donorName === 'string' ? data.donorName : '',
    foodName: typeof data.foodName === 'string' ? data.foodName : '',
    quantity: typeof data.quantity === 'string' ? data.quantity : '',
    unit: typeof data.unit === 'string' ? data.unit : '',
    category: typeof data.category === 'string' ? data.category : '',
    storageInstructions: typeof data.storageInstructions === 'string' ? data.storageInstructions : '',
    expiryDate: data.expiryDate instanceof Timestamp ? data.expiryDate.toDate() : null,
    pickupAddress: typeof data.pickupAddress === 'string' ? data.pickupAddress : '',
    pickupWindow: typeof data.pickupWindow === 'string' ? data.pickupWindow : '',
    city: typeof data.city === 'string' ? data.city : '',
    latitude: typeof data.latitude === 'number' ? data.latitude : null,
    longitude: typeof data.longitude === 'number' ? data.longitude : null,
    notes: typeof data.notes === 'string' ? data.notes : '',
    status: (['available', 'claimed', 'completed', 'cancelled'] as DonationStatus[]).includes(data.status as DonationStatus)
      ? (data.status as DonationStatus)
      : 'available',
    claimedBy: typeof data.claimedBy === 'string' ? data.claimedBy : null,
    claimedByName: typeof data.claimedByName === 'string' ? data.claimedByName : null,
    claimedAt: data.claimedAt instanceof Timestamp ? data.claimedAt.toDate() : null,
    completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
    visibleUntil: data.visibleUntil instanceof Timestamp ? data.visibleUntil.toDate() : null,
  };
}

export async function createDonationListing(input: CreateDonationInput): Promise<string> {
  // Always use the live Firebase Auth UID so that
  // request.resource.data.donorId == request.auth.uid is guaranteed.
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('You must be signed in to publish a donation listing.');
  }

  let expiryTimestamp: Timestamp | null = null;
  if (input.expiryDate) {
    const d = new Date(input.expiryDate);
    if (!isNaN(d.getTime())) {
      expiryTimestamp = Timestamp.fromDate(d);
    }
  }

  let visibleUntilTs: Timestamp | null = null;
  if (input.visibleUntil) {
    const d = new Date(input.visibleUntil);
    if (!isNaN(d.getTime())) visibleUntilTs = Timestamp.fromDate(d);
  }

  const ref = await addDoc(collection(db, 'donations'), {
    donorId: currentUid,
    donorRole: input.donorRole,
    donorName: (input.donorName || 'Business Donor').trim() || 'Business Donor',
    foodName: input.foodName.trim(),
    quantity: input.quantity.trim(),
    unit: input.unit.trim(),
    category: input.category,
    storageInstructions: input.storageInstructions.trim(),
    expiryDate: expiryTimestamp,
    pickupAddress: input.pickupAddress.trim(),
    pickupWindow: input.pickupWindow.trim(),
    city: input.city.trim() || 'Durban',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    notes: input.notes.trim(),
    visibleUntil: visibleUntilTs,
    status: 'available',
    claimedBy: null,
    claimedByName: null,
    claimedAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeAvailableDonations(
  onItems: (items: DonationListing[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'donations'), where('status', '==', 'available'));
  return onSnapshot(
    q,
    (snap) => {
      const now = new Date();
      const items = snap.docs
        .map((d) => mapSnap(d.id, d.data()))
        // Exclude listings whose visibleUntil has passed; keep those with no visibleUntil set
        .filter((d) => !d.visibleUntil || d.visibleUntil > now);
      onItems(items);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  );
}

export async function claimDonation(
  donationId: string,
  claimedBy: string,
  claimedByName: string,
): Promise<void> {
  // Read donor info first so we can send them a claim notification
  const snap = await getDoc(doc(db, 'donations', donationId));
  const donorId  = snap.exists() ? (snap.data().donorId  as string | undefined) : undefined;
  const foodName = snap.exists() ? (snap.data().foodName as string | undefined) : undefined;

  await updateDoc(doc(db, 'donations', donationId), {
    status: 'claimed',
    claimedBy,
    claimedByName,
    claimedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Notify the donor that their listing was claimed
  if (donorId) {
    createNotification(donorId, {
      type:    'claim',
      title:   'Listing claimed! 🎉',
      message: `${claimedByName} has claimed your ${foodName ?? 'donation'}. Check Pickups for collection details.`,
    }).catch(() => {});
  }

  // Notify the NPO/coordinator that their claim was successful
  createNotification(claimedBy, {
    type:    'claim',
    title:   'Donation claimed ✅',
    message: `You claimed ${foodName ?? 'a donation'}. It is now in Active Pickups.`,
  }).catch(() => {});
}

export function subscribeClaimedDonations(
  npoUserId: string,
  onItems: (items: DonationListing[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'donations'),
    where('claimedBy', '==', npoUserId),
    where('status', 'in', ['claimed', 'completed']),
  );
  return onSnapshot(
    q,
    (snap) => onItems(snap.docs.map((d) => mapSnap(d.id, d.data()))),
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  );
}

export async function completeDonation(donationId: string): Promise<void> {
  await updateDoc(doc(db, 'donations', donationId), {
    status: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeDonorDonations(
  donorId: string,
  onItems: (items: DonationListing[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'donations'), where('donorId', '==', donorId));
  return onSnapshot(
    q,
    (snap) => onItems(snap.docs.map((d) => mapSnap(d.id, d.data()))),
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  );
}
