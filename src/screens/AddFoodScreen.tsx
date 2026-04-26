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
import { auth } from "../firebase/firebaseConfig";
import { addInventoryItem } from "../services/inventoryService";

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
      await addInventoryItem(
        {
          name: name.trim(),
          quantity: parsedQty,
          unit: unit.trim(),
          expiryDate: parsedExpiry ?? null,
          price: parsedPrice,
        },
        currentUser.uid
      );

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
      <Text style={styles.subtitle}>Track what's in your pantry</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Item Name *</Text>
        <TextInput
          placeholder="e.g. Milk, Bread, Apples"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Quantity *</Text>
        <TextInput
          placeholder="e.g. 2"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Unit</Text>
        <TextInput
          placeholder="e.g. litres, kg, pcs"
          value={unit}
          onChangeText={setUnit}
          style={styles.input}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
        <TextInput
          placeholder="e.g. 2026-05-15"
          value={expiryDate}
          onChangeText={setExpiryDate}
          style={styles.input}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Price (R)</Text>
        <TextInput
          placeholder="e.g. 29.99  (optional)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#aaa"
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>Add to Inventory</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f2f7f2",
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f5f9f5",
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#2e7d32",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#888",
    fontSize: 15,
  },
});