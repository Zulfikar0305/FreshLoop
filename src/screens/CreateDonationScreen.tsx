import * as Location from "expo-location";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { auth, db } from "../firebase/firebaseConfig";
import type { ThemeColors } from "../theme/colors";

const DONATION_UNIT_OPTIONS = ["item", "pack", "kg", "L", "box", "pallet"] as const;
type DonationUnit = typeof DONATION_UNIT_OPTIONS[number];

const STORAGE_CONDITIONS = ["Ambient", "Chilled", "Frozen"] as const;
type StorageCondition = typeof STORAGE_CONDITIONS[number] | "";

type Coords = { latitude: number; longitude: number } | null;

export default function CreateDonationScreen({ navigation, route }: any) {
  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";
  const isBusiness = role === "business";

  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<DonationUnit | "">("item");
  const [description, setDescription] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [storageCondition, setStorageCondition] = useState<StorageCondition>("");
  const [pickupWindow, setPickupWindow] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<Coords>(null);
  const [locating, setLocating] = useState(false);

  const handleUseLocation = async () => {
    if (userData?.locationConsent !== true) {
      Alert.alert(
        "Location Consent Required",
        "Enable location consent in your Profile settings to use GPS features."
      );
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Unavailable",
          "Location permission was denied. You can still submit the donation without a location."
        );
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: result.coords.latitude, longitude: result.coords.longitude });
    } catch {
      Alert.alert("Error", "Could not retrieve location. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert("Missing Field", "Please enter a food name so coordinators know what's being donated.");
      return;
    }

    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a quantity greater than 0 (e.g. 5 tins, 2 kg).");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "donations"), {
        userId: currentUser.uid,
        foodName: foodName.trim(),
        quantity: parsedQuantity,
        unit: unit || "item",
        description: description.trim(),
        pickupInstructions: pickupInstructions.trim(),
        ...(expiryDate.trim() ? { expiryDate: expiryDate.trim() } : {}),
        ...(storageCondition ? { storageCondition } : {}),
        ...(pickupWindow.trim() ? { pickupWindow: pickupWindow.trim() } : {}),
        ...(pickupAddress.trim() ? { pickupAddress: pickupAddress.trim() } : {}),
        status: "available",
        role,
        createdAt: serverTimestamp(),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
      });

      Alert.alert(
        "Donation Listed! 🎉",
        "Your donation is now visible to NPO coordinators who can claim and collect it.",
        [{ text: "View Donations", onPress: () => navigation.navigate("DonationsList", { userData }) }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isBusiness ? "List Surplus Food" : "Create Donation"}</Text>
      <Text style={styles.subtitle}>
        {isBusiness
          ? "List your surplus stock so NPO coordinators can claim and distribute it to those in need."
          : "List surplus food so NPO coordinators can claim and distribute it to those in need."}
      </Text>

      <Text style={styles.label}>Food Name *</Text>
      <Text style={styles.hint}>{isBusiness ? "Be specific (e.g. \"Canned chickpeas x 24\", \"Bread loaves\")." : "What food are you donating? Be specific."}</Text>
      <TextInput
        value={foodName}
        onChangeText={setFoodName}
        placeholder={isBusiness ? "e.g. Canned beans — case of 24" : "e.g. Canned beans"}
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Quantity *</Text>
      <Text style={styles.hint}>Number of items, packs, or kg available.</Text>
      <TextInput
        value={quantity}
        onChangeText={(v) => setQuantity(v.replace(/[^0-9.]/g, ""))}
        placeholder="e.g. 5"
        keyboardType="numeric"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Unit</Text>
      <View style={styles.chipRow}>
        {DONATION_UNIT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, unit === opt && styles.chipActive]}
            onPress={() => setUnit(opt)}
          >
            <Text style={[styles.chipText, unit === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <Text style={styles.hint}>Optional — include condition, best-before date, or dietary info.</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Best before 10 May. All tins intact."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={3}
        style={[styles.input, styles.multiline]}
      />

      {isBusiness && (
        <>
          <Text style={styles.label}>Best-Before / Expiry Date</Text>
          <Text style={styles.hint}>Format: YYYY-MM-DD (e.g. 2026-06-15). Leave blank if unknown.</Text>
          <TextInput
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="e.g. 2026-06-15"
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Storage Condition</Text>
          <View style={styles.chipRow}>
            {STORAGE_CONDITIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, storageCondition === opt && styles.chipActive]}
                onPress={() => setStorageCondition(storageCondition === opt ? "" : opt)}
              >
                <Text style={[styles.chipText, storageCondition === opt && styles.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Pickup Window</Text>
          <Text style={styles.hint}>When can coordinators collect?</Text>
          <TextInput
            value={pickupWindow}
            onChangeText={setPickupWindow}
            placeholder="e.g. Mon–Fri 8am–4pm"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Pickup Instructions</Text>
          <Text style={styles.hint}>Where and how can the coordinator collect?</Text>
          <TextInput
            value={pickupInstructions}
            onChangeText={setPickupInstructions}
            placeholder="e.g. Collect from back entrance. Ask for Manager."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.multiline]}
          />
        </>
      )}

      <Text style={styles.label}>Pickup Location</Text>
      <Text style={styles.hint}>
        {userData?.locationConsent === true
          ? "Use GPS or enter your address for coordinators to find you."
          : "Enable location in Profile to use GPS, or enter your address manually."}
      </Text>
      <TouchableOpacity
        style={[styles.locationButton, (locating || userData?.locationConsent !== true) && styles.locationButtonDisabled]}
        onPress={handleUseLocation}
        disabled={locating || submitting}
      >
        <Text style={[styles.locationButtonText, userData?.locationConsent !== true && styles.locationButtonTextDisabled]}>
          {locating ? "Getting location..." : coords ? `📍 Location set (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})` : "📍 Use My Current Location"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Or enter your address manually:</Text>
      <TextInput
        value={pickupAddress}
        onChangeText={setPickupAddress}
        placeholder="e.g. 12 Main Road, Cape Town, 8001"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? "Submitting..." : (isBusiness ? "List Surplus Food" : "List Donation")}
        </Text>
      </TouchableOpacity>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
    lineHeight: 20,
    marginBottom: 24,
  },
  hint: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 6,
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: c.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: c.text,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  multiline: {
    height: 90,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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
  locationButton: {
    borderWidth: 1.5,
    borderColor: c.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  locationButtonDisabled: {
    borderColor: c.border,
  },
  locationButtonText: {
    color: c.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  locationButtonTextDisabled: {
    color: c.textMuted,
  },
  primaryButton: {
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: c.primaryDark,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
}
