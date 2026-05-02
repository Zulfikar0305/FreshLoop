import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { COLORS } from "../constants/theme";

type IssueType = "user" | "listing" | "system";

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "user", label: "User" },
  { value: "listing", label: "Listing" },
  { value: "system", label: "System" },
];

export default function ReportScreen({ navigation }: any) {
  const [issueType, setIssueType] = useState<IssueType>("user");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Validation Error", "Description is required.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        userId: currentUser.uid,
        issueType,
        description: description.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Report submitted successfully.");
      setIssueType("user");
      setDescription("");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Report an Issue</Text>

      <Text style={styles.label}>Issue Type</Text>
      <View style={styles.typeRow}>
        {ISSUE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeButton,
              issueType === type.value && styles.typeButtonActive,
            ]}
            onPress={() => setIssueType(type.value)}
          >
            <Text
              style={[
                styles.typeButtonText,
                issueType === type.value && styles.typeButtonTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description *</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue..."
        multiline
        numberOfLines={4}
        style={[styles.input, styles.multiline]}
      />

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? "Submitting..." : "Submit Report"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingBottom: 48,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  backButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#E0F4F4",
  },
  typeButtonText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  multiline: {
    height: 110,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#80CECE",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
