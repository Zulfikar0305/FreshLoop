// components/MapPreview.tsx
// Shared real-map preview component used by DonationHubScreen, DonateScreen, and any other screen
// that needs to show a small area map without full navigation or geocoding.

import React, { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

// ── City coordinate lookup ───────────────────────────────────────────────────
export const DEFAULT_COORD = { latitude: -29.8587, longitude: 31.0218 }; // Durban

const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'durban':           { latitude: -29.8587, longitude: 31.0218 },
  'johannesburg':     { latitude: -26.2041, longitude: 28.0473 },
  'cape town':        { latitude: -33.9249, longitude: 18.4241 },
  'pretoria':         { latitude: -25.7461, longitude: 28.1881 },
  'port elizabeth':   { latitude: -33.9608, longitude: 25.6022 },
  'bloemfontein':     { latitude: -29.0852, longitude: 26.1596 },
  'east london':      { latitude: -33.0153, longitude: 27.9116 },
  'pietermaritzburg': { latitude: -29.6006, longitude: 30.3794 },
  'nelspruit':        { latitude: -25.4745, longitude: 30.9694 },
  'polokwane':        { latitude: -23.9045, longitude: 29.4688 },
  'westville':        { latitude: -29.8297, longitude: 30.9313 },
  'pinetown':         { latitude: -29.8169, longitude: 30.8599 },
  'chatsworth':       { latitude: -29.9167, longitude: 30.9500 },
  'berea':            { latitude: -29.8518, longitude: 31.0191 },
};

export function cityToCoord(city: string): { latitude: number; longitude: number } {
  const key = city.toLowerCase().trim();
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return DEFAULT_COORD;
}

/**
 * Returns a coordinate in priority order:
 * 1. Explicit lat/lng (if provided)
 * 2. City name lookup (if provided)
 * 3. DEFAULT_COORD (Durban)
 */
export function getFallbackCoord(
  latitude?: number | null,
  longitude?: number | null,
  city?: string,
): { latitude: number; longitude: number } {
  if (latitude != null && longitude != null) return { latitude, longitude };
  if (city) return cityToCoord(city);
  return DEFAULT_COORD;
}

// ── MapPreview component ─────────────────────────────────────────────────────

export type MapPreviewProps = {
  /**
   * Explicit coordinates to centre the map on.
   * If omitted, the component falls back to profileCity → phone location → DEFAULT_COORD.
   */
  latitude?: number | null;
  longitude?: number | null;
  /** City from the user/business profile, used as first fallback. */
  profileCity?: string;
  /**
   * Whether to request and use the phone's GPS location as a fallback.
   * Defaults to true. Set to false in forms where the address is the source of truth.
   */
  usePhoneLocation?: boolean;
  /** Height of the map container. Defaults to 150. */
  height?: number;
  /** Marker title shown in the callout when tapped. */
  markerTitle?: string;
  /** Marker description shown in the callout when tapped. */
  markerDescription?: string;
  /** Whether the marker represents the user's own location (blue) or a pickup pin (green). */
  markerVariant?: 'user' | 'pickup';
  /** If true, MapView uses a controlled `region` prop so the viewport follows coordinate changes. */
  useRegion?: boolean;
  /** Called when the user taps the map. */
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  /** If true, the marker is draggable by the user. */
  draggable?: boolean;
  /** Called when the user finishes dragging the marker. */
  onMarkerDragEnd?: (coord: { latitude: number; longitude: number }) => void;
};

export default function MapPreview({
  latitude,
  longitude,
  profileCity,
  usePhoneLocation = true,
  height = 150,
  markerTitle,
  markerDescription,
  markerVariant = 'pickup',
  useRegion = false,
  onMapPress,
  draggable = false,
  onMarkerDragEnd,
}: MapPreviewProps) {
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [label,  setLabel]  = useState('');

  useEffect(() => {
    let cancelled = false;

    // If explicit coordinates are provided, use them immediately — no need for location
    if (latitude != null && longitude != null) {
      setCenter({ latitude, longitude });
      setLabel(markerTitle ?? 'Pickup area');
      return;
    }

    // If a profile city is provided, use it as a fast synchronous fallback
    if (profileCity) {
      const coord = cityToCoord(profileCity);
      if (!cancelled) {
        setCenter(coord);
        setLabel(`Profile area · ${profileCity}`);
      }
    }

    // Optionally also try phone GPS (may override city if permission granted)
    if (!usePhoneLocation) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            setCenter({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setLabel('Your current location');
          }
        } else {
          // Permission denied — keep city fallback or set default
          if (!profileCity && !cancelled) {
            setCenter(DEFAULT_COORD);
            setLabel('Set city in profile for better matching');
          }
        }
      } catch {
        // GPS unavailable — keep city fallback or use default
        if (!profileCity && !cancelled) {
          setCenter(DEFAULT_COORD);
          setLabel('Default area · Durban');
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, profileCity]);

  if (!center) {
    // Still resolving location — show a minimal loading state
    return (
      <View style={{
        height,
        borderRadius: 14,
        backgroundColor: '#E8F0E8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D1E8D0',
      }}>
        <Feather name="map" size={22} color="#94A3B8" />
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
          Loading map…
        </Text>
      </View>
    );
  }

  const region = {
    latitude:       center.latitude,
    longitude:      center.longitude,
    latitudeDelta:  0.12,
    longitudeDelta: 0.12,
  };

  const pinColor = markerVariant === 'user' ? '#60A5FA' : '#2D6A4F';

  return (
    <View style={{ height, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#D1E8D0' }}>
      <MapView
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        region={useRegion ? region : undefined}
        initialRegion={useRegion ? undefined : region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={onMapPress ? (e) => onMapPress(e.nativeEvent.coordinate) : undefined}
      >
        <Marker
          coordinate={center}
          pinColor={pinColor}
          title={markerTitle ?? label}
          description={markerDescription}
          draggable={draggable}
          onDragEnd={onMarkerDragEnd ? (e) => onMarkerDragEnd(e.nativeEvent.coordinate) : undefined}
        />
      </MapView>

      {/* Label overlay */}
      {!!label && (
        <View style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          maxWidth: '80%',
          borderWidth: 1,
          borderColor: '#E2E8F0',
        }}>
          <Feather name="map-pin" size={10} color={pinColor} />
          <Text style={{ fontSize: 10, color: '#1E293B', fontWeight: '700' }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}
