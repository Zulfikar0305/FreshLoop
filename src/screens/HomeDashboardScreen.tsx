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
    { label: "View Analytics", screen: "Analytics" },
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
      <Text style={styles.title}>{dashboardTitle}</Text>
      <Text style={styles.welcome}>Welcome, {email}</Text>
      <Text style={styles.role}>Role: {role}</Text>

      <View style={styles.buttonList}>
        {buttons.map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={[styles.button, btn.screen === null && styles.placeholderButton]}
            onPress={() => btn.screen && navigation.navigate(btn.screen)}
            disabled={btn.screen === null}
          >
            <Text style={[styles.buttonText, btn.screen === null && styles.placeholderText]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  welcome: {
    fontSize: 16,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: "#555",
    marginBottom: 28,
  },
  buttonList: {
    gap: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  placeholderButton: {
    backgroundColor: "#ccc",
  },
  placeholderText: {
    color: "#888",
  },
});