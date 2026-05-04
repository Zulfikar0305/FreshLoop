// screens/npo_user/HandoffScannerScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeClaimedDonations,
  completeDonation,
  type DonationListing,
} from "../../services/donationService";

export default function HandoffScannerScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [donations, setDonations] = useState<DonationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    const unsub = subscribeClaimedDonations(
      session.userId,
      (items) => {
        setDonations(items.filter((d) => d.status === "claimed"));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [session?.userId]);

  const selected = donations.find((d) => d.id === selectedId) ?? null;

  const handleConfirm = async () => {
    if (!selectedId) return;
    setConfirming(true);
    try {
      await completeDonation(selectedId);
      setSelectedId(null);
      Alert.alert("Handoff Confirmed", "The pickup has been marked as completed.");
    } catch {
      Alert.alert("Error", "Could not complete the pickup. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1C3A2E" }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 }}>Handoff Confirmation</Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Select a claimed pickup to confirm handoff</Text>
        </View>

        {/* Content panel */}
        <View style={{ flex: 1, backgroundColor: "#E2EBE1", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* Info banner */}
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name="info" size={20} color="#2D6A4F" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#1E293B", marginBottom: 2 }}>How handoff works</Text>
                  <Text style={{ fontSize: 12, color: "#64748B", lineHeight: 18 }}>
                    Select a claimed pickup below and tap Confirm Handoff. This marks the donation as completed. Camera scanning is not available in this version.
                  </Text>
                </View>
              </View>
            </View>

            {/* Pickup list label */}
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Claimed Pickups
            </Text>

            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2D6A4F" />
              </View>
            ) : donations.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center", backgroundColor: "#fff", borderRadius: 16 }}>
                <Feather name="inbox" size={32} color="#CBD5E1" />
                <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600", marginTop: 12 }}>No claimed pickups</Text>
                <Text style={{ color: "#CBD5E1", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 24 }}>
                  Claim a donation from Active Pickups first.
                </Text>
              </View>
            ) : (
              donations.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedId(isSelected ? null : item.id)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? "#2D6A4F" : "transparent",
                      shadowColor: "#000",
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{
                        width: 44, height: 44, borderRadius: 12,
                        backgroundColor: isSelected ? "rgba(45,106,79,0.12)" : "#F1F5F9",
                        alignItems: "center", justifyContent: "center", marginRight: 12,
                      }}>
                        <Feather name="package" size={20} color={isSelected ? "#2D6A4F" : "#64748B"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: "#1E293B", marginBottom: 2 }} numberOfLines={1}>
                          {item.foodName}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }} numberOfLines={1}>
                          {item.donorName} Â· {item.quantity} {item.unit}
                        </Text>
                        {item.pickupAddress ? (
                          <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }} numberOfLines={1}>
                            {item.pickupAddress}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && <Feather name="check-circle" size={22} color="#2D6A4F" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Confirm button â€” only shown when a pickup is selected */}
            {selected ? (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={confirming}
                activeOpacity={0.85}
                style={{
                  backgroundColor: confirming ? "#94A3B8" : "#2D6A4F",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginTop: 8,
                  shadowColor: "#2D6A4F",
                  shadowOpacity: confirming ? 0 : 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontWeight: "800", fontSize: 16, color: "#fff" }}>
                    Confirm Handoff â€” {selected.foodName}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}

            {/* Report issue */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('NPOReport' as never)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 16, paddingVertical: 14, marginTop: 12 }}
            >
              <Feather name="alert-triangle" size={16} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontWeight: "800", marginLeft: 8 }}>Report an Issue</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
