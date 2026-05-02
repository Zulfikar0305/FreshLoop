import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { getUserInventory } from "../services/inventoryService";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../theme/colors";
import BottomNav from "../components/BottomNav";

type RiskLevel = "Low" | "Medium" | "High";

type Prediction = {
  risk: RiskLevel;
  reason: string;
  action: string;
};

function computePrediction(
  expiredNow: number,
  expiringSoon: number,
  activeTotal: number,
  wasteRate: number
): Prediction {
  const urgentRatio = activeTotal === 0 ? 0 : (expiredNow + expiringSoon) / activeTotal;

  if (expiredNow >= 3 || urgentRatio >= 0.5 || wasteRate >= 50) {
    return {
      risk: "High",
      reason:
        expiredNow >= 3
          ? `${expiredNow} item${expiredNow !== 1 ? "s" : ""} in your pantry have already expired.`
          : wasteRate >= 50
          ? `Your historical waste rate is ${wasteRate.toFixed(0)}% — more than half your food is being wasted.`
          : `${expiredNow + expiringSoon} out of ${activeTotal} pantry items are expiring imminently.`,
      action: "Use or donate expiring items today. Review shopping habits to avoid over-buying.",
    };
  }

  if (expiringSoon >= 2 || urgentRatio >= 0.25 || wasteRate >= 25) {
    return {
      risk: "Medium",
      reason:
        expiringSoon >= 2
          ? `${expiringSoon} item${expiringSoon !== 1 ? "s" : ""} will expire within 3 days.`
          : `Your waste rate is ${wasteRate.toFixed(0)}% — there's room to improve.`,
      action: "Plan meals around expiring items this week. Consider batch-cooking or freezing.",
    };
  }

  return {
    risk: "Low",
    reason:
      activeTotal === 0
        ? "No active pantry items tracked yet."
        : "Most of your pantry is fresh and your usage history looks healthy.",
    action:
      activeTotal === 0
        ? "Add items to your inventory so FreshBot can monitor them."
        : "Keep it up! Continue planning meals ahead and rotating stock regularly.",
  };
}

const RISK_COLOR: Record<RiskLevel, string> = {
  Low: "#27ae60",
  Medium: "#e67e22",
  High: "#e74c3c",
};

const RISK_EMOJI: Record<RiskLevel, string> = {
  Low: "🟢",
  Medium: "🟡",
  High: "🔴",
};

