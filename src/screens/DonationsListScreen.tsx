import { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { COLORS } from "../constants/theme";
import BottomNav from "../components/BottomNav";

type Donation = {
  id: string;
  foodName: string;
  quantity: number;
  description: string;
  status: string;
  latitude?: number;
  longitude?: number;
};

export default function DonationsListScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";
  const [donations, setDonations] = useState<Donation[]>([]);
  const [claimedDonations, setClaimedDonations] = useState<Donation[]>([]);
  const [completedDonations, setCompletedDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const isCoordinator = role === "coordinator";

  const handleOpenMaps = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open the map. Please try again.")
    );
  };

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
      const completed = claimedDonations.find((d) => d.id === donationId);
      setClaimedDonations((prev) => prev.filter((d) => d.id !== donationId));
      if (completed) setCompletedDonations((prev) => [...prev, { ...completed, status: "completed" }]);
      Alert.alert("Pickup Confirmed ✅", "This donation has been marked as completed.");
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
        const mapDoc = (d: any): Donation => ({
          id: d.id,
          foodName: d.data().foodName ?? "",
          quantity: d.data().quantity ?? 0,
          description: d.data().description ?? "",
          status: d.data().status ?? "available",
          latitude: typeof d.data().latitude === "number" ? d.data().latitude : undefined,
          longitude: typeof d.data().longitude === "number" ? d.data().longitude : undefined,
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
          setCompletedDonations(
            claimedSnap.docs
              .filter((d) => d.data().status === "completed")
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
    <View style={styles.outerContainer}>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Donations</Text>

      {/* ══ Available ══ */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>📦 Available Donations</Text>
        <View style={[styles.statusBadge, styles.badgeAvailable]}>
          <Text style={styles.badgeText}>{donations.length}</Text>
        </View>
      </View>

      {donations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptyDesc}>No donations available right now. Check back soon.</Text>
        </View>
      ) : (
        donations.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <View style={[styles.statusBadge, styles.badgeAvailable]}>
                <Text style={styles.badgeText}>Available</Text>
              </View>
            </View>
            <Text style={styles.detail}>Qty: {item.quantity}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            {item.latitude != null && item.longitude != null ? (
              <>
                <Text style={styles.location}>📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                <TouchableOpacity style={styles.mapsButton} onPress={() => handleOpenMaps(item.latitude!, item.longitude!)}>
                  <Text style={styles.mapsButtonText}>Open in Maps</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {isCoordinator && (
              <TouchableOpacity
                style={[styles.claimButton, claimingId === item.id && styles.claimButtonDisabled]}
                onPress={() => handleClaim(item.id)}
                disabled={claimingId !== null}
              >
                <Text style={styles.claimButtonText}>
                  {claimingId === item.id ? "Claiming..." : "Claim Donation"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* ══ Claimed (coordinator only) ══ */}
      {isCoordinator && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>🤝 Claimed by You</Text>
            <View style={[styles.statusBadge, styles.badgeClaimed]}>
              <Text style={styles.badgeText}>{claimedDonations.length}</Text>
            </View>
          </View>

          {claimedDonations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👀</Text>
              <Text style={styles.emptyTitle}>Nothing claimed yet</Text>
              <Text style={styles.emptyDesc}>Claim an available donation above to start coordinating a pickup.</Text>
            </View>
          ) : (
            claimedDonations.map((item) => (
              <View key={item.id} style={[styles.card, styles.cardClaimed]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.foodName}>{item.foodName}</Text>
                  <View style={[styles.statusBadge, styles.badgeClaimed]}>
                    <Text style={styles.badgeText}>Claimed</Text>
                  </View>
                </View>
                <Text style={styles.detail}>Qty: {item.quantity}</Text>
                {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                {item.latitude != null && item.longitude != null ? (
                  <>
                    <Text style={styles.location}>📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                    <TouchableOpacity style={styles.mapsButton} onPress={() => handleOpenMaps(item.latitude!, item.longitude!)}>
                      <Text style={styles.mapsButtonText}>Open in Maps</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                <TouchableOpacity
                  style={[styles.confirmButton, confirmingId === item.id && styles.confirmButtonDisabled]}
                  onPress={() => handleConfirmPickup(item.id)}
                  disabled={confirmingId !== null}
                >
                  <Text style={styles.claimButtonText}>
                    {confirmingId === item.id ? "Confirming..." : "Confirm Pickup"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ══ Completed ══ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>✅ Completed</Text>
            <View style={[styles.statusBadge, styles.badgeCompleted]}>
              <Text style={styles.badgeText}>{completedDonations.length}</Text>
            </View>
          </View>

          {completedDonations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🌟</Text>
              <Text style={styles.emptyTitle}>No completed donations yet</Text>
              <Text style={styles.emptyDesc}>Completed pickups will appear here.</Text>
            </View>
          ) : (
            completedDonations.map((item) => (
              <View key={item.id} style={[styles.card, styles.cardCompleted]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.foodName}>{item.foodName}</Text>
                  <View style={[styles.statusBadge, styles.badgeCompleted]}>
                    <Text style={styles.badgeText}>Completed</Text>
                  </View>
                </View>
                <Text style={styles.detail}>Qty: {item.quantity}</Text>
                {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              </View>
            ))
          )}
        </>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
    <BottomNav navigation={navigation} active="DonationsList" role={role} userData={userData} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 20,
  },
  // Section headings
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingLeft: 10,
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  // Status badges
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeAvailable: {
    backgroundColor: "#d1fae5",
  },
  badgeClaimed: {
    backgroundColor: "#dbeafe",
  },
  badgeCompleted: {
    backgroundColor: "#e0e7ff",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  // Card variants
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardClaimed: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  cardCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: "#6366f1",
    opacity: 0.85,
  },
  // Empty states
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  location: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  mapsButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  mapsButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  claimButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: "#80CECE",
  },
  claimButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#FFBD90",
  },
});
