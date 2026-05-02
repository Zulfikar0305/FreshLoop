import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import { auth } from "../firebase/firebaseConfig";
import { createWasteLog } from "../services/wasteService";
import { scheduleExpiryNotifications } from "../services/notificationService";
import {
  getUserInventory,
  updateItemStatus,
  updateItemQuantity,
  type InventoryItem,
} from "../services/inventoryService";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../theme/colors";
import BottomNav from "../components/BottomNav";

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

export default function InventoryScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";

  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "expiring" | "used" | "wasted">("all");

  type PartialModal = { visible: boolean; item: InventoryItem | null; status: "used" | "wasted"; qty: string };
  const [partialModal, setPartialModal] = useState<PartialModal>({ visible: false, item: null, status: "used", qty: "" });

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

  const doPartialUpdate = async () => {
    const { item, status, qty } = partialModal;
    if (!item) return;
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid", "Please enter a quantity greater than 0.");
      return;
    }
    if (parsed > item.quantity) {
      Alert.alert("Invalid", `Maximum is ${item.quantity} ${item.unit || "unit(s)"}.`);
      return;
    }
    setPartialModal((m) => ({ ...m, visible: false }));
    setUpdatingId(item.id);
    const currentUser = auth.currentUser;
    if (!currentUser) { Alert.alert("Error", "Not logged in."); setUpdatingId(null); return; }
    try {
      await createWasteLog(item, currentUser.uid, status, parsed);
      if (parsed >= item.quantity) {
        await updateItemStatus(item.id, status);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
      } else {
        const newQty = item.quantity - parsed;
        await updateItemQuantity(item.id, newQty);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setUpdatingId(null);
      setPartialModal({ visible: false, item: null, status: "used", qty: "" });
    }
  };

  const handleStatusUpdate = (item: InventoryItem, status: "used" | "wasted") => {
    if (item.status !== "active") {
      Alert.alert("Already updated", `This item has already been marked as ${item.status}.`);
      return;
    }
    if (item.quantity > 1) {
      setPartialModal({ visible: true, item, status, qty: "" });
      return;
    }
    Alert.alert(
      status === "used" ? "Mark as Used?" : "Mark as Wasted?",
      `Mark "${item.name}" as ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: status === "wasted" ? "destructive" : "default",
          onPress: () => doStatusUpdate(item, status),
        },
      ]
    );
  };

  const doStatusUpdate = async (item: InventoryItem, status: "used" | "wasted") => {
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
    <View style={styles.outerContainer}>
      {/* Partial Quantity Modal */}
      <Modal
        visible={partialModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPartialModal({ visible: false, item: null, status: "used", qty: "" })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {partialModal.status === "used" ? "How many units used?" : "How many units wasted?"}
            </Text>
            <Text style={styles.modalBody}>
              {partialModal.item?.name} — {partialModal.item?.quantity} {partialModal.item?.unit || "unit(s)"} available
            </Text>
            <TextInput
              value={partialModal.qty}
              onChangeText={(v) => setPartialModal((m) => ({ ...m, qty: v.replace(/[^0-9.]/g, "") }))}
              keyboardType="numeric"
              placeholder={`1 – ${partialModal.item?.quantity}`}
              placeholderTextColor="#aaa"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPartialModal({ visible: false, item: null, status: "used", qty: "" })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, partialModal.status === "wasted" && styles.modalConfirmWaste]}
                onPress={doPartialUpdate}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.headerArea}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Inventory</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddFood", { userData })}
          >
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
        {/* Filter row */}
        <View style={styles.filterRow}>
          {(["all", "expiring", "used", "wasted"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
                {f === "all" ? "All" : f === "expiring" ? "Expiring" : f === "used" ? "Used" : "Wasted"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const soon = new Date(today); soon.setDate(today.getDate() + 7);
        const filteredItems = items.filter((i) => {
          if (activeFilter === "expiring") {
            if (i.status !== "active" || !i.expiryDate) return false;
            const exp = new Date(i.expiryDate); exp.setHours(0, 0, 0, 0);
            return exp <= soon;
          }
          if (activeFilter === "used") return i.status === "used";
          if (activeFilter === "wasted") return i.status === "wasted";
          return true;
        });
        return (
          <FlatList
            data={filteredItems}
            style={{ flex: 1 }}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {activeFilter === "expiring" ? "No items expiring in the next 7 days." :
                 activeFilter === "used" ? "No used items yet." :
                 activeFilter === "wasted" ? "No wasted items." :
                 "No items found."}
              </Text>
            }
            renderItem={({ item }) => {
              const days = getDaysRemaining(item.expiryDate);
              const color = getExpiryColor(days);
              const label = getExpiryLabel(days);
              return (
                <View style={styles.card}>
                  {item.photoUrl ? (
                    <Image
                      source={{ uri: item.photoUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : null}
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
                      <Text style={styles.actionText}>Mark Used</Text>
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
                      <Text style={styles.actionText}>Mark Wasted</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        );
      })()}
      <BottomNav navigation={navigation} active="Inventory" role={role} userData={userData} />
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: c.background,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: c.background,
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.background,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: c.text,
  },
  empty: {
    textAlign: "center",
    color: c.textMuted,
    marginTop: 60,
    fontSize: 16,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "700",
    color: c.text,
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: c.textMuted,
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
    backgroundColor: c.primary,
  },
  wasteButton: {
    backgroundColor: c.danger,
  },
  disabledButton: {
    opacity: 0.35,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  thumbnail: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
  },
  // Filter row
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  filterTab: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 20,
    paddingVertical: 7,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: c.textMuted,
  },
  filterTabTextActive: {
    color: "#fff",
  },
  // Header row with Add button
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // Partial modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: c.text,
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: c.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: "700",
    color: c.text,
    textAlign: "center",
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: c.textMuted,
    fontWeight: "600",
    fontSize: 15,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmWaste: {
    backgroundColor: c.danger,
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
}