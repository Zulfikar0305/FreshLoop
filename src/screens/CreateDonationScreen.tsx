import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

export default function CreateDonationScreen({ navigation }: any) {
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert("Validation Error", "Food name is required.");
      return;
    }

    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert("Validation Error", "Quantity must be greater than 0.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "donations"), {
        userId: currentUser.uid,
        foodName: foodName.trim(),
        quantity: parsedQuantity,
        description: description.trim(),
        status: "available",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Donation listed successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Donation</Text>

      <Text style={styles.label}>Food Name *</Text>
      <TextInput
        value={foodName}
        onChangeText={setFoodName}
        placeholder="e.g. Canned beans"
        style={styles.input}
      />

      <Text style={styles.label}>Quantity *</Text>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="e.g. 5"
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Optional details about the donation"
        multiline
        numberOfLines={3}
        style={[styles.input, styles.multiline]}
      />

      <Button
        title={submitting ? "Submitting..." : "Submit Donation"}
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
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  multiline: {
    height: 80,
    textAlignVertical: "top",
  },
});
