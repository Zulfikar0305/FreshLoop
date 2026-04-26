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

export default function AddFoodScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [price, setPrice] = useState("");

  const resetForm = () => {
    setName("");
    setQuantity("");
    setUnit("");
    setExpiryDate("");
    setPrice("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required.");
      return;
    }
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert("Validation Error", "Quantity must be greater than 0.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found. Please log in again.");
      return;
    }

    let parsedExpiry: Date | null = null;
    if (expiryDate.trim()) {
      parsedExpiry = new Date(expiryDate.trim());
      if (isNaN(parsedExpiry.getTime())) {
        Alert.alert("Validation Error", "Invalid expiry date. Use YYYY-MM-DD format.");
        return;
      }
    }

    const parsedPrice = price.trim() === "" ? 0 : parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Validation Error", "Price must be 0 or greater.");
      return;
    }

    try {
      await addDoc(collection(db, "inventoryItems"), {
        userId: currentUser.uid,
        name: name.trim(),
        quantity: parsedQty,
        unit: unit.trim(),
        expiryDate: parsedExpiry ?? null,
        price: parsedPrice,
        createdAt: serverTimestamp(),
        status: "active",
      });

      Alert.alert("Success", "Food item added to inventory.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      resetForm();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Food Item</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        placeholder="e.g. Milk"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.label}>Quantity *</Text>
      <TextInput
        placeholder="e.g. 2"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Unit</Text>
      <TextInput
        placeholder="e.g. litres, kg, pcs"
        value={unit}
        onChangeText={setUnit}
        style={styles.input}
      />

      <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
      <TextInput
        placeholder="e.g. 2026-05-01"
        value={expiryDate}
        onChangeText={setExpiryDate}
        style={styles.input}
      />

      <Text style={styles.label}>Price (R)</Text>
      <TextInput
        placeholder="e.g. 29.99"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button title="Add Item" onPress={handleSubmit} />

      <View style={styles.cancelButton}>
        <Button title="Cancel" color="#888" onPress={() => navigation.goBack()} />
      </View>
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
    marginBottom: 4,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 12,
  },
});