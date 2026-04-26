import { useRef, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

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
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
    color: "#333",
  },
  camera: {
    flex: 1,
  },
  controls: {
    padding: 16,
    backgroundColor: "#fff",
  },
  uriContainer: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  uriLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  uriText: {
    fontSize: 12,
    color: "#222",
  },
});
