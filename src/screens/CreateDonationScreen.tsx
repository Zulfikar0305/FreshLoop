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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as Location from "expo-location";
import { auth, db } from "../firebase/firebaseConfig";
import { COLORS } from "../constants/theme";

type Coords = { latitude: number; longitude: number } | null;

export default function CreateDonationScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<Coords>(null);
  const [locating, setLocating] = useState(false);

  const handleUseLocation = async () => {
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
        description: description.trim(),
        status: "available",
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
      <Text style={styles.title}>Create Donation</Text>
      <Text style={styles.subtitle}>
        List surplus food so NPO coordinators can claim and distribute it to those in need.
      </Text>

      <Text style={styles.label}>Food Name *</Text>
      <Text style={styles.hint}>What food are you donating? Be specific (e.g. "Canned chickpeas", "Bread loaves").</Text>
      <TextInput
        value={foodName}
        onChangeText={setFoodName}
        placeholder="e.g. Canned beans"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Quantity *</Text>
      <Text style={styles.hint}>Number of items, packs, or kg available.</Text>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="e.g. 5"
        keyboardType="numeric"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Description</Text>
      <Text style={styles.hint}>Optional — include condition, best-before date, or collection instructions.</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Best before 10 May. Collect from front desk."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={3}
        style={[styles.input, styles.multiline]}
      />

      <Text style={styles.label}>Pickup Location</Text>
      <Text style={styles.hint}>Optional but recommended — helps coordinators plan collection routes.</Text>
      <TouchableOpacity
        style={[styles.locationButton, locating && styles.locationButtonDisabled]}
        onPress={handleUseLocation}
        disabled={locating || submitting}
      >
        <Text style={styles.locationButtonText}>
          {locating ? "Getting location..." : coords ? `📍 Location set (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})` : "📍 Use My Current Location"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? "Submitting..." : "List Donation"}
        </Text>
      </TouchableOpacity>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 24,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
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
  locationButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  locationButtonDisabled: {
    borderColor: "#80CECE",
  },
  locationButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "#80CECE",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
