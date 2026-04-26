import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

type IssueType = "user" | "listing" | "system";

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "user", label: "User" },
  { value: "listing", label: "Listing" },
  { value: "system", label: "System" },
];

export default function ReportScreen() {
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

      <Button
        title={submitting ? "Submitting..." : "Submit Report"}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  typeButtonActive: {
    borderColor: "#1565c0",
    backgroundColor: "#e3f2fd",
  },
  typeButtonText: {
    fontSize: 14,
    color: "#555",
  },
  typeButtonTextActive: {
    color: "#1565c0",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 20,
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
  },
});
