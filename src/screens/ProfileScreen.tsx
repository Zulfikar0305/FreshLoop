import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { COLORS } from "../constants/theme";
import BottomNav from "../components/BottomNav";

type ProfileData = {
  fullName: string;
  householdSize: string;
  dietaryPreferences: string;
  kitchenEquipment: string;
  locationConsent: boolean;
  analyticsConsent: boolean;
};

export default function ProfileScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    householdSize: "",
    dietaryPreferences: "",
    kitchenEquipment: "",
    locationConsent: false,
    analyticsConsent: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "No logged-in user found.");
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (!userSnap.exists()) {
          Alert.alert("Error", "User profile not found.");
          setLoading(false);
          return;
        }

        const data = userSnap.data();
        setProfile({
          fullName: data.fullName ?? "",
          householdSize: data.householdSize != null ? String(data.householdSize) : "",
          dietaryPreferences: Array.isArray(data.dietaryPreferences)
            ? data.dietaryPreferences.join(", ")
            : "",
          kitchenEquipment: Array.isArray(data.kitchenEquipment)
            ? data.kitchenEquipment.join(", ")
            : "",
          locationConsent: data.locationConsent === true,
          analyticsConsent: data.analyticsConsent === true,
        });
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    const parsedHouseholdSize = profile.householdSize.trim() === ""
      ? 0
      : parseInt(profile.householdSize, 10);
    if (isNaN(parsedHouseholdSize) || parsedHouseholdSize < 0) {
      Alert.alert("Validation Error", "Invalid household size. Must be 0 or greater.");
      return;
    }

    const dietaryList = profile.dietaryPreferences
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const equipmentList = profile.kitchenEquipment
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        fullName: profile.fullName.trim(),
        householdSize: parsedHouseholdSize,
        dietaryPreferences: dietaryList,
        kitchenEquipment: equipmentList,
        locationConsent: profile.locationConsent,
        analyticsConsent: profile.analyticsConsent,
      });
      Alert.alert("Success", "Profile updated.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        value={profile.fullName}
        onChangeText={(v) => setProfile((p) => ({ ...p, fullName: v }))}
        placeholder="e.g. Jane Doe"
        style={styles.input}
      />

      <Text style={styles.label}>Household Size</Text>
      <TextInput
        value={profile.householdSize}
        onChangeText={(v) => setProfile((p) => ({ ...p, householdSize: v }))}
        placeholder="e.g. 4"
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Dietary Preferences (comma-separated)</Text>
      <TextInput
        value={profile.dietaryPreferences}
        onChangeText={(v) => setProfile((p) => ({ ...p, dietaryPreferences: v }))}
        placeholder="e.g. vegetarian, gluten-free"
        style={styles.input}
      />

      <Text style={styles.label}>Kitchen Equipment (comma-separated)</Text>
      <TextInput
        value={profile.kitchenEquipment}
        onChangeText={(v) => setProfile((p) => ({ ...p, kitchenEquipment: v }))}
        placeholder="e.g. oven, blender"
        style={styles.input}
      />

      <View style={styles.row}>
        <Text style={styles.switchLabel}>Location Consent</Text>
        <Switch
          value={profile.locationConsent}
          onValueChange={(v) => setProfile((p) => ({ ...p, locationConsent: v }))}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.switchLabel}>Analytics Consent</Text>
        <Switch
          value={profile.analyticsConsent}
          onValueChange={(v) => setProfile((p) => ({ ...p, analyticsConsent: v }))}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>
          {saving ? "Saving..." : "Save Profile"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    <BottomNav navigation={navigation} active="Profile" role={role} userData={userData} />
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
    marginBottom: 24,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  switchLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
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
