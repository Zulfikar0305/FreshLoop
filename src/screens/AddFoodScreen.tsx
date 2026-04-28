import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { auth } from "../firebase/firebaseConfig";
import { addInventoryItem } from "../services/inventoryService";
import { COLORS } from "../constants/theme";

type BulkRow = {
  name: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  price: string;
};

type Mode = "single" | "bulk";

export default function AddFoodScreen({ navigation }: any) {
  const [mode, setMode] = useState<Mode>("single");

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [price, setPrice] = useState("");

  const emptyRow = (): BulkRow => ({ name: "", quantity: "", unit: "", expiryDate: "", price: "" });
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
    setPrice("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Field", "Please enter an item name.");
      return;
    }
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a quantity greater than 0.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found. Please log in again.");
      return;
    }

    let parsedExpiry: Date | null = null;
    if (expiryDate.trim()) {
      parsedExpiry = new Date(expiryDate.trim());
      if (isNaN(parsedExpiry.getTime())) {
        Alert.alert("Invalid Date", "Expiry date format is incorrect. Use YYYY-MM-DD, e.g. 2026-05-01.");
        return;
      }
    }

    const parsedPrice = price.trim() === "" ? 0 : parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Invalid Price", "Price must be 0 or a positive number.");
      return;
    }

    try {
      await addInventoryItem(
        {
          name: name.trim(),
          quantity: parsedQty,
          unit: unit.trim(),
          expiryDate: parsedExpiry ?? null,
          price: parsedPrice,
        },
        currentUser.uid
      );

      Alert.alert("Success", "Food item added to inventory.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      resetForm();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const updateBulkRow = (index: number, field: keyof BulkRow, value: string) => {
    setBulkRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addBulkRow = () => {
    setBulkRows((prev) => [...prev, emptyRow()]);
  };

  const removeBulkRow = (index: number) => {
    setBulkRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)));
  };

  const handleBulkSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found. Please log in again.");
      return;
    }

    // Validate each row
    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      const rowNum = i + 1;

      if (!row.name.trim()) {
        Alert.alert("Missing Field", `Row ${rowNum}: Item name is required.`);
        return;
      }
      const parsedQty = parseFloat(row.quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        Alert.alert("Invalid Quantity", `Row ${rowNum}: Quantity must be greater than 0.`);
        return;
      }
      if (row.expiryDate.trim()) {
        const d = new Date(row.expiryDate.trim());
        if (isNaN(d.getTime())) {
          Alert.alert("Invalid Date", `Row ${rowNum}: Use YYYY-MM-DD format for expiry date.`);
          return;
        }
      }
      const parsedPrice = row.price.trim() === "" ? 0 : parseFloat(row.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        Alert.alert("Invalid Price", `Row ${rowNum}: Price must be 0 or a positive number.`);
        return;
      }
    }

    setBulkSaving(true);
    try {
      for (const row of bulkRows) {
        const parsedQty = parseFloat(row.quantity);
        const parsedPrice = row.price.trim() === "" ? 0 : parseFloat(row.price);
        let parsedExpiry: Date | null = null;
        if (row.expiryDate.trim()) {
          parsedExpiry = new Date(row.expiryDate.trim());
        }
        await addInventoryItem(
          {
            name: row.name.trim(),
            quantity: parsedQty,
            unit: row.unit.trim(),
            expiryDate: parsedExpiry ?? null,
            price: parsedPrice,
          },
          currentUser.uid
        );
      }

      const count = bulkRows.length;
      Alert.alert("Success", `${count} item${count !== 1 ? "s" : ""} saved successfully.`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      setBulkRows([emptyRow()]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Add Food Item</Text>
      <Text style={styles.subtitle}>Track what's in your pantry</Text>

      {/* ── Mode Toggle ── */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === "single" && styles.toggleButtonActive]}
          onPress={() => setMode("single")}
        >
          <Text style={[styles.toggleButtonText, mode === "single" && styles.toggleButtonTextActive]}>
            Single Add
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, mode === "bulk" && styles.toggleButtonActive]}
          onPress={() => setMode("bulk")}
        >
          <Text style={[styles.toggleButtonText, mode === "bulk" && styles.toggleButtonTextActive]}>
            Bulk Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Single Add Mode ── */}
      {mode === "single" && (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              placeholder="e.g. Milk, Bread, Apples"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              placeholder="e.g. 2"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Unit <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              placeholder="e.g. litres, kg, items"
              value={unit}
              onChangeText={setUnit}
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            <Text style={styles.label}>Expiry Date <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              placeholder="e.g. 2026-05-01"
              value={expiryDate}
              onChangeText={setExpiryDate}
              style={styles.input}
              placeholderTextColor="#aaa"
            />
            <Text style={styles.helperText}>Format: YYYY-MM-DD — leave blank if no expiry</Text>

            <Text style={styles.label}>Price (R) <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              placeholder="e.g. 29.99"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#aaa"
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>Add to Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Bulk Add Mode ── */}
      {mode === "bulk" && (
        <>
          <Text style={styles.bulkSubtitle}>Enter multiple items at once</Text>

          {bulkRows.map((row, index) => (
            <View key={index} style={styles.bulkCard}>
              <View style={styles.bulkCardHeader}>
                <Text style={styles.bulkRowLabel}>Item {index + 1}</Text>
                <TouchableOpacity onPress={() => removeBulkRow(index)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Name *"
                value={row.name}
                onChangeText={(v) => updateBulkRow(index, "name", v)}
                style={styles.bulkInput}
                placeholderTextColor="#aaa"
              />
              <View style={styles.bulkRow}>
                <TextInput
                  placeholder="Qty *"
                  value={row.quantity}
                  onChangeText={(v) => updateBulkRow(index, "quantity", v)}
                  keyboardType="numeric"
                  style={[styles.bulkInput, styles.bulkInputHalf]}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  placeholder="Unit"
                  value={row.unit}
                  onChangeText={(v) => updateBulkRow(index, "unit", v)}
                  style={[styles.bulkInput, styles.bulkInputHalf]}
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={styles.bulkRow}>
                <TextInput
                  placeholder="Expiry (YYYY-MM-DD)"
                  value={row.expiryDate}
                  onChangeText={(v) => updateBulkRow(index, "expiryDate", v)}
                  style={[styles.bulkInput, styles.bulkInputHalf]}
                  placeholderTextColor="#aaa"
                />
                <TextInput
                  placeholder="Price (R)"
                  value={row.price}
                  onChangeText={(v) => updateBulkRow(index, "price", v)}
                  keyboardType="numeric"
                  style={[styles.bulkInput, styles.bulkInputHalf]}
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addRowButton} onPress={addBulkRow}>
            <Text style={styles.addRowButtonText}>+ Add Another Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bulkSaveButton, bulkSaving && styles.bulkSaveButtonDisabled]}
            onPress={handleBulkSave}
            disabled={bulkSaving}
          >
            <Text style={styles.primaryButtonText}>
              {bulkSaving ? "Saving..." : `Save All ${bulkRows.length} Item${bulkRows.length !== 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  // ── Mode toggle ──
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  // ── Single form ──
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  optional: {
    fontSize: 12,
    fontWeight: "400",
    color: "#aaa",
  },
  helperText: {
    fontSize: 12,
    color: "#aaa",
    marginTop: -10,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  // ── Bulk section ──
  bulkSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  bulkCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  bulkCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bulkRowLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: "600",
  },
  bulkInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 9,
    padding: 11,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  bulkRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulkInputHalf: {
    flex: 1,
    marginBottom: 8,
  },
  addRowButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addRowButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  bulkSaveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  bulkSaveButtonDisabled: {
    backgroundColor: "#FFBD90",
  },
});