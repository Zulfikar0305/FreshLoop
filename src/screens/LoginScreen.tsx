import { useState, useEffect } from "react";
import { Text, View, TextInput, Button, Alert, StyleSheet } from "react-native";
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
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    checkBiometricSupport().then(setBiometricSupported);
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
        email.trim(),
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
      Alert.alert("Login Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

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

      <Button title="Login" onPress={handleLogin} />

      {biometricSupported && (
        <View style={styles.biometricButton}>
          <Button title="Login with Biometrics" onPress={handleBiometricLogin} />
        </View>
      )}

      <View style={styles.registerLink}>
        <Button
          title="Go to Register"
          onPress={() => navigation.navigate("Register")}
        />
      </View>
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
  registerLink: {
    marginTop: 20,
  },
  biometricButton: {
    marginTop: 12,
  },
});