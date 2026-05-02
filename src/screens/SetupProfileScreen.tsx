import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { db } from "../firebase/firebaseConfig";
import type { ThemeColors } from "../theme/colors";

export default function SetupProfileScreen({ navigation, route }: any) {
  const { uid, role, fullName } = route.params as {
    uid: string;
    role: "home" | "business" | "coordinator";
    fullName: string;
  };

  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const [saving, setSaving] = useState(false);

  // Home fields
  const [householdSize, setHouseholdSize] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [cookingSkill, setCookingSkill] = useState("");
  const [reminderWindowDays, setReminderWindowDays] = useState("3");
  const [wasteGoal, setWasteGoal] = useState("");

  // Business fields
  const [businessName, setBusinessName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [donationCategory, setDonationCategory] = useState("");
  const [operatingHours, setOperatingHours] = useState("");

  // Coordinator fields
  const [organisationName, setOrganisationName] = useState("");
  const [coordContactNumber, setCoordContactNumber] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [vehicleCapacity, setVehicleCapacity] = useState("");

  const toggleAvail = (chip: string) => {
    setAvailability((prev) =>
      prev.includes(chip) ? prev.filter((v) => v !== chip) : [...prev, chip]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      let updates: Record<string, unknown> = {};

      if (role === "home") {
        const hs = householdSize.trim() === "" ? 0 : parseInt(householdSize, 10);
        if (isNaN(hs) || hs < 0) {
          Alert.alert("Validation", "Household size must be 0 or more.");
          setSaving(false);
          return;
        }
        updates = {
          householdSize: hs,
          dietaryPreferences: dietaryPreferences
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          cookingSkill: cookingSkill || null,
          reminderWindowDays: reminderWindowDays ? parseInt(reminderWindowDays, 10) : 3,
          wasteGoal: wasteGoal || null,
        };
      } else if (role === "business") {
        if (!businessName.trim()) {
          Alert.alert("Required", "Please enter your business name.");
          setSaving(false);
          return;
        }
        updates = {
          businessName: businessName.trim(),
          contactNumber: contactNumber.trim() || null,
          businessAddress: businessAddress.trim() || null,
          donationCategory: donationCategory.trim() || null,
          operatingHours: operatingHours.trim() || null,
        };
      } else {
        if (!organisationName.trim()) {
          Alert.alert("Required", "Please enter your organisation name.");
          setSaving(false);
          return;
        }
        updates = {
          organisationName: organisationName.trim(),
          contactNumber: coordContactNumber.trim() || null,
          serviceArea: serviceArea.trim() || null,
          availability: availability.join(", "),
          vehicleCapacity: vehicleCapacity.trim() || null,
        };
      }

      await updateDoc(doc(db, "users", uid), updates);

      const userData = { uid, role, fullName, ...updates };
      navigation.reset({
        index: 0,
        routes: [{ name: "HomeDashboard", params: { userData } }],
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "HomeDashboard", params: { userData: { uid, role, fullName } } }],
    });
  };

  const subtitle =
    role === "home"
      ? "Tell us about your household so FreshLoop can personalise your experience."
      : role === "business"
      ? "Set up your business profile to start listing surplus food for donation."
      : "Tell us about your organisation to start coordinating donations.";

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Complete Your Setup</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* ── Home fields ── */}
      {role === "home" && (
        <>
          <Text style={styles.label}>Household Size</Text>
          <TextInput
            value={householdSize}
            onChangeText={setHouseholdSize}
            placeholder="How many people in your household? e.g. 4"
            keyboardType="numeric"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>
            Dietary Preferences <Text style={styles.optional}>(comma-separated)</Text>
          </Text>
          <TextInput
            value={dietaryPreferences}
            onChangeText={setDietaryPreferences}
            placeholder="e.g. vegetarian, gluten-free"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Cooking Skill</Text>
          <View style={styles.chipRow}>
            {["beginner", "intermediate", "advanced"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, cookingSkill === opt && styles.chipActive]}
                onPress={() => setCookingSkill(opt)}
              >
                <Text style={[styles.chipText, cookingSkill === opt && styles.chipTextActive]}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Expiry Reminder Window</Text>
          <View style={styles.chipRow}>
            {["1", "3", "7"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, reminderWindowDays === opt && styles.chipActive]}
                onPress={() => setReminderWindowDays(opt)}
              >
                <Text style={[styles.chipText, reminderWindowDays === opt && styles.chipTextActive]}>
                  {opt} day{opt !== "1" ? "s" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Waste Goal</Text>
          <View style={styles.chipRow}>
            {[
              { value: "save_money", label: "💰 Save Money" },
              { value: "reduce_waste", label: "♻️ Reduce Waste" },
              { value: "donate_more", label: "🤝 Donate More" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, wasteGoal === opt.value && styles.chipActive]}
                onPress={() => setWasteGoal(opt.value)}
              >
                <Text style={[styles.chipText, wasteGoal === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Business fields ── */}
      {role === "business" && (
        <>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Your store or organisation name"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="e.g. +27 21 123 4567"
            keyboardType="phone-pad"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Business Address</Text>
          <TextInput
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="Street address for donation pickups"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Donation Category</Text>
          <TextInput
            value={donationCategory}
            onChangeText={setDonationCategory}
            placeholder="e.g. Dry goods, Produce, Bakery items"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Operating Hours</Text>
          <TextInput
            value={operatingHours}
            onChangeText={setOperatingHours}
            placeholder="e.g. Mon–Fri 8am–5pm"
            placeholderTextColor="#aaa"
            style={styles.input}
          />
        </>
      )}

      {/* ── Coordinator fields ── */}
      {role === "coordinator" && (
        <>
          <Text style={styles.label}>Organisation Name *</Text>
          <TextInput
            value={organisationName}
            onChangeText={setOrganisationName}
            placeholder="NPO or coordinating body name"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            value={coordContactNumber}
            onChangeText={setCoordContactNumber}
            placeholder="e.g. +27 21 123 4567"
            keyboardType="phone-pad"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Service Area</Text>
          <TextInput
            value={serviceArea}
            onChangeText={setServiceArea}
            placeholder="e.g. Cape Town CBD, Bellville, Khayelitsha"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          <Text style={styles.label}>Availability</Text>
          <View style={styles.chipRow}>
            {["Weekdays", "Weekends", "Public Holidays", "Flexible"].map((chip) => (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, availability.includes(chip) && styles.chipActive]}
                onPress={() => toggleAvail(chip)}
              >
                <Text style={[styles.chipText, availability.includes(chip) && styles.chipTextActive]}>
                  {chip}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Vehicle Capacity</Text>
          <TextInput
            value={vehicleCapacity}
            onChangeText={setVehicleCapacity}
            placeholder="e.g. Sedan, Bakkie, Van — max 100 kg"
            placeholderTextColor="#aaa"
            style={styles.input}
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
        onPress={handleComplete}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Complete Setup →</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.background,
      padding: 24,
      paddingTop: 60,
      paddingBottom: 48,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: c.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 21,
      marginBottom: 28,
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
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: c.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.primary,
    },
    chipTextActive: {
      color: "#fff",
    },
    primaryButton: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
      marginBottom: 12,
    },
    primaryButtonDisabled: {
      backgroundColor: "#80CECE",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    skipButton: {
      alignItems: "center",
      paddingVertical: 8,
    },
    skipText: {
      color: c.textMuted,
      fontSize: 14,
    },
  });
}
