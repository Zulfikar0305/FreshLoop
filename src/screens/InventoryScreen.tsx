import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { createWasteLog } from "../services/wasteService";
import { scheduleExpiryNotifications } from "../services/notificationService";

type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: Date | null;
};

function getDaysRemaining(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryColor(days: number | null): string {
  if (days === null) return "#555";
  if (days < 0) return "#c0392b";   // expired — red
  if (days <= 1) return "#e74c3c";  // 0–1 days — red
  if (days <= 3) return "#e67e22";  // 2–3 days — yellow/orange
  return "#27ae60";                 // >3 days — green
}

function getExpiryLabel(days: number | null): string {
  if (days === null) return "No expiry date";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
}

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "inventoryItems"),
        where("userId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);

      const fetched: InventoryItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name ?? "",
          quantity: data.quantity ?? 0,
          unit: data.unit ?? "",
          expiryDate: data.expiryDate instanceof Timestamp
            ? data.expiryDate.toDate()
            : data.expiryDate ?? null,
        };
      });

      setItems(fetched);
      scheduleExpiryNotifications(fetched);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleStatusUpdate = async (item: InventoryItem, status: "used" | "wasted") => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    try {
      await createWasteLog(item, currentUser.uid, status);
      await updateDoc(doc(db, "inventoryItems", item.id), { status });
      Alert.alert("Updated", `Item marked as ${status}.`, [
        { text: "OK", onPress: () => fetchItems() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Inventory</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No items found.</Text>
        }
        renderItem={({ item }) => {
          const days = getDaysRemaining(item.expiryDate);
          const color = getExpiryColor(days);
          const label = getExpiryLabel(days);
          return (
            <View style={styles.card}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.detail}>
                Quantity: {item.quantity} {item.unit}
              </Text>
              <Text style={[styles.detail, { color }]}>{label}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.usedButton]}
                  onPress={() => handleStatusUpdate(item, "used")}
                >
                  <Text style={styles.actionText}>Used</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.wasteButton]}
                  onPress={() => handleStatusUpdate(item, "wasted")}
                >
                  <Text style={styles.actionText}>Waste</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#555",
  },
  actions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  usedButton: {
    backgroundColor: "#27ae60",
  },
  wasteButton: {
    backgroundColor: "#e74c3c",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});