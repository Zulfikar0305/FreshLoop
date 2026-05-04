// screens/general_user/FreshBotScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import { useAuth } from '../../context/AuthContext';
import { getUserInventory, type InventoryItem } from '../../services/inventoryService';

const BOTTOM_NAV_HEIGHT = 80; // match your tab bar height exactly



const SUGGESTED_PROMPTS = [
  '🥬 Use my expiring spinach',
  '🧊 Can I freeze milk?',
  '🛒 Clear my pantry this week',
  '🍗 Chicken recipe ideas',
  '📊 Why do I waste dairy?',
  '🤝 Find nearby donations',
];



function getDaysLeft(expiryDate: Date | null): number {
  if (!expiryDate) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

export default function FreshBotScreen() {
  const { session } = useAuth();
  const firstName = session?.name?.split(' ')[0] ?? '';
  type Message = { id: string; sender: 'bot' | 'user'; text: string; time: string; type: string };
  const [inputText,    setInputText]  = useState('');
  const [messages,     setMessages]   = useState<Message[]>([{
    id: '1', sender: 'bot',
    text: `Hi${firstName ? ` ${firstName}` : ''}! 👋 I'm FreshBot, your food-saving assistant. Ask me anything about food storage, recipes, or reducing waste. 🌿`,
    time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    type: 'text',
  }]);
  const scrollRef = useRef<ScrollView>(null);
  const [pantryItems, setPantryItems] = useState<InventoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.userId) return;
      getUserInventory(session.userId)
        .then((inv) => setPantryItems(inv.filter((i) => i.status === 'active')))
        .catch(() => {});
    }, [session?.userId])
  );

  const getFreshBotReply = (input: string): string => {
    const msg = input.toLowerCase();
    if (/expir|expiring|expire/.test(msg)) {
      const urgent = pantryItems
        .map((i) => ({ ...i, daysLeft: getDaysLeft(i.expiryDate) }))
        .filter((i) => i.daysLeft <= 3 && i.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft);
      if (urgent.length > 0) {
        const list = urgent
          .slice(0, 4)
          .map((i) => `${i.name} (${i.daysLeft === 0 ? 'today' : `${i.daysLeft}d`})`)
          .join(', ');
        return `⚠️ From your pantry, these items are expiring soon: ${list}. Open AI Recipes to generate meals using them, or use the Donation Hub to pass on anything you won't finish.`;
      }
      return '⚠️ No urgently expiring items found in your pantry right now — great job staying on top of things! Keep checking Smart Pantry regularly.';
    }
    if (/recipe|cook|make|bake|meal/.test(msg)) {
      const count = pantryItems.length;
      return `🍳 Head over to AI Recipes (the spark icon in your nav bar) — it generates recipes from the ${count > 0 ? `${count} active item${count === 1 ? '' : 's'}` : 'items'} in your pantry right now, prioritising the items expiring soonest.`;
    }
    if (/donat|donation|give|surplus/.test(msg))
      return "🤝 You can donate safe surplus food through the Donation Hub. Tap the gift icon in your nav bar, switch to the 'Give Food' tab, and select a pantry item to post a listing for nearby NPOs to claim.";
    if (/waste|wasted|throwing|threw/.test(msg))
      return "📊 Check your Waste Analytics screen for a breakdown of which categories you waste most. Marking items as 'used' or 'wasted' in your pantry keeps the data accurate and helps FreshLoop give better advice.";
    return "💡 FreshLoop tip: plan meals around your soonest-expiring pantry items, keep fridge temperature between 0–4 °C, and use the Donation Hub to pass on safe surplus instead of binning it. Small habits make a big difference! 🌿";
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      time: 'Just now',
      type: 'text',
    };

    const botReply: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'bot',
      text: getFreshBotReply(inputText.trim()),
      time: 'Just now',
      type: 'text',
    };

    setMessages(prev => [...prev, userMsg, botReply]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handlePromptTap = (prompt: string) => {
    const clean = prompt.replace(/^\p{Emoji}\s*/u, '').trim();
    setInputText(clean);
  };

  return (
    // marginBottom pushes the entire screen above the bottom nav bar
    <View style={[s.root, { marginBottom: BOTTOM_NAV_HEIGHT }]}>
      <CustomHeader />
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />

      {/* ── Bot identity bar ── */}
      <View style={s.botBar}>
        <View style={s.botAvatar}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.botName}>FreshBot</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Always online · Food-saving assistant</Text>
          </View>
        </View>

      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Chat scroll area ── */}
        <ScrollView
          ref={scrollRef}
          style={s.chatScroll}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Date separator */}
          <View style={s.dateSep}>
            <View style={s.dateLine} />
            <Text style={s.dateLabel}>Today</Text>
            <View style={s.dateLine} />
          </View>

          {/* Messages */}
          {messages.map(msg => {
            const isBot        = msg.sender === 'bot';
            const isSuggestion = msg.type === 'suggestion';
            const isWarning    = msg.type === 'warning';

            return (
              <View
                key={msg.id}
                style={[s.msgRow, isBot ? s.msgRowBot : s.msgRowUser]}
              >
                {isBot && (
                  <View style={s.msgAvatar}>
                    <Text style={{ fontSize: 13 }}>🤖</Text>
                  </View>
                )}

                <View style={[
                  s.bubble,
                  isBot        ? s.bubbleBot        : s.bubbleUser,
                  isSuggestion && s.bubbleSuggestion,
                  isWarning    && s.bubbleWarning,
                ]}>
                  {isSuggestion && (
                    <View style={s.bubbleHeader}>
                      <Feather name="zap" size={12} color="#0D9488" />
                      <Text style={[s.bubbleHeaderText, { color: '#0D9488' }]}>
                        Recipe suggestions
                      </Text>
                    </View>
                  )}
                  {isWarning && (
                    <View style={s.bubbleHeader}>
                      <Feather name="alert-triangle" size={12} color="#F97316" />
                      <Text style={[s.bubbleHeaderText, { color: '#F97316' }]}>
                        Pantry alert
                      </Text>
                    </View>
                  )}

                  <Text style={[
                    s.bubbleText,
                    isBot        ? s.bubbleTextBot  : s.bubbleTextUser,
                    isSuggestion && { color: '#0F766E' },
                    isWarning    && { color: '#C2410C' },
                  ]}>
                    {msg.text}
                  </Text>

                  <Text style={[
                    s.bubbleTime,
                    isBot ? s.bubbleTimeBot : s.bubbleTimeUser,
                  ]}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Context awareness footer */}
          <View style={s.contextFooter}>
            <Feather name="shield" size={11} color="#CBD5E1" />
            <Text style={s.contextFooterText}>
              FreshBot checks your pantry for expiry alerts · general food-saving tips · waste reduction
            </Text>
          </View>
        </ScrollView>

        {/* ── Input area — sits above bottom nav, never overlaps it ── */}
        <View style={s.inputArea}>

          {/* Suggested prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.promptsScroll}
          >
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={s.promptChip}
                onPress={() => handlePromptTap(prompt)}
                activeOpacity={0.7}
              >
                <Text style={s.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input row */}
          <View style={s.inputRow}>
            {/* Camera button */}
            <TouchableOpacity
              style={s.roundIconBtn}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Camera', 'Camera input is not available in this version.')}
            >
              <Feather name="camera" size={18} color="#64748B" />
            </TouchableOpacity>

            {/* Text box */}
            <View style={s.textInputWrap}>
              <TextInput
                style={s.textInput}
                placeholder="Ask FreshBot anything..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={200}
              />
            </View>

            {/* Send or mic */}
            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                style={s.sendBtn}
                onPress={handleSend}
                activeOpacity={0.85}
              >
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.sendBtn, s.sendBtnMic]}
                onPress={() => Alert.alert('Voice Input', 'Voice input is not available in this version.')}
                activeOpacity={0.85}
              >
                <Feather
                  name="mic"
                  size={16}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#fff' },
  flex:               { flex: 1 },

  // Bot bar
  botBar:             { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  botAvatar:          { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  botName:            { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  onlineRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  onlineText:         { fontSize: 11, color: '#64748B', fontWeight: '500' },
  contextTag:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#BBF7D0' },
  contextTagText:     { fontSize: 12, fontWeight: '700', color: '#2D6A4F' },

  // Chat
  chatScroll:         { flex: 1, backgroundColor: '#F8FAFC' },
  chatContent:        { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },

  dateSep:            { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dateLine:           { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dateLabel:          { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  // Proactive banner
  proactiveBanner:    { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BBF7D0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  proactiveTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  proactiveIcon:      { width: 28, height: 28, backgroundColor: '#FEF3C7', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  proactiveTitle:     { flex: 1, fontSize: 13, fontWeight: '800', color: '#1E293B' },
  proactiveText:      { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 12 },
  proactiveChips:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  expiryChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FECACA' },
  expiryChipDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  expiryChipText:     { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  proactiveBtn:       { backgroundColor: '#1C3A2E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  proactiveBtnText:   { fontSize: 13, fontWeight: '800', color: '#4ADE80' },

  // Messages
  msgRow:             { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  msgRowBot:          { justifyContent: 'flex-start', paddingRight: 48 },
  msgRowUser:         { justifyContent: 'flex-end', paddingLeft: 48 },
  msgAvatar:          { width: 28, height: 28, borderRadius: 9, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2, flexShrink: 0 },

  bubble:             { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, flexShrink: 1 },
  bubbleBot:          { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 5, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  bubbleUser:         { backgroundColor: '#1C3A2E', borderBottomRightRadius: 5 },
  bubbleSuggestion:   { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 },
  bubbleWarning:      { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1 },

  bubbleHeader:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  bubbleHeaderText:   { fontSize: 11, fontWeight: '800' },
  bubbleText:         { fontSize: 14, lineHeight: 21 },
  bubbleTextBot:      { color: '#1E293B' },
  bubbleTextUser:     { color: '#fff' },
  bubbleTime:         { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
  bubbleTimeBot:      { color: '#94A3B8' },
  bubbleTimeUser:     { color: 'rgba(255,255,255,0.5)' },

  contextFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingHorizontal: 20 },
  contextFooterText:  { fontSize: 11, color: '#CBD5E1', textAlign: 'center', flex: 1, lineHeight: 16 },

  // Input area
  inputArea:          { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingBottom: Platform.OS === 'ios' ? 12 : 8 },

  promptsScroll:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  promptChip:         { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16 },
  promptText:         { fontSize: 12, color: '#475569', fontWeight: '600' },

  recordingBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF2F2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#FECACA' },
  recordingDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  recordingText:      { flex: 1, fontSize: 12, color: '#DC2626', fontWeight: '600' },

  inputRow:           { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 4, gap: 8 },
  roundIconBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 1 },
  textInputWrap:      { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 22, minHeight: 44, maxHeight: 110, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 11 : 8, justifyContent: 'center' },
  textInput:          { fontSize: 14, color: '#1E293B', padding: 0 },

  sendBtn:            { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1C3A2E', alignItems: 'center', justifyContent: 'center', shadowColor: '#1C3A2E', shadowOpacity: 0.3, shadowRadius: 6, elevation: 3, marginBottom: 1 },
  sendBtnMic:         { backgroundColor: '#2D6A4F' },
  sendBtnRecording:   { backgroundColor: '#EF4444' },
});