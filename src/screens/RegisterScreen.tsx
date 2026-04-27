import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type Role = "home" | "business" | "coordinator";

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("home");

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Full name is required.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validation Error", "Email cannot be empty.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role,
        verificationStatus: "active",
        createdAt: serverTimestamp(),
        fullName: fullName.trim(),
        householdSize: 0,
        dietaryPreferences: [],
        kitchenEquipment: [],
        locationConsent: false,
        analyticsConsent: false,
      });

      const userData = {
        uid: user.uid,
        email: user.email,
        role,
        verificationStatus: "active",
        fullName: fullName.trim(),
        householdSize: 0,
        dietaryPreferences: [],
        kitchenEquipment: [],
        locationConsent: false,
        analyticsConsent: false,
      };

      navigation.navigate("HomeDashboard", { userData });
    } catch (error: any) {
      Alert.alert("Registration Error", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.appName}>Create Account</Text>
        <Text style={styles.tagline}>Join FreshLoop today</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          placeholder="e.g. Jane Smith"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          style={styles.input}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          placeholder="you@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={[styles.input, styles.passwordInput]}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>I am a...</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === "home" && styles.roleButtonActive]}
            onPress={() => setRole("home")}
          >
            <Text style={[styles.roleText, role === "home" && styles.roleTextActive]}>
              Home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === "business" && styles.roleButtonActive]}
            onPress={() => setRole("business")}
          >
            <Text style={[styles.roleText, role === "business" && styles.roleTextActive]}>
              Business
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === "coordinator" && styles.roleButtonActive]}
            onPress={() => setRole("coordinator")}
          >
            <Text style={[styles.roleText, role === "coordinator" && styles.roleTextActive]}>
              NPO
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f2f7f2",
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2e7d32",
  },
  tagline: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f5f9f5",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: "#1a1a1a",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleText: {
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "600",
  },
  roleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#c8e6c9",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f5f9f5",
  },
  roleButtonActive: {
    borderColor: "#2e7d32",
    backgroundColor: "#e8f5e9",
  },
  roleText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "500",
  },
  roleTextActive: {
    color: "#2e7d32",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});