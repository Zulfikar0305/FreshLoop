import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { COLORS } from "../constants/theme";

type Role = "home" | "business" | "coordinator";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "home", label: "🏠 Home User", desc: "Track personal pantry & reduce household waste" },
  { value: "business", label: "🏢 Business", desc: "Manage surplus food and create donations" },
  { value: "coordinator", label: "🤝 NPO Coordinator", desc: "Claim and coordinate food donations" },
];

export default function RoleSetupScreen({ navigation, route }: any) {
  const { uid, email, fullName } = route.params as {
    uid: string;
    email: string;
    fullName: string;
  };

  const [role, setRole] = useState<Role>("home");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const userData = {
        uid,
        email,
        fullName,
        role,
        verificationStatus: "active",
        provider: "google",
        householdSize: 0,
        dietaryPreferences: [] as string[],
        kitchenEquipment: [] as string[],
        locationConsent: false,
        analyticsConsent: false,
      };
      await setDoc(doc(db, "users", uid), { ...userData, createdAt: serverTimestamp() });
      navigation.reset({ index: 0, routes: [{ name: "HomeDashboard", params: { userData } }] });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>One last step</Text>
      <Text style={styles.subtitle}>
        Welcome, {fullName}! How will you use FreshLoop?
      </Text>

      <View style={styles.roleList}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleCard, role === r.value && styles.roleCardSelected]}
            onPress={() => setRole(r.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.roleLabel, role === r.value && styles.roleLabelSelected]}>
              {r.label}
            </Text>
            <Text style={[styles.roleDesc, role === r.value && styles.roleDescSelected]}>
              {r.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>Get Started</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 28,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 32,
    lineHeight: 22,
  },
  roleList: {
    gap: 12,
    marginBottom: 36,
  },
  roleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#E6FAF9",
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  roleLabelSelected: {
    color: COLORS.primary,
  },
  roleDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  roleDescSelected: {
    color: COLORS.primaryDark,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#80CECE",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
