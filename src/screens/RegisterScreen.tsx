import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type Role = "home" | "business";

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("home");

  const handleRegister = async () => {
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
        fullName: "",
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
        fullName: "",
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
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Text style={styles.label}>Select Role:</Text>
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
      </View>

      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginBottom: 12,
    padding: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  roleButtonActive: {
    borderColor: "#007AFF",
    backgroundColor: "#E8F0FE",
  },
  roleText: {
    color: "#555",
  },
  roleTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
});