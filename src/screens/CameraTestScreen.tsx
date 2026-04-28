import { useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { COLORS } from "../constants/theme";

export default function CameraTestScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo?.uri ?? null);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Camera permission is required to use this feature.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.controls}>
        <Button
          title={capturing ? "Capturing..." : "Take Photo"}
          onPress={handleTakePhoto}
          disabled={capturing}
        />
      </View>

      {photoUri ? (
        <View style={styles.uriContainer}>
          <Text style={styles.uriLabel}>Captured photo URI:</Text>
          <Text style={styles.uriText} numberOfLines={3}>
            {photoUri}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
    color: COLORS.text,
  },
  camera: {
    flex: 1,
  },
  controls: {
    padding: 16,
    backgroundColor: COLORS.card,
  },
  uriContainer: {
    padding: 16,
    backgroundColor: COLORS.inputBg,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  uriLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  uriText: {
    fontSize: 12,
    color: COLORS.text,
  },
});
