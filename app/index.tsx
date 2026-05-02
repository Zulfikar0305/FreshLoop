import { ThemeProvider } from "../src/context/ThemeContext";
import AppNavigator from "../src/navigation/AppNavigator";

export default function Index() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}