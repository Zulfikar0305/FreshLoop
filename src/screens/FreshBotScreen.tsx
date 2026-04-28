import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { auth } from "../firebase/firebaseConfig";
import { getUserInventory, InventoryItem } from "../services/inventoryService";
import { COLORS } from "../constants/theme";

function generateSuggestions(items: InventoryItem[]): string[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const active = items
    .filter((item) => item.status === "active" && item.expiryDate !== null)
    .sort((a, b) => (a.expiryDate as Date).getTime() - (b.expiryDate as Date).getTime());

  const suggestions: string[] = [];

  for (const item of active) {
    const expiry = item.expiryDate as Date;
    const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const diffMs = expiryDay.getTime() - startOfToday.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      suggestions.push(`Use ${item.name} today or consider donating it.`);
    } else if (diffDays <= 2) {
      suggestions.push(`Plan a meal using ${item.name} soon.`);
    }
  }

  return suggestions;
}

export default function FreshBotScreen() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert("Error", "No logged-in user found.");
          return;
        }

        const items = await getUserInventory(currentUser.uid);
        setSuggestions(generateSuggestions(items));
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>FreshBot</Text>
      <Text style={styles.subtitle}>AI-style pantry assistant</Text>

      {suggestions.length === 0 ? (
        <Text style={styles.allGood}>
          Your pantry looks good. No urgent food waste risks detected.
        </Text>
      ) : (
        suggestions.map((tip, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.tip}>{tip}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  allGood: {
    fontSize: 15,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 60,
    fontWeight: "500",
  },
  card: {
    backgroundColor: COLORS.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tip: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
});
