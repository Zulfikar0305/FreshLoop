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
import { auth } from "../firebase/firebaseConfig";
import { createWasteLog } from "../services/wasteService";
import { scheduleExpiryNotifications } from "../services/notificationService";
import {
  getUserInventory,
  updateItemStatus,
  type InventoryItem,
} from "../services/inventoryService";
import { COLORS } from "../constants/theme";

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      setLoading(false);
      return;
    }

    try {
      const fetched = await getUserInventory(currentUser.uid);
      setItems(fetched);
      scheduleExpiryNotifications(fetched).catch(console.warn);
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
    if (item.status !== "active") {
      Alert.alert("Already updated", `This item has already been marked as ${item.status}.`);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    setUpdatingId(item.id);
    try {
      await createWasteLog(item, currentUser.uid, status);
      await updateItemStatus(item.id, status);
      // Update local state directly — no full re-fetch
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status } : i))
      );
      Alert.alert("Updated", `Item marked as ${status}.`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setUpdatingId(null);
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
                  style={[
                    styles.actionButton,
                    styles.usedButton,
                    (item.status !== "active" || updatingId === item.id) && styles.disabledButton,
                  ]}
                  onPress={() => handleStatusUpdate(item, "used")}
                  disabled={item.status !== "active" || updatingId === item.id}
                >
                  <Text style={styles.actionText}>Used</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.wasteButton,
                    (item.status !== "active" || updatingId === item.id) && styles.disabledButton,
                  ]}
                  onPress={() => handleStatusUpdate(item, "wasted")}
                  disabled={item.status !== "active" || updatingId === item.id}
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 20,
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
    marginBottom: 16,
  },
  empty: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: 60,
    fontSize: 16,
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
  itemName: {
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
  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  usedButton: {
    backgroundColor: COLORS.primary,
  },
  wasteButton: {
    backgroundColor: COLORS.danger,
  },
  disabledButton: {
    opacity: 0.35,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});