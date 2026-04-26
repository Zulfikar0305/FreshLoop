import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Button,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

type ProfileData = {
  fullName: string;
  householdSize: string;
  dietaryPreferences: string;
  kitchenEquipment: string;
  locationConsent: boolean;
  analyticsConsent: boolean;
};

export default function ProfileScreen() {
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

      <View style={styles.saveButton}>
        <Button title={saving ? "Saving..." : "Save Profile"} onPress={handleSave} disabled={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 15,
    color: "#333",
  },
  saveButton: {
    marginTop: 8,
  },
});
