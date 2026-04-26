import { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

type Donation = {
  id: string;
  foodName: string;
  quantity: number;
  description: string;
};

export default function DonationsListScreen() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [claimedDonations, setClaimedDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isCoordinator = userRole === "coordinator";

  const handleClaim = async (donationId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    if (!isCoordinator) {
      Alert.alert("Access Denied", "Only coordinators can claim donations.");
      return;
    }

    setClaimingId(donationId);
    try {
      const claimedItem = donations.find((d) => d.id === donationId);
      await updateDoc(doc(db, "donations", donationId), {
        status: "claimed",
        claimedBy: currentUser.uid,
        claimedAt: serverTimestamp(),
      });
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
      if (claimedItem) {
        setClaimedDonations((prev) => [...prev, claimedItem]);
      }
      Alert.alert("Success", "Donation claimed successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleConfirmPickup = async (donationId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    setConfirmingId(donationId);
    try {
      await updateDoc(doc(db, "donations", donationId), {
        status: "completed",
        completedAt: serverTimestamp(),
      });
      setClaimedDonations((prev) => prev.filter((d) => d.id !== donationId));
      Alert.alert("Success", "Pickup confirmed.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setConfirmingId(null);
    }
  };

  useEffect(() => {
    const fetchRoleAndDonations = async () => {
      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (userSnap.exists()) {
            setUserRole(userSnap.data().role ?? null);
          }
        }

        const mapDoc = (d: any): Donation => ({
          id: d.id,
          foodName: d.data().foodName ?? "",
          quantity: d.data().quantity ?? 0,
          description: d.data().description ?? "",
        });

        const availableQ = query(
          collection(db, "donations"),
          where("status", "==", "available")
        );
        const availableSnap = await getDocs(availableQ);
        setDonations(availableSnap.docs.map(mapDoc));

        if (currentUser) {
          const claimedQ = query(
            collection(db, "donations"),
            where("claimedBy", "==", currentUser.uid)
          );
          const claimedSnap = await getDocs(claimedQ);
          setClaimedDonations(
            claimedSnap.docs
              .filter((d) => d.data().status === "claimed")
              .map(mapDoc)
          );
        }
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoleAndDonations();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Available Donations</Text>

      {donations.length === 0 && (
        <Text style={styles.empty}>No donations available.</Text>
      )}
      {donations.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <Text style={styles.detail}>Quantity: {item.quantity}</Text>
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}
          {isCoordinator && (
            <TouchableOpacity
              style={[
                styles.claimButton,
                claimingId === item.id && styles.claimButtonDisabled,
              ]}
              onPress={() => handleClaim(item.id)}
              disabled={claimingId !== null}
            >
              <Text style={styles.claimButtonText}>
                {claimingId === item.id ? "Claiming..." : "Claim"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {isCoordinator && (
        <>
          <Text style={styles.sectionTitle}>Your Claimed Donations</Text>

          {claimedDonations.length === 0 && (
            <Text style={styles.empty}>No claimed donations.</Text>
          )}
          {claimedDonations.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <Text style={styles.detail}>Quantity: {item.quantity}</Text>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  confirmingId === item.id && styles.confirmButtonDisabled,
                ]}
                onPress={() => handleConfirmPickup(item.id)}
                disabled={confirmingId !== null}
              >
                <Text style={styles.claimButtonText}>
                  {confirmingId === item.id ? "Confirming..." : "Confirm Pickup"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f2f7f2",
    padding: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f7f2",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  empty: {
    marginTop: 32,
    textAlign: "center",
    color: "#aaa",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  foodName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  claimButton: {
    marginTop: 12,
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: "#a5d6a7",
  },
  claimButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 32,
    marginBottom: 12,
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: "#1565c0",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#90caf9",
  },
});
