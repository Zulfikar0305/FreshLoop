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
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../theme/colors";
import BottomNav from "../components/BottomNav";

type ProfileData = {
  fullName: string;
  householdSize: string;
  dietaryPreferences: string;
  kitchenEquipment: string;
  locationConsent: boolean;
  analyticsConsent: boolean;
  cookingSkill: string;
  reminderWindowDays: string;
  wasteGoal: string;
};

export default function ProfileScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";

  const { colors: c, mode, toggleTheme } = useTheme();
  const styles = getStyles(c);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    householdSize: "",
    dietaryPreferences: "",
    kitchenEquipment: "",
    locationConsent: false,
    analyticsConsent: false,
    cookingSkill: "",
    reminderWindowDays: "",
    wasteGoal: "",
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
          cookingSkill: data.cookingSkill ?? "",
          reminderWindowDays: data.reminderWindowDays != null ? String(data.reminderWindowDays) : "",
          wasteGoal: data.wasteGoal ?? "",
        });
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch {
              // sign-out errors are non-critical
            }
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]
    );
  };

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
        cookingSkill: profile.cookingSkill || null,
        reminderWindowDays: profile.reminderWindowDays ? parseInt(profile.reminderWindowDays, 10) : null,
        wasteGoal: profile.wasteGoal || null,
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
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Household Size</Text>
      <TextInput
        value={profile.householdSize}
        onChangeText={(v) => setProfile((p) => ({ ...p, householdSize: v }))}
        placeholder="e.g. 4"
        keyboardType="numeric"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Dietary Preferences (comma-separated)</Text>
      <TextInput
        value={profile.dietaryPreferences}
        onChangeText={(v) => setProfile((p) => ({ ...p, dietaryPreferences: v }))}
        placeholder="e.g. vegetarian, gluten-free"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Kitchen Equipment (comma-separated)</Text>
      <TextInput
        value={profile.kitchenEquipment}
        onChangeText={(v) => setProfile((p) => ({ ...p, kitchenEquipment: v }))}
        placeholder="e.g. oven, blender"
        placeholderTextColor="#aaa"
        style={styles.input}
      />

      <Text style={styles.label}>Cooking Skill</Text>
      <View style={styles.chipRow}>
        {["beginner", "intermediate", "advanced"].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, profile.cookingSkill === opt && styles.chipActive]}
            onPress={() => setProfile((p) => ({ ...p, cookingSkill: opt }))}
          >
            <Text style={[styles.chipText, profile.cookingSkill === opt && styles.chipTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Reminder Window</Text>
      <View style={styles.chipRow}>
        {["1", "3", "7"].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, profile.reminderWindowDays === opt && styles.chipActive]}
            onPress={() => setProfile((p) => ({ ...p, reminderWindowDays: opt }))}
          >
            <Text style={[styles.chipText, profile.reminderWindowDays === opt && styles.chipTextActive]}>
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
            style={[styles.chip, profile.wasteGoal === opt.value && styles.chipActive]}
            onPress={() => setProfile((p) => ({ ...p, wasteGoal: opt.value }))}
          >
            <Text style={[styles.chipText, profile.wasteGoal === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      <View style={styles.row}>
        <Text style={styles.switchLabel}>🌙 Dark Mode</Text>
        <Switch
          value={mode === "dark"}
          onValueChange={toggleTheme}
          trackColor={{ false: "#ccc", true: c.primary }}
          thumbColor="#fff"
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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>🚪 Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
    <BottomNav navigation={navigation} active="Profile" role={role} userData={userData} />
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    backgroundColor: c.background,
    padding: 20,
    paddingBottom: 48,
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
    marginBottom: 24,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: c.card,
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
    color: c.text,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: c.primary,
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
  logoutButton: {
    borderWidth: 1.5,
    borderColor: c.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  logoutButtonText: {
    color: c.danger,
    fontSize: 15,
    fontWeight: "700",
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
    fontSize: 14,
    color: c.primary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
});
}
