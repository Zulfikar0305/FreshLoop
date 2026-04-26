import { useState } from "react";
import { Text, View, TextInput, Button, Alert, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
});