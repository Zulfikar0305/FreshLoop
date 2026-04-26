import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { auth } from "../firebase/firebaseConfig";
import { getUserInventory } from "../services/inventoryService";

type SuggestionItem = {
  id: string;
  name: string;
  expiryDate: Date;
};

function getDaysRemaining(expiryDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryColor(days: number): string {
  if (days < 0) return "#c0392b";
  if (days <= 1) return "#e74c3c";
  if (days <= 3) return "#e67e22";
  return "#27ae60";
}

function getExpiryLabel(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days !== 1 ? "s" : ""}`;
}

export default function SuggestionsScreen() {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "No logged-in user found.");
        setLoading(false);
        return;
      }

      try {
        const allItems = await getUserInventory(currentUser.uid);

        const items: SuggestionItem[] = allItems
          .filter((item) => item.status === "active" && item.expiryDate !== null)
          .map((item) => ({
            id: item.id,
            name: item.name,
            expiryDate: item.expiryDate as Date,
          }));

        // Sort earliest expiry first, take top 5
        items.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
        setSuggestions(items.slice(0, 5));
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suggestions</Text>
      <Text style={styles.subtitle}>Use these items first</Text>

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No urgent items.</Text>
        }
        renderItem={({ item }) => {
          const days = getDaysRemaining(item.expiryDate);
          const color = getExpiryColor(days);
          const label = getExpiryLabel(days);
          return (
            <View style={styles.card}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={[styles.expiryLabel, { color }]}>{label}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    marginBottom: 20,
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  expiryLabel: {
    fontSize: 14,
  },
});
