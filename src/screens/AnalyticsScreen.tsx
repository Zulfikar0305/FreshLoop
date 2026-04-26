import { useEffect, useState } from "react";
import {
  View,
  Text,
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
    <View style={styles.container}>
      <Text style={styles.title}>Analytics</Text>

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

      {insightMessage ? (
        <Text style={[styles.insightMessage, { color: efficiencyColor }]}>
          {insightMessage}
        </Text>
      ) : null}
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
    marginBottom: 24,
  },
  insightMessage: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  label: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  count: {
    fontSize: 32,
    fontWeight: "bold",
  },
  usedColor: {
    color: "#27ae60",
  },
  wastedColor: {
    color: "#e74c3c",
  },
});