export default function AnalyticsScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business" ? "business" :
    userData?.role === "coordinator" ? "coordinator" : "home";
  const isBusiness = role === "business";
  const analyticsConsent: boolean = userData?.analyticsConsent === true;

  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const [totalUsed, setTotalUsed] = useState(0);
  const [totalWasted, setTotalWasted] = useState(0);
  const [totalSavedValue, setTotalSavedValue] = useState(0);
  const [totalWastedValue, setTotalWastedValue] = useState(0);
  const [expiredNow, setExpiredNow] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  // business-specific
  const [activeDonations, setActiveDonations] = useState(0);
  const [completedDonations, setCompletedDonations] = useState(0);
  const [totalQtyDonated, setTotalQtyDonated] = useState(0);
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
        if (isBusiness) {
          // Business: show donation impact stats
          const donQ = query(
            collection(db, "donations"),
            where("userId", "==", currentUser.uid)
          );
          const donSnap = await getDocs(donQ);
          let active = 0;
          let completed = 0;
          let totalQty = 0;
          donSnap.docs.forEach((d) => {
            const data = d.data();
            totalQty += typeof data.quantity === "number" ? data.quantity : 0;
            if (data.status === "completed") completed += 1;
            else active += 1;
          });
          setActiveDonations(active);
          setCompletedDonations(completed);
          setTotalQtyDonated(totalQty);
          setLoading(false);
          return;
        }
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

        // Inventory-based prediction data
        const inventoryItems = await getUserInventory(currentUser.uid);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);

        const active = inventoryItems.filter((i) => i.status === "active" && i.expiryDate !== null);
        let expired = 0;
        let soon = 0;
        for (const item of active) {
          const expiry = new Date(item.expiryDate as Date);
          expiry.setHours(0, 0, 0, 0);
          if (expiry < today) expired += 1;
          else if (expiry <= threeDaysLater) soon += 1;
        }
        setExpiredNow(expired);
        setExpiringSoon(soon);
        setActiveTotal(active.length);
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

  // Analytics consent gate (home users only — business always sees their donation stats)
  if (!isBusiness && !analyticsConsent) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.centered}>
          <Text style={styles.consentIcon}>📊</Text>
          <Text style={styles.consentTitle}>Analytics Disabled</Text>
          <Text style={styles.consentBody}>
            Analytics disabled. Enable in Profile to view insights.
          </Text>
          <TouchableOpacity
            style={styles.consentButton}
            onPress={() => navigation.navigate("Profile", { userData })}
          >
            <Text style={styles.consentButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
        <BottomNav navigation={navigation} active="Analytics" role={role} userData={userData} />
      </View>
    );
  }

  // Business: show donation impact stats
  if (isBusiness) {
    const estimatedKgDiverted = (totalQtyDonated * 0.5).toFixed(1);
    return (
      <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Donation Analytics</Text>
        <Text style={styles.subtitle}>Your surplus food impact</Text>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.label}>Active Listings</Text>
            <Text style={[styles.count, { color: c.primary }]}>{activeDonations}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Completed</Text>
            <Text style={[styles.count, styles.usedColor]}>{completedDonations}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Total Qty Donated</Text>
            <Text style={[styles.count, styles.usedColor]}>{totalQtyDonated}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Est. Waste Diverted</Text>
            <Text style={[styles.count, styles.usedColor]}>{estimatedKgDiverted} kg</Text>
          </View>
        </View>

        {completedDonations === 0 && activeDonations === 0 ? (
          <View style={styles.insightCard}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: "center" }}>
              No donations listed yet. Use "List Surplus Food" to start reducing food waste.
            </Text>
          </View>
        ) : (
          <View style={styles.insightCard}>
            <Text style={[styles.insightMessage, { color: c.success }]}>
              🌱 Thank you! Your {completedDonations} completed donation{completedDonations !== 1 ? "s" : ""} have helped reduce food waste in your community.
            </Text>
          </View>
        )}
      </ScrollView>
      <BottomNav navigation={navigation} active="Analytics" role={role} userData={userData} />
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
    <View style={styles.outerContainer}>
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

      {/* ══ AI Waste Prediction ══ */}
      {(() => {
        const prediction = computePrediction(expiredNow, expiringSoon, activeTotal, wasteRate);
        const riskColor = RISK_COLOR[prediction.risk];
        return (
          <View style={styles.predictionSection}>
            <View style={styles.predictionHeaderRow}>
              <Text style={styles.predictionTitle}>🤖 AI Waste Prediction</Text>
            </View>

            <View style={[styles.predictionCard, { borderLeftColor: riskColor }]}>
              <View style={styles.predictionRiskRow}>
                <Text style={styles.predictionRiskEmoji}>{RISK_EMOJI[prediction.risk]}</Text>
                <View>
                  <Text style={styles.predictionRiskLabel}>Risk Level</Text>
                  <Text style={[styles.predictionRiskValue, { color: riskColor }]}>
                    {prediction.risk}
                  </Text>
                </View>
              </View>

              <View style={styles.predictionDivider} />

              <Text style={styles.predictionFieldLabel}>📊 Why</Text>
              <Text style={styles.predictionFieldValue}>{prediction.reason}</Text>

              <Text style={[styles.predictionFieldLabel, { marginTop: 12 }]}>✅ Recommended Action</Text>
              <Text style={styles.predictionFieldValue}>{prediction.action}</Text>

              {activeTotal > 0 && (
                <View style={styles.predictionStats}>
                  {expiredNow > 0 && (
                    <View style={[styles.predictionStatPill, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                      <Text style={[styles.predictionStatText, { color: c.danger }]}>
                        {expiredNow} expired
                      </Text>
                    </View>
                  )}
                  {expiringSoon > 0 && (
                    <View style={[styles.predictionStatPill, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                      <Text style={[styles.predictionStatText, { color: c.warning }]}>
                        {expiringSoon} expiring soon
                      </Text>
                    </View>
                  )}
                  <View style={[styles.predictionStatPill, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                    <Text style={[styles.predictionStatText, { color: c.success }]}>
                      {activeTotal} tracked
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      })()}
    </ScrollView>
    <BottomNav navigation={navigation} active="Analytics" role={role} userData={userData} />
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    backgroundColor: c.background,
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.background,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: c.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 20,
  },
  consentIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  consentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.text,
    marginBottom: 8,
    textAlign: "center",
  },
  consentBody: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  consentButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  consentButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  card: {
    width: "47%",
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 6,
    fontWeight: "500",
  },
  count: {
    fontSize: 26,
    fontWeight: "800",
  },
  usedColor: {
    color: c.primary,
  },
  wastedColor: {
    color: c.danger,
  },
  insightCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
    borderLeftWidth: 4,
    borderLeftColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
    alignItems: "center",
  },
  insightMessage: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  // AI Waste Prediction
  predictionSection: {
    marginTop: 24,
  },
  predictionHeaderRow: {
    borderLeftWidth: 4,
    borderLeftColor: c.primary,
    paddingLeft: 10,
    marginBottom: 14,
  },
  predictionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.text,
  },
  predictionCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  predictionRiskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  predictionRiskEmoji: {
    fontSize: 36,
  },
  predictionRiskLabel: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  predictionRiskValue: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
  },
  predictionDivider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 14,
  },
  predictionFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  predictionFieldValue: {
    fontSize: 14,
    color: c.text,
    lineHeight: 21,
  },
  predictionStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  predictionStatPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  predictionStatText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
}