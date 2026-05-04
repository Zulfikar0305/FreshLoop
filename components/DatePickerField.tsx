// components/DatePickerField.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Format = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';

function parseToDate(str: string, fmt: Format): Date | null {
  if (!str || str.length < 8) return null;
  let y: number, m: number, d: number;
  if (fmt === 'YYYY-MM-DD') {
    const p = str.split('-');
    if (p.length !== 3) return null;
    [y, m, d] = [+p[0], +p[1] - 1, +p[2]];
  } else if (fmt === 'MM/DD/YYYY') {
    const p = str.split('/');
    if (p.length !== 3) return null;
    [m, d, y] = [+p[0] - 1, +p[1], +p[2]];
  } else {
    const p = str.split('/');
    if (p.length !== 3) return null;
    [d, m, y] = [+p[0], +p[1] - 1, +p[2]];
  }
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const date = new Date(y, m, d);
  return isNaN(date.getTime()) ? null : date;
}

function dateToString(date: Date, fmt: Format): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (fmt === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  if (fmt === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  return `${d}/${m}/${y}`;
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  format?: Format;
  placeholder?: string;
  accentColor?: string;
  error?: boolean;
  containerStyle?: object;
};

export default function DatePickerField({
  value,
  onChange,
  format = 'YYYY-MM-DD',
  placeholder,
  accentColor = '#2D6A4F',
  error = false,
  containerStyle = {},
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = parseToDate(value, format);
  const initView = parsed
    ? new Date(parsed.getFullYear(), parsed.getMonth(), 1)
    : new Date(today.getFullYear(), today.getMonth(), 1);

  const [showCal,   setShowCal]   = useState(false);
  const [viewMonth, setViewMonth] = useState(initView);

  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const last  = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const arr: (number | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) arr.push(null);
    for (let d = 1; d <= last.getDate(); d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewMonth]);

  const selectDay = (day: number) => {
    const sel = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange(dateToString(sel, format));
    setShowCal(false);
  };

  const isSelected = (day: number) =>
    !!parsed &&
    parsed.getFullYear() === viewMonth.getFullYear() &&
    parsed.getMonth()    === viewMonth.getMonth()    &&
    parsed.getDate()     === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewMonth.getFullYear() &&
    today.getMonth()    === viewMonth.getMonth()    &&
    today.getDate()     === day;

  const ph = placeholder ?? format;

  return (
    <View style={containerStyle}>
      {/* ── Text input + calendar icon ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: error ? 2 : 1,
        borderColor: error ? '#EF4444' : showCal ? accentColor : '#E2E8F0',
        paddingHorizontal: 14, height: 50,
        shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 14, color: '#1E293B' }}
          value={value}
          onChangeText={v => { onChange(v); setShowCal(false); }}
          placeholder={ph}
          placeholderTextColor="#CBD5E1"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowCal(p => !p)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Feather name="calendar" size={18} color={showCal ? accentColor : '#94A3B8'} />
        </TouchableOpacity>
      </View>

      {/* ── Inline calendar drop-down ── */}
      {showCal && (
        <View style={{
          backgroundColor: '#fff', borderRadius: 16,
          borderWidth: 1, borderColor: '#E2E8F0',
          padding: 14, marginTop: 6,
          shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
          zIndex: 999,
        }}>
          {/* Month navigation */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 14,
          }}>
            <TouchableOpacity
              onPress={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-left" size={22} color="#1E293B" />
            </TouchableOpacity>

            <Text style={{ fontWeight: '800', fontSize: 15, color: '#1E293B' }}>
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </Text>

            <TouchableOpacity
              onPress={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-right" size={22} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DAY_HEADERS.map(h => (
              <View key={h} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8' }}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`blank-${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              }
              const sel   = isSelected(day);
              const todayMark = isToday(day);
              return (
                <TouchableOpacity
                  key={`${day}-${idx}`}
                  onPress={() => selectDay(day)}
                  activeOpacity={0.7}
                  style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: sel ? accentColor : 'transparent',
                    borderWidth: todayMark && !sel ? 1.5 : 0,
                    borderColor: accentColor,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: sel || todayMark ? '800' : '500',
                      color: sel ? '#fff' : todayMark ? accentColor : '#1E293B',
                    }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity
            onPress={() => {
              onChange(dateToString(today, format));
              setShowCal(false);
            }}
            activeOpacity={0.7}
            style={{
              marginTop: 10, paddingVertical: 8,
              borderTopWidth: 1, borderTopColor: '#F1F5F9',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: accentColor }}>
              Today
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
