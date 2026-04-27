import { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  checkBiometricSupport,
  authenticateWithBiometrics,
} from "../services/authService";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    checkBiometricSupport().then(setBiometricSupported).catch(console.warn);
  }, []);

  const handleBiometricLogin = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        "Biometric Login Unavailable",
        "Please log in with email and password first before using biometrics."
      );
      return;
    }

    const success = await authenticateWithBiometrics();
    if (!success) {
      Alert.alert("Authentication Failed", "Biometric authentication failed. Please try again.");
      return;
    }

    try {
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (!userSnap.exists()) {
        Alert.alert("Error", "User account not found. Please log in with email and password.");
        return;
      }
      navigation.navigate("HomeDashboard", { userData: userSnap.data() });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Validation Error", "Email is required.");
      return;
    }
    if (!password) {
      Alert.alert("Validation Error", "Password is required.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const uid = userCredential.user.uid;

      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        Alert.alert("Error", "User account not found. Please register first.");
        return;
      }

      const userData = userSnap.data();

      navigation.navigate("HomeDashboard", { userData });
    } catch (error: any) {
      console.log(error.code, error.message);
      const friendlyMessage =
        error.code === "auth/invalid-credential" || error.code === "auth/invalid-email"
          ? "Invalid email or password. Please check your details."
          : error.code === "auth/user-not-found"
          ? "No account found with this email."
          : error.code === "auth/wrong-password"
          ? "Incorrect password."
          : error.message;
      Alert.alert("Login Error", friendlyMessage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.appName}>FreshLoop</Text>
        <Text style={styles.tagline}>Reduce waste. Eat smart.</Text>
      </View>

      <View style={styles.card}>
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
            placeholder="••••••••"
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

        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Login</Text>
        </TouchableOpacity>

        {biometricSupported && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBiometricLogin}>
            <Text style={styles.secondaryButtonText}>Login with Biometrics</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f7f2",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    fontSize: 52,
    marginBottom: 8,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#2e7d32",
    letterSpacing: 0.5,
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
  primaryButton: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#2e7d32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#2e7d32",
    fontSize: 15,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  linkText: {
    color: "#2e7d32",
    fontSize: 14,
  },
});