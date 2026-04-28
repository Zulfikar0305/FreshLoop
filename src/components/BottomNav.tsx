import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { COLORS } from "../constants/theme";

type Role = "home" | "business" | "coordinator";

type Tab = {
  key: string;
  label: string;
  icon: string;
  screen: string;
};

const HOME_TABS: Tab[] = [
  { key: "HomeDashboard", label: "Home",     icon: "🏠", screen: "HomeDashboard" },
  { key: "Inventory",     label: "Pantry",   icon: "📦", screen: "Inventory" },
  { key: "Analytics",     label: "Analytics",icon: "📊", screen: "Analytics" },
  { key: "FreshBot",      label: "FreshBot", icon: "🤖", screen: "FreshBot" },
  { key: "Profile",       label: "Profile",  icon: "👤", screen: "Profile" },
];

const BUSINESS_TABS: Tab[] = [
  { key: "HomeDashboard", label: "Home",      icon: "🏠", screen: "HomeDashboard" },
  { key: "DonationsList", label: "Donations", icon: "🎁", screen: "DonationsList" },
  { key: "FreshBot",      label: "FreshBot",  icon: "🤖", screen: "FreshBot" },
  { key: "Profile",       label: "Profile",   icon: "👤", screen: "Profile" },
];

const COORDINATOR_TABS: Tab[] = [
  { key: "HomeDashboard", label: "Home",      icon: "🏠", screen: "HomeDashboard" },
  { key: "DonationsList", label: "Donations", icon: "📋", screen: "DonationsList" },
  { key: "Profile",       label: "Profile",   icon: "👤", screen: "Profile" },
];

function getTabsForRole(role: Role): Tab[] {
  if (role === "business") return BUSINESS_TABS;
  if (role === "coordinator") return COORDINATOR_TABS;
  return HOME_TABS;
}

type BottomNavProps = {
  navigation: any;
  active?: string;
  role?: Role;
  userData?: any;
};

export default function BottomNav({ navigation, active, role = "home", userData }: BottomNavProps) {
  const tabs = getTabsForRole(role);

  const handlePress = (tab: Tab) => {
    if (active === tab.key) return;
    navigation.navigate(tab.screen, userData != null ? { userData } : undefined);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    position: "relative",
  },
  icon: {
    fontSize: 20,
    marginBottom: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  activeDot: {
    position: "absolute",
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});
