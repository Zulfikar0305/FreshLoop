import { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Image, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { getUserInventory } from "../services/inventoryService";
import { scheduleTestNotification, isExpoGo } from "../services/notificationService";
import { useTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../theme/colors";
import BottomNav from "../components/BottomNav";

type CardItem = {
  icon: string;
  title: string;
  desc: string;
  screen: string;
  params?: Record<string, unknown>;
};

function getSmartTip(wasteGoal: string, expired: number, soon: number): string {
  if (wasteGoal === "save_money") {
    if (expired > 0) return `Use ${expired} expired item${expired !== 1 ? "s" : ""} now — don't waste money!`;
    if (soon > 0) return `Plan meals for ${soon} expiring item${soon !== 1 ? "s" : ""} to save money.`;
    return "Great job! Efficient pantry — no money wasted right now.";
  }
  if (wasteGoal === "donate_more") {
    if (expired > 0) return `${expired} item${expired !== 1 ? "s" : ""} may be donation candidates — act now.`;
    if (soon > 0) return `${soon} item${soon !== 1 ? "s" : ""} expiring soon — consider donating surplus.`;
    return "All clear! No urgent donation candidates right now.";
  }
  if (expired > 0) return `${expired} item${expired !== 1 ? "s" : ""} expired — cook or compost today.`;
  if (soon > 0) return `${soon} item${soon !== 1 ? "s" : ""} expire soon — plan meals now.`;
  return "Your pantry looks good — keep reducing waste!";
}

export default function HomeDashboardScreen({ route, navigation }: any) {
  const userData = route?.params?.userData ?? null;

  const fullName: string =
    userData?.fullName?.trim() ? userData.fullName.trim() : "FreshLoop User";

  const role: "home" | "business" | "coordinator" =
    userData?.role === "business"
      ? "business"
      : userData?.role === "coordinator"
      ? "coordinator"
      : "home";

  const roleLabel =
    role === "business"
      ? "Business Account"
      : role === "coordinator"
      ? "NPO Coordinator"
      : "Home User";

  const { colors: c } = useTheme();
  const styles = getStyles(c);

  const [expiredCount, setExpiredCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [noDateCount, setNoDateCount] = useState(0);
  const [alertLoading, setAlertLoading] = useState(true);
  const [wasteGoal, setWasteGoal] = useState("");
  const [reminderWindowDays, setReminderWindowDays] = useState(3);
  const [riskDismissed, setRiskDismissed] = useState(false);

  useEffect(() => {
    const loadAlerts = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) { setAlertLoading(false); return; }
      try {
        const [items, userSnap] = await Promise.all([
          getUserInventory(currentUser.uid),
          getDoc(doc(db, "users", currentUser.uid)),
        ]);
        let window = 3;
        if (userSnap.exists()) {
          const d = userSnap.data();
          setWasteGoal(d.wasteGoal ?? "");
          const rwd = d.reminderWindowDays;
          if (rwd === 1 || rwd === 3 || rwd === 7) {
            window = rwd;
            setReminderWindowDays(rwd);
          }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const windowDate = new Date(today);
        windowDate.setDate(today.getDate() + window);
        let expired = 0;
        let soon = 0;
        let noDate = 0;
        for (const item of items) {
          if (item.status !== "active") continue;
          if (!item.expiryDate) { noDate += 1; continue; }
          const expiry = new Date(item.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          if (expiry < today) expired += 1;
          else if (expiry <= windowDate) soon += 1;
        }
        setExpiredCount(expired);
        setExpiringSoonCount(soon);
        setNoDateCount(noDate);
      } catch {
        // non-critical — dashboard still loads
      } finally {
        setAlertLoading(false);
      }
    };
    loadAlerts();
  }, []);

  const hasAlerts = expiredCount > 0 || expiringSoonCount > 0;
  const showHighRiskModal = !riskDismissed && (expiredCount >= 3 || (expiredCount + expiringSoonCount) >= 5);
  const showDonateCard = role === "home";

  const homeCards: CardItem[] = [
    { icon: "🍎", title: "Add Food",         desc: "Track new pantry items",          screen: "AddFood" },
    { icon: "📦", title: "Inventory",         desc: "Browse what you have",            screen: "Inventory" },
    { icon: "📊", title: "Analytics",         desc: "View waste statistics",          screen: "Analytics" },
    { icon: "💡", title: "Suggestions",       desc: "Smart meal tips",                screen: "Suggestions" },
    { icon: "🤖", title: "FreshBot",          desc: "AI pantry advisor",             screen: "Suggestions" },
    { icon: "📋", title: "Scan / Bulk Add",   desc: "Add multiple items at once",    screen: "AddFood", params: { mode: "bulk" } },
    { icon: "👤", title: "Profile",           desc: "Edit your details",             screen: "Profile" },
    { icon: "🚨", title: "Report",            desc: "Flag an issue",                screen: "Report" },
  ];

  const businessCards: CardItem[] = [
    { icon: "🎁", title: "Donate Food",  desc: "List surplus food",          screen: "CreateDonation" },
    { icon: "📋", title: "Donations",    desc: "View all listings",          screen: "DonationsList" },
    { icon: "📊", title: "Analytics",    desc: "View waste statistics",      screen: "Analytics" },
    { icon: "👤", title: "Profile",      desc: "Edit your details",          screen: "Profile" },
    { icon: "🚨", title: "Report",       desc: "Flag an issue",              screen: "Report" },
  ];

  const coordinatorCards: CardItem[] = [
    { icon: "📋", title: "Donations",  desc: "Claim & manage food",  screen: "DonationsList" },
    { icon: "👤", title: "Profile",    desc: "Edit your details",    screen: "Profile" },
    { icon: "🚨", title: "Report",     desc: "Flag an issue",        screen: "Report" },
  ];

  const cards =
    role === "business"
      ? businessCards
      : role === "coordinator"
      ? coordinatorCards
      : homeCards;

  return (
    <SafeAreaView style={styles.outerContainer}>
    {/* ══ High Waste Risk Modal ══ */}
    <Modal
      visible={showHighRiskModal}
      transparent
      animationType="fade"
      onRequestClose={() => setRiskDismissed(true)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalIcon}>⚠️</Text>
          <Text style={styles.modalTitle}>High Waste Risk</Text>
          <Text style={styles.modalBody}>
            You have items close to expiry. Use, freeze, or donate them today to avoid waste.
          </Text>
          <TouchableOpacity
            style={styles.modalAction}
            onPress={() => { setRiskDismissed(true); navigation.navigate("Suggestions", { userData }); }}
          >
            <Text style={styles.modalActionText}>View FreshBot Suggestions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setRiskDismissed(true)}>
            <Text style={styles.modalDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome card */}
      <View style={styles.welcomeCard}>
        <Image source={require("../../assets/images/freshloop-logo.png")} style={styles.welcomeLogoImg} resizeMode="contain" />
        <View style={styles.welcomeText}>
          <Text style={styles.greeting}>Hi, {fullName} 👋</Text>
          <Text style={styles.roleLabel}>{roleLabel}</Text>
          <Text style={styles.welcomeSub}>Manage your food, reduce waste</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>What would you like to do?</Text>

      {/* Expiry Alerts card — home users only */}
      {!alertLoading && role === "home" && (
        <View style={[
          styles.alertCard,
          hasAlerts ? styles.alertCardWarn : styles.alertCardOk,
        ]}>
          <View style={styles.alertRow}>
            <Text style={styles.alertIcon}>{hasAlerts ? "⚠️" : "✅"}</Text>
            <View style={styles.alertBody}>
              <Text style={[styles.alertTitle, { color: hasAlerts ? "#b45309" : "#166534" }]}>
                {hasAlerts ? "Expiry Alert" : "Pantry All Clear"}
              </Text>
              {hasAlerts ? (
                <Text style={styles.alertDesc}>
                  {expiredCount > 0 && `${expiredCount} item${expiredCount !== 1 ? "s" : ""} already expired. `}
                  {expiringSoonCount > 0 && `${expiringSoonCount} item${expiringSoonCount !== 1 ? "s" : ""} expiring within ${reminderWindowDays} day${reminderWindowDays !== 1 ? "s" : ""}.`}
                </Text>
              ) : (
                <Text style={styles.alertDesc}>
                  {noDateCount > 0
                    ? `You have ${noDateCount} active item${noDateCount !== 1 ? "s" : ""} with no expiry date set.`
                    : `No items expiring in the next ${reminderWindowDays} day${reminderWindowDays !== 1 ? "s" : ""}.`}
                </Text>
              )}
            </View>
          </View>
          {!isExpoGo && (
            <TouchableOpacity
              style={styles.testBtn}
              onPress={scheduleTestNotification}
              activeOpacity={0.8}
            >
              <Text style={styles.testBtnText}>Test Alert</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Smart Summary card — home users only */}
      {!alertLoading && wasteGoal !== "" && role === "home" && (
        <View style={styles.smartCard}>
          <Text style={styles.smartTitle}>✨ Smart Summary</Text>
          <Text style={styles.smartTip}>{getSmartTip(wasteGoal, expiredCount, expiringSoonCount)}</Text>
          {wasteGoal === "donate_more" && expiringSoonCount > 0 && (
            <Text style={[styles.smartTip, styles.smartTipDonate]}>
              🤝 Donation opportunity: {expiringSoonCount} item{expiringSoonCount !== 1 ? "s" : ""} may be suitable for donation.
            </Text>
          )}
        </View>
      )}

      {/* Donate Expiring Food card — home users only, when items are expiring soon */}
      {showDonateCard && (
        <TouchableOpacity
          style={styles.donateCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("CreateDonation", { userData })}
        >
          <Text style={styles.donateIcon}>🤝</Text>
          <View style={styles.donateBody}>
            <Text style={styles.donateTitle}>
              {expiringSoonCount > 0 ? "Donate Expiring Food" : "Donate Food"}
            </Text>
            <Text style={styles.donateDesc}>
              {expiringSoonCount > 0
                ? `${expiringSoonCount} item${expiringSoonCount !== 1 ? "s" : ""} expiring soon. List them for donation instead of wasting.`
                : "Have surplus food? List it for donation to reduce waste."}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={`${card.title}-${card.screen}`}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(card.screen, { userData, ...(card.params ?? {}) })}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    <BottomNav navigation={navigation} active="HomeDashboard" role={role} userData={userData} />
    </SafeAreaView>
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
  welcomeCard: {
    backgroundColor: c.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  welcomeLogoImg: {
    width: 56,
    height: 56,
  },
  welcomeText: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  roleLabel: {
    fontSize: 13,
    color: "#B2F0F0",
    marginTop: 3,
    fontWeight: "600",
  },
  welcomeSub: {
    fontSize: 12,
    color: "#CCF5F5",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.text,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
  },

  // Expiry alerts
  alertCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  alertCardWarn: {
    backgroundColor: c.card,
    borderLeftWidth: 4,
    borderLeftColor: c.warning,
  },
  alertCardOk: {
    backgroundColor: c.card,
    borderLeftWidth: 4,
    borderLeftColor: c.success,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  alertIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  alertBody: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  alertDesc: {
    fontSize: 13,
    color: c.text,
    lineHeight: 18,
  },
  testBtn: {
    alignSelf: "flex-end",
    marginTop: 10,
    backgroundColor: c.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  testBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  smartCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  smartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.primary,
    marginBottom: 6,
  },
  smartTip: {
    fontSize: 13,
    color: c.text,
    lineHeight: 20,
  },
  smartTipDonate: {
    marginTop: 6,
    color: c.accent,
    fontWeight: "600",
  },
  // ── Donate expiring food card ──
  donateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: c.success,
    shadowColor: c.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  donateIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  donateBody: {
    flex: 1,
  },
  donateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.text,
    marginBottom: 3,
  },
  donateDesc: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
  },
  // ── High waste risk modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: c.danger,
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: c.text,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  modalAction: {
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  modalActionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalDismiss: {
    paddingVertical: 8,
  },
  modalDismissText: {
    color: c.textMuted,
    fontSize: 14,
  },
});
}
