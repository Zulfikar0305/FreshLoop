import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../theme/colors";

type Role = "home" | "business" | "coordinator";

export default function RegisterScreen({ navigation }: any) {
  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("home");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Full name is required.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validation Error", "Email cannot be empty.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert("Validation Error", "Please enter a valid email address.");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      Alert.alert("Validation Error", "Password must be at least 8 characters and include at least one letter and one number.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;
      await sendEmailVerification(user);

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

      Alert.alert(
        "Account Created!",
        "Your account has been created. Please verify your email when you get a chance.",
        [{
          text: "Continue",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "SetupProfile", params: { uid: user.uid, role, fullName: fullName.trim() } }],
            }),
        }]
      );
    } catch (error: any) {
      Alert.alert("Registration Error", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Image source={require("../../assets/images/freshloop-logo.png")} style={styles.logoImage} resizeMode="contain" />
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
        <Text style={styles.passwordHint}>Min. 8 characters, at least 1 letter and 1 number.</Text>
        <View style={styles.passwordRow}>
          <TextInput
            placeholder="Min. 8 chars, 1 letter, 1 number"
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

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    backgroundColor: c.background,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoImage: {
    width: 150,
    height: 150,
    marginTop: 8,
    marginBottom: 12,
    alignSelf: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: c.primary,
  },
  tagline: {
    fontSize: 14,
    color: c.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: c.card,
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
    color: c.text,
    marginBottom: 6,
  },
  passwordHint: {
    fontSize: 11,
    color: c.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.inputBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: c.text,
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
    color: c.primary,
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
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: c.inputBg,
  },
  roleButtonActive: {
    borderColor: c.primary,
    backgroundColor: c.surface,
  },
  roleText: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  roleTextActive: {
    color: c.primary,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: c.primary,
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
}