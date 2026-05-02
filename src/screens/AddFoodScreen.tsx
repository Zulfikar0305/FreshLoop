import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { auth } from "../firebase/firebaseConfig";
import { addInventoryItem } from "../services/inventoryService";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../theme/colors";

type BulkRow = {
  name: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  price: string;
};

type Mode = "single" | "bulk";

const UNIT_OPTIONS = ["item", "pack", "kg", "g", "L", "ml"] as const;
type UnitOption = typeof UNIT_OPTIONS[number];

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

export default function AddFoodScreen({ navigation, route }: any) {
  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const [mode, setMode] = useState<Mode>(route?.params?.mode === "bulk" ? "bulk" : "single");

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [unit, setUnit] = useState<UnitOption | "">("")
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

  // Barcode scanner state
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);
  const barcodeScanLock = useRef(false);

  const resetForm = () => {
    setName("");
    setQuantity("");
    setQuantityError("");
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

  const handleOpenBarcodeScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
        return;
      }
    }
    barcodeScanLock.current = false;
    setLastBarcode(null);
    setBarcodeFeedback(null);
    setBarcodeOpen(true);
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (barcodeScanLock.current || barcodeLoading) return;
    barcodeScanLock.current = true;
    setLastBarcode(data);
    setBarcodeLoading(true);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data)}`);
      const json = await response.json();
      const productName: string | undefined = json.product?.product_name;

      if (json.status === 1 && productName) {
        setBarcodeOpen(false);
        setBulkRows((prev) => {
          const newRow: BulkRow = { name: productName.trim(), quantity: "1", unit: "item", expiryDate: "", price: "" };
          if (prev.length === 1 && !prev[0].name.trim()) return [newRow];
          return [...prev, newRow];
        });
        setBarcodeFeedback(`\u2705 "${productName.trim()}" found. Please confirm quantity and expiry date.`);
        setMode("bulk");
      } else {
        setBarcodeOpen(false);
        Alert.alert(
          "Product not found",
          "Barcode scanned, but this item is not in the product database. Please enter it manually."
        );
        barcodeScanLock.current = false;
      }
    } catch {
      setBarcodeOpen(false);
      Alert.alert("Network Error", "Could not look up product. Please check your connection and try again.");
      barcodeScanLock.current = false;
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Field", "Please enter an item name.");
      return;
    }
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert("Invalid Quantity", "Quantity must be a number greater than 0.");
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

  // ── Barcode scanner overlay ──
  if (barcodeOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.cameraView}
          facing="back"
          onBarcodeScanned={barcodeLoading ? undefined : handleBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
          }}
        />
        <View style={styles.cameraControls}>
          {barcodeLoading ? (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14 }}>Looking up product...</Text>
            </View>
          ) : lastBarcode ? (
            <Text style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginBottom: 8 }}>
              Last scan: {lastBarcode}
            </Text>
          ) : (
            <Text style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginBottom: 8 }}>
              Point camera at a product barcode
            </Text>
          )}
          <TouchableOpacity
            style={styles.cancelCameraButton}
            onPress={() => { setBarcodeOpen(false); barcodeScanLock.current = false; }}
          >
            <Text style={styles.cancelCameraText}>✕  Close Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
            Add Single Item
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, mode === "bulk" && styles.toggleButtonActive]}
          onPress={() => setMode("bulk")}
        >
          <Text style={[styles.toggleButtonText, mode === "bulk" && styles.toggleButtonTextActive]}>
            Bulk Entry Assistant
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
              onChangeText={(v) => {
                if (/[^0-9.]/.test(v)) {
                  setQuantityError("Quantity must be a number.");
                } else {
                  setQuantityError("");
                }
                setQuantity(v.replace(/[^0-9.]/g, ""));
              }}
              keyboardType="numeric"
              style={[styles.input, quantityError ? styles.inputError : undefined]}
              placeholderTextColor="#aaa"
            />
            {quantityError ? (
              <Text style={styles.fieldError}>{quantityError}</Text>
            ) : null}

            <Text style={styles.label}>Unit <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.chipRow}>
              {UNIT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, unit === opt && styles.chipActive]}
                  onPress={() => setUnit(unit === opt ? "" : opt)}
                >
                  <Text style={[styles.chipText, unit === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
          <Text style={styles.bulkSubtitle}>Quickly add multiple items after shopping</Text>
          <Text style={styles.barcodeNote}>
            Use barcode scan to identify products. Fill in expiry dates and quantities manually.
          </Text>

          {/* ── Scan Product Barcode ── */}
          <TouchableOpacity style={styles.barcodeScanButton} onPress={handleOpenBarcodeScanner}>
            <Text style={styles.barcodeScanButtonText}>🔍  Scan Product Barcode</Text>
          </TouchableOpacity>

          {barcodeFeedback && (
            <View style={styles.barcodeFeedbackCard}>
              <Text style={styles.barcodeFeedbackText}>{barcodeFeedback}</Text>
              {lastBarcode && (
                <Text style={styles.barcodeValueText}>Barcode: {lastBarcode}</Text>
              )}
            </View>
          )}

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
                  onChangeText={(v) => updateBulkRow(index, "quantity", v.replace(/[^0-9.]/g, ""))}
                  keyboardType="numeric"
                  style={[styles.bulkInput, styles.bulkInputHalf]}
                  placeholderTextColor="#aaa"
                />
              </View>
              <Text style={styles.bulkUnitLabel}>Unit</Text>
              <View style={styles.chipRow}>
                {UNIT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, row.unit === opt && styles.chipActive]}
                    onPress={() => updateBulkRow(index, "unit", row.unit === opt ? "" : opt)}
                  >
                    <Text style={[styles.chipText, row.unit === opt && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
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

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    backgroundColor: c.background,
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: c.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: c.card,
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
    backgroundColor: c.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textMuted,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: c.card,
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
    color: c.text,
    marginBottom: 6,
  },
  optional: {
    fontSize: 12,
    fontWeight: "400",
    color: c.textMuted,
  },
  helperText: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  input: {
    backgroundColor: c.inputBg,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: c.text,
    marginBottom: 14,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: c.danger,
  },
  fieldError: {
    fontSize: 12,
    color: c.danger,
    marginTop: -10,
    marginBottom: 10,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: c.primary,
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
    color: c.textMuted,
    fontSize: 15,
  },
  // ── Unit chip selector ──
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textMuted,
  },
  chipTextActive: {
    color: "#fff",
  },
  // ── Bulk section ──
  bulkSubtitle: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 8,
  },
  bulkScanButton: {
    borderWidth: 1.5,
    borderColor: c.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: c.card,
  },
  bulkScanButtonText: {
    color: c.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  bulkScanPreview: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
  },
  bulkScanHelper: {
    fontSize: 13,
    color: c.primary,
    fontWeight: "600",
  },
  bulkCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: c.primary,
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
    color: c.primary,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    fontSize: 13,
    color: c.danger,
    fontWeight: "600",
  },
  bulkInput: {
    backgroundColor: c.inputBg,
    borderRadius: 9,
    padding: 11,
    fontSize: 14,
    color: c.text,
    marginBottom: 8,
  },
  bulkUnitLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: c.text,
    marginBottom: 6,
    marginTop: 2,
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
    borderColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addRowButtonText: {
    color: c.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  bulkSaveButton: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  bulkSaveButtonDisabled: {
    backgroundColor: "#FFBD90",
  },
  // ── Barcode scan UI ──
  barcodeScanButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10,
  },
  barcodeScanButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  barcodeFeedbackCard: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: c.success,
  },
  barcodeFeedbackText: {
    fontSize: 13,
    color: c.text,
    fontWeight: "600",
    marginBottom: 4,
  },
  barcodeValueText: {
    fontSize: 11,
    color: c.textMuted,
  },
  barcodeNote: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 12,
    lineHeight: 17,
    fontStyle: "italic",
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
    backgroundColor: c.primary,
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
  photoDivider: {
    height: 1,
    backgroundColor: c.border,
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
    backgroundColor: c.inputBg,
  },
  photoHelperText: {
    fontSize: 12,
    color: c.primary,
    fontWeight: "500",
    marginBottom: 10,
    lineHeight: 17,
  },
  retakeButton: {
    borderWidth: 1.5,
    borderColor: c.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 4,
  },
  retakeButtonText: {
    color: c.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  scanButton: {
    backgroundColor: c.inputBg,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 4,
  },
  scanButtonText: {
    color: c.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
}