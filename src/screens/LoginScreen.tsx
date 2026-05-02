import { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert, StyleSheet, Image } from "react-native";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  checkBiometricSupport,
  authenticateWithBiometrics,
} from "../services/authService";
import { COLORS } from "../constants/theme";

// Required for expo-auth-session to close the browser after redirect.
WebBrowser.maybeCompleteAuthSession();

// Get this from Firebase Console → Authentication → Sign-in method
// → Google → Web SDK configuration → Web client ID.
const GOOGLE_WEB_CLIENT_ID = "538096064336-26a86jhffoag6mn6vbafkrj2hqm9ikek.apps.googleusercontent.com";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hasCurrentUser, setHasCurrentUser] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  const handleGoogleSignIn = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const uid = result.user.uid;
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        navigation.reset({ index: 0, routes: [{ name: "HomeDashboard", params: { userData } }] });
      } else {
        // First-time Google sign-in — let the user choose their role.
        navigation.reset({
          index: 0,
          routes: [{
            name: "RoleSetup",
            params: {
              uid: result.user.uid,
              email: result.user.email ?? "",
              fullName: result.user.displayName ?? "FreshLoop User",
            },
          }],
        });
      }
    } catch (error: any) {
      const code: string = error?.code ?? "";
      const friendlyMessage =
        code === "auth/network-request-failed"
          ? "Network error. Please check your internet connection and try again."
          : code === "auth/user-disabled"
          ? "This Google account has been disabled. Please contact support."
          : "Google sign-in failed. Please try again.";
      Alert.alert("Google Sign-In Error", friendlyMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    checkBiometricSupport().then(setBiometricSupported).catch(console.warn);
    setHasCurrentUser(auth.currentUser !== null);
  }, []);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params.id_token;
      if (idToken) {
        handleGoogleSignIn(idToken);
      } else {
        Alert.alert("Google Sign-In Error", "No ID token received. Please try again.");
      }
    } else if (googleResponse?.type === "error") {
      Alert.alert("Google Sign-In Error", "Google sign-in failed. Please try again.");
    }
    // "dismiss" means the user cancelled — no alert shown.
  }, [googleResponse]);

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
      navigation.reset({ index: 0, routes: [{ name: "HomeDashboard", params: { userData: userSnap.data() } }] });
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

      navigation.reset({ index: 0, routes: [{ name: "HomeDashboard", params: { userData } }] });
    } catch (error: any) {
      const code: string = error?.code ?? "";
      const friendlyMessage =
        code === "auth/invalid-credential" || code === "auth/invalid-email"
          ? "Invalid email or password. Please check your details."
          : code === "auth/user-not-found"
          ? "No account found with this email. Have you registered?"
          : code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : code === "auth/user-disabled"
          ? "This account has been disabled. Please contact support."
          : code === "auth/too-many-requests"
          ? "Too many failed attempts. Please wait a moment before trying again."
          : code === "auth/network-request-failed"
          ? "Network error. Please check your internet connection."
          : error.message;
      Alert.alert("Login Error", friendlyMessage);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../../assets/images/freshloop-logo.png")} style={styles.logoImage} resizeMode="contain" />
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

        {biometricSupported && hasCurrentUser && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBiometricLogin}>
            <Text style={styles.secondaryButtonText}>Login with Biometrics</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
          onPress={() => promptGoogleAsync()}
          disabled={googleLoading}
        >
          <Text style={styles.googleButtonText}>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>

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
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 160,
    height: 160,
    marginTop: 16,
    marginBottom: 12,
    alignSelf: "center",
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: COLORS.text,
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
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
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
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#dadce0",
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    color: "#3c4043",
    fontSize: 15,
    fontWeight: "600",
  },
});