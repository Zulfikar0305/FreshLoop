import { Text, View, StyleSheet } from "react-native";

export default function HomeDashboardScreen({ route }: any) {
  const userData = route?.params?.userData ?? null;

  const email: string = userData?.email ?? "User";
  const role: "home" | "business" | undefined = userData?.role;

  const dashboardTitle =
    role === "business" ? "Business Dashboard" : "Home User Dashboard";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{dashboardTitle}</Text>
      <Text style={styles.welcome}>Welcome, {email}</Text>
      {role ? (
        <Text style={styles.role}>Role: {role}</Text>
      ) : (
        <Text style={styles.role}>Role: unknown</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  welcome: {
    fontSize: 18,
    marginBottom: 8,
  },
  role: {
    fontSize: 16,
    color: "#555",
  },
});