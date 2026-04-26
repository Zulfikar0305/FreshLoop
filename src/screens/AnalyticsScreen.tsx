import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

export default function AnalyticsScreen() {
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalWasted, setTotalWasted] = useState(0);
  const [totalSavedValue, setTotalSavedValue] = useState(0);
  const [totalWastedValue, setTotalWastedValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "No logged-in user found.");
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "wasteLogs"),
          where("userId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(q);

        let used = 0;
        let wasted = 0;
        let savedValue = 0;
        let wastedValue = 0;

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status;
          const price = typeof data.price === "number" ? data.price : 0;
          if (status === "used") {
            used += 1;
            savedValue += price;
          } else if (status === "wasted") {
            wasted += 1;
            wastedValue += price;
          }
        });

        setTotalUsed(used);
        setTotalWasted(wasted);
        setTotalSavedValue(savedValue);
        setTotalWastedValue(wastedValue);
      } catch (error: any) {
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const totalItems = totalUsed + totalWasted;
  const efficiencyRate = totalItems === 0 ? 0 : (totalUsed / totalItems) * 100;
  const wasteRate = totalItems === 0 ? 0 : (totalWasted / totalItems) * 100;

  const efficiencyColor =
    efficiencyRate >= 70 ? "#27ae60" : efficiencyRate >= 40 ? "#e67e22" : "#e74c3c";

  const insightMessage =
    totalItems === 0
      ? null
      : efficiencyRate > 70
      ? "Great job! You are minimizing food waste."
      : efficiencyRate >= 40
      ? "You're doing okay, but there's room to improve."
      : "High waste detected. Try using items before expiry.";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Analytics</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>Items Used</Text>
          <Text style={[styles.count, styles.usedColor]}>{totalUsed}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Items Wasted</Text>
          <Text style={[styles.count, styles.wastedColor]}>{totalWasted}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Money Saved</Text>
          <Text style={[styles.count, styles.usedColor]}>R {totalSavedValue.toFixed(2)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Money Wasted</Text>
          <Text style={[styles.count, styles.wastedColor]}>R {totalWastedValue.toFixed(2)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Efficiency Rate</Text>
          <Text style={[styles.count, { color: efficiencyColor }]}>{efficiencyRate.toFixed(1)}%</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Waste Rate</Text>
          <Text style={[styles.count, styles.wastedColor]}>{wasteRate.toFixed(1)}%</Text>
        </View>
      </View>

      {insightMessage ? (
        <View style={styles.insightCard}>
          <Text style={[styles.insightMessage, { color: efficiencyColor }]}>
            {insightMessage}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f2f7f2",
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f7f2",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  card: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 6,
    fontWeight: "500",
  },
  count: {
    fontSize: 26,
    fontWeight: "800",
  },
  usedColor: {
    color: "#2e7d32",
  },
  wastedColor: {
    color: "#c62828",
  },
  insightCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: "center",
  },
  insightMessage: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});