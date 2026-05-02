import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

export default function FreshBotScreen({ navigation, route }: any) {
  const userData = route?.params?.userData ?? null;

  useEffect(() => {
    navigation.replace("Suggestions", { userData });
  }, []);

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
