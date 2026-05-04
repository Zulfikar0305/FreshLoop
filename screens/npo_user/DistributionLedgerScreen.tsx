// screens/npo_user/DistributionLedgerScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import CustomHeader from "../../components/CustomHeader";
import { useAuth } from "../../context/AuthContext";
import {
  subscribeClaimedDonations,
  type DonationListing,
} from "../../services/donationService";

const categoryIcons: Record<string, { icon: React.ComponentProps<typeof Feather>['name']; color: string; bg: string }> = {
  "Fresh Produce": { icon: "feather", color: "#10B981", bg: "#F0FDF4" },
  "Baked Goods": { icon: "coffee", color: "#F59E0B", bg: "#FEF3C7" },
  "Dairy": { icon: "droplet", color: "#3B82F6", bg: "#DBEAFE" },
  "Dry Goods": { icon: "package", color: "#8B5CF6", bg: "#EDE9FE" },
  "Prepared Meals": { icon: "shopping-bag", color: "#F97316", bg: "#FFEDD5" },
};

export default function DistributionLedgerScreen() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [donations, setDonations] = useState<DonationListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = session?.userId;
    if (!uid) { setLoading(false); return; }
    const unsub = subscribeClaimedDonations(
      uid,
      (items) => {
        setDonations(items.filter((d) => d.status === 'completed'));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [session?.userId]);

  const totalPickups = donations.length;
  const totalKg = donations.reduce((acc, d) => {
    if (d.unit.toLowerCase() === 'kg') {
      const n = parseFloat(d.quantity);
      return acc + (isNaN(n) ? 0 : n);
    }
    return acc;
  }, 0);

  const filtered = donations.filter((item) => {
    const matchSearch =
      search === '' ||
      item.donorName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.foodName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'All' || item.category === activeFilter;
    return matchSearch && matchFilter;
  });

  const categories = Array.from(new Set(donations.map((d) => d.category)));
  const filters = ['All', ...categories];

  return (
    <View style={{ flex: 1, backgroundColor: "#E2EBE1" }}>
      <CustomHeader
        settingsScreen="NPOSecurity"
        profileScreen="Profile"
        notificationsScreen="NPONotifications"
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5, marginBottom: 4 }}>Distribution Ledger</Text>
            <Text style={{ fontSize: 13, color: "#64748B" }}>Complete chain-of-custody log</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (filtered.length === 0) return;
              const lines = filtered.map((d) => {
                const dateStr = d.completedAt ? d.completedAt.toLocaleDateString() : '---';
                return `${dateStr} | ${d.donorName} | ${d.category} | ${d.quantity} ${d.unit}`;
              });
              Share.share({
                message: `FreshLoop Distribution Ledger\n\n${lines.join('\n')}\n\nTotal: ${totalPickups} pickups`,
                title: 'Distribution Ledger',
              });
            }}
            style={{ backgroundColor: "#2D6A4F", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flexDirection: "row", alignItems: "center" }}>
            <Feather name="download" size={14} color="#FFF" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 6 }}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Impact totals */}
        <View style={{ backgroundColor: "#1C3A2E", borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Running Impact Totals</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <Text style={{ fontSize: 36, fontWeight: "800", color: "#fff" }}>{totalKg.toFixed(1)}</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: 6, marginLeft: 4 }}>kg</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", marginTop: 4 }}>Food Rescued</Text>
            </View>
            <View style={{ width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 20 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 36, fontWeight: "800", color: "#fff" }}>{totalPickups}</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", marginTop: 4 }}>Completed Pickups</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
            <Feather name="check-circle" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginLeft: 6 }}>{totalPickups} completed pickup{totalPickups !== 1 ? 's' : ''} recorded</Text>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={{ flex: 1, marginLeft: 12, fontSize: 14, color: "#1E293B", fontWeight: "600" }}
            placeholder="Search by business or category..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
              <Feather name="x-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 20 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={{
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                backgroundColor: activeFilter === f ? "#2D6A4F" : "#fff",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: activeFilter === f ? "#fff" : "#64748B" }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Table header */}
        <View style={{ backgroundColor: "#F8FAFC", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>Donor</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, width: 90, textAlign: "right" }}>Quantity</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, width: 80, textAlign: "right" }}>Date</Text>
        </View>

        {/* Table rows */}
        <View style={{ backgroundColor: "#fff", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: "hidden", marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#2D6A4F" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center", backgroundColor: "#fff" }}>
              <Feather name={search ? "search" : "inbox"} size={32} color="#CBD5E1" />
              <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600", marginTop: 12 }}>
                {search ? "No records found" : "No completed pickups yet"}
              </Text>
            </View>
          ) : (
            filtered.map((item, index) => {
              const catCfg = categoryIcons[item.category] || { icon: "package" as const, color: "#64748B", bg: "#F1F5F9" };
              const dateStr = item.completedAt ? item.completedAt.toLocaleDateString() : '---';
              return (
                <View key={item.id} style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: index !== filtered.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9", backgroundColor: index % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  {/* Left: icon + info */}
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: catCfg.bg, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Feather name={catCfg.icon} size={18} color={catCfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#1E293B", marginBottom: 2 }} numberOfLines={1}>{item.donorName || '—'}</Text>
                      <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>{item.foodName}</Text>
                    </View>
                  </View>
                  {/* Quantity */}
                  <View style={{ width: 90, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#1E293B" }}>{item.quantity} {item.unit}</Text>
                  </View>
                  {/* Date */}
                  <View style={{ width: 80, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#2D6A4F" }}>{dateStr}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Export options */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => {
              const lines = filtered.map((d) => {
                const dateStr = d.completedAt ? d.completedAt.toLocaleDateString() : '---';
                return `${dateStr} | ${d.donorName} | ${d.category} | ${d.quantity} ${d.unit}`;
              });
              Share.share({
                message: `FreshLoop Distribution Ledger\n\n${lines.join('\n')}\n\nTotal: ${totalPickups} pickups`,
                title: 'Distribution Ledger',
              });
            }}
            style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }} activeOpacity={0.8}>
            <Feather name="file-text" size={16} color="#475569" />
            <Text style={{ color: "#1E293B", fontWeight: "800", fontSize: 14, marginLeft: 8 }}>Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const header = 'date,donor,category,quantity,unit';
              const rows = filtered.map((d) => {
                const dateStr = d.completedAt ? d.completedAt.toISOString().slice(0, 10) : '';
                return `${dateStr},${d.donorName},${d.category},${d.quantity},${d.unit}`;
              });
              Share.share({
                message: [header, ...rows].join('\n'),
                title: 'Distribution Ledger CSV',
              });
            }}
            style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }} activeOpacity={0.8}>
            <Feather name="grid" size={16} color="#475569" />
            <Text style={{ color: "#1E293B", fontWeight: "800", fontSize: 14, marginLeft: 8 }}>Export CSV</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}