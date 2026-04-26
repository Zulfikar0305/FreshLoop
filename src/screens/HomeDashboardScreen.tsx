import { Text, View, TouchableOpacity, StyleSheet } from "react-native";

export default function HomeDashboardScreen({ route, navigation }: any) {
  const userData = route?.params?.userData ?? null;

  const email: string = userData?.email ?? "User";
  const role: "home" | "business" | "coordinator" =
    userData?.role === "business"
      ? "business"
      : userData?.role === "coordinator"
      ? "coordinator"
      : "home";

  const dashboardTitle =
    role === "business"
      ? "Business Dashboard"
      : role === "coordinator"
      ? "NPO Coordinator Dashboard"
      : "Home User Dashboard";

  const homeButtons = [
    { label: "Add Food", screen: "AddFood" },
    { label: "View Inventory", screen: "Inventory" },
    { label: "View Analytics", screen: "Analytics" },
    { label: "Smart Suggestions", screen: "Suggestions" },
    { label: "FreshBot", screen: "FreshBot" },
    { label: "Profile", screen: "Profile" },
    { label: "Camera Test", screen: "CameraTest" },
    { label: "Report Issue", screen: "Report" },
  ];

  const businessButtons = [
    { label: "Donate Food", screen: "CreateDonation" },
    { label: "View Donations", screen: "DonationsList" },
    { label: "View Analytics", screen: "Analytics" },
    { label: "FreshBot", screen: "FreshBot" },
    { label: "Profile", screen: "Profile" },
    { label: "Camera Test", screen: "CameraTest" },
    { label: "Report Issue", screen: "Report" },
  ];

  const coordinatorButtons = [
    { label: "View Donations", screen: "DonationsList" },
    { label: "Profile", screen: "Profile" },
    { label: "Camera Test", screen: "CameraTest" },
    { label: "Report Issue", screen: "Report" },
  ];

  const buttons =
    role === "business"
      ? businessButtons
      : role === "coordinator"
      ? coordinatorButtons
      : homeButtons;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.logo}>🌱</Text>
        <View>
          <Text style={styles.title}>{dashboardTitle}</Text>
          <Text style={styles.welcome}>{email}</Text>
          <Text style={styles.role}>{role.charAt(0).toUpperCase() + role.slice(1)} account</Text>
        </View>
      </View>

      <View style={styles.buttonList}>
        {buttons.map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={styles.button}
            onPress={() => navigation.navigate(btn.screen)}
          >
            <Text style={styles.buttonText}>{btn.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f7f2",
    padding: 20,
    paddingTop: 52,
  },
  headerCard: {
    backgroundColor: "#2e7d32",
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
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  welcome: {
    fontSize: 13,
    color: "#c8e6c9",
    marginTop: 2,
  },
  role: {
    fontSize: 12,
    color: "#a5d6a7",
    marginTop: 1,
  },
  buttonList: {
    gap: 10,
  },
  button: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "600",
  },
  arrow: {
    color: "#2e7d32",
    fontSize: 22,
    fontWeight: "300",
  },
});