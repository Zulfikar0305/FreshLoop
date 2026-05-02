import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
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

// ── Expiry date helpers ──────────────────────────────────────────────────────

/**
 * Normalises a typed/pasted expiry date into YYYY-MM-DD.
 * Accepts: 20260502  |  2026/05/02  |  2026-05-02
 * Applies live auto-formatting when the user types digits only.
 */
function normalizeExpiryDate(input: string): string {
  // Strip slashes/dashes so we can work with raw digits
  const digits = input.replace(/[\-/]/g, "");

  // If the input was already slash/dash-separated, just normalise separators
  if (/^\d{4}[\-/]\d{2}[\-/]\d{2}$/.test(input.trim())) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  // Live auto-format as user types digits: YYYY → YYYY- → YYYY-MM → YYYY-MM-
  if (/^\d+$/.test(digits)) {
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  // Return as-is for anything else (let validation handle it)
  return input;
}

/** Returns true only if the string is YYYY-MM-DD and represents a real calendar date. */
function isValidExpiryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

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

  // Camera state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
    setPrice("");
    setPhotoUri(null);
  };

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera access is needed to photograph food items.");
        return;
      }
    }
    setCameraOpen(true);
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setCameraOpen(false);
      } else {
        Alert.alert("Error", "Photo could not be captured. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setCapturing(false);
    }
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
      if (!isValidExpiryDate(expiryDate.trim())) {
        Alert.alert("Invalid Date", "Please enter the expiry date as YYYY-MM-DD, for example 2026-05-02.");
        return;
      }
      parsedExpiry = new Date(expiryDate.trim());
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
          ...(photoUri ? { photoUri } : {}),
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
        if (!isValidExpiryDate(row.expiryDate.trim())) {
          Alert.alert("Invalid Date", `Row ${rowNum}: Please enter the expiry date as YYYY-MM-DD, for example 2026-05-02.`);
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

  // ── Camera overlay (replaces screen while open) ──
  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
            onPress={handleTakePhoto}
            disabled={capturing}
          >
            <Text style={styles.captureButtonText}>
              {capturing ? "Capturing..." : "📷  Take Photo"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelCameraButton}
            onPress={() => setCameraOpen(false)}
          >
            <Text style={styles.cancelCameraText}>Cancel Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
              placeholder="YYYY-MM-DD e.g. 2026-05-02"
              value={expiryDate}
              onChangeText={(v) => setExpiryDate(normalizeExpiryDate(v))}
              keyboardType="numeric"
              maxLength={10}
              style={styles.input}
              placeholderTextColor="#aaa"
            />
            <Text style={styles.helperText}>Type digits (e.g. 20260502) or YYYY-MM-DD — leave blank if no expiry</Text>

            <Text style={styles.label}>Price (R) <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              placeholder="e.g. 29.99"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            {/* ── Camera / Photo section ── */}
            <View style={styles.photoDivider} />
            <Text style={styles.label}>Photo <Text style={styles.optional}>(optional)</Text></Text>

            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <Text style={styles.photoHelperText}>
                  Photo captured. Confirm the food name and expiry date before saving.
                </Text>
                <TouchableOpacity style={styles.retakeButton} onPress={handleOpenCamera}>
                  <Text style={styles.retakeButtonText}>🔄  Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.scanButton} onPress={handleOpenCamera}>
                <Text style={styles.scanButtonText}>📷  Scan / Photograph Food</Text>
              </TouchableOpacity>
            )}
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
                  placeholder="YYYY-MM-DD"
                  value={row.expiryDate}
                  onChangeText={(v) => updateBulkRow(index, "expiryDate", normalizeExpiryDate(v))}
                  keyboardType="numeric"
                  maxLength={10}
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
  // ── Camera overlay ──
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraView: {
    flex: 1,
  },
  cameraControls: {
    backgroundColor: "#111",
    padding: 20,
    gap: 10,
  },
  captureButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  captureButtonDisabled: {
    backgroundColor: "#4DBBBB",
  },
  captureButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelCameraButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelCameraText: {
    color: "#aaa",
    fontSize: 15,
  },
  // ── Photo preview (in single form) ──
  photoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  photoPreviewContainer: {
    marginBottom: 4,
  },
  photoPreview: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: COLORS.inputBg,
  },
  photoHelperText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
    marginBottom: 10,
    lineHeight: 17,
  },
  retakeButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 4,
  },
  retakeButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  scanButton: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  scanButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
});