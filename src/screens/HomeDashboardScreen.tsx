import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Image } from "react-native";
import { COLORS } from "../constants/theme";
import BottomNav from "../components/BottomNav";

type CardItem = {
  icon: string;
  title: string;
  desc: string;
  screen: string;
};

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

  const homeCards: CardItem[] = [
    { icon: "🍎", title: "Add Food", desc: "Track new pantry items", screen: "AddFood" },
    { icon: "📦", title: "Inventory", desc: "Browse what you have", screen: "Inventory" },
    { icon: "📊", title: "Analytics", desc: "View waste statistics", screen: "Analytics" },
    { icon: "💡", title: "Suggestions", desc: "Smart meal tips", screen: "Suggestions" },
    { icon: "🤖", title: "FreshBot", desc: "AI pantry advisor", screen: "FreshBot" },
    { icon: "👤", title: "Profile", desc: "Edit your details", screen: "Profile" },
    { icon: "📷", title: "Camera", desc: "Scan food items", screen: "CameraTest" },
    { icon: "🚨", title: "Report", desc: "Flag an issue", screen: "Report" },
  ];

  const businessCards: CardItem[] = [
    { icon: "🎁", title: "Donate Food", desc: "List surplus food", screen: "CreateDonation" },
    { icon: "📋", title: "Donations", desc: "View all listings", screen: "DonationsList" },
    { icon: "📊", title: "Analytics", desc: "View waste statistics", screen: "Analytics" },
    { icon: "🤖", title: "FreshBot", desc: "AI pantry advisor", screen: "FreshBot" },
    { icon: "👤", title: "Profile", desc: "Edit your details", screen: "Profile" },
    { icon: "📷", title: "Camera", desc: "Scan food items", screen: "CameraTest" },
    { icon: "🚨", title: "Report", desc: "Flag an issue", screen: "Report" },
  ];

  const coordinatorCards: CardItem[] = [
    { icon: "📋", title: "Donations", desc: "Claim & manage food", screen: "DonationsList" },
    { icon: "👤", title: "Profile", desc: "Edit your details", screen: "Profile" },
    { icon: "📷", title: "Camera", desc: "Scan food items", screen: "CameraTest" },
    { icon: "🚨", title: "Report", desc: "Flag an issue", screen: "Report" },
  ];

  const cards =
    role === "business"
      ? businessCards
      : role === "coordinator"
      ? coordinatorCards
      : homeCards;

  return (
    <View style={styles.outerContainer}>
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

      {/* 2-column feature grid */}
      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.screen}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(card.screen, { userData })}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    <BottomNav navigation={navigation} active="HomeDashboard" role={role} userData={userData} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 52,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  welcomeLogoImg: {
    width: 56,
    height: 56,
  },
  welcomeText: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
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
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
});
