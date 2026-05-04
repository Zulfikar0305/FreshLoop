// components/LegalDocumentModal.tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// ── Document content ──────────────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    title: '1. Introduction',
    body: `FreshLoop (Pty) Ltd ("FreshLoop", "we", "our") is committed to protecting your personal information in compliance with the Protection of Personal Information Act, 2013 (POPIA) and all applicable South African privacy legislation.\n\nThis Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use the FreshLoop mobile application and related services.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect the following categories of personal information:\n\n• Identity information: full name, ID or registration number\n• Contact details: email address, phone number, physical address\n• Business information: trading name, VAT number, trading licence\n• Location data: GPS coordinates for pickup/delivery pins (with your consent)\n• Device information: device identifiers, OS version, app version\n• Usage data: pages visited, features used, timestamps\n• Food listing data: item descriptions, quantities, expiry dates\n• Transaction history: donations made, pickups completed`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your personal information to:\n\n• Create and manage your FreshLoop account\n• Verify your identity and business credentials\n• Facilitate food donation listings and pickups\n• Send notifications about nearby listings and pickup updates\n• Improve our platform through anonymised analytics\n• Comply with legal and regulatory obligations\n• Prevent fraud and ensure platform security\n• Generate impact reports and tax certificates`,
  },
  {
    title: '4. Legal Basis for Processing',
    body: `We process your personal information on the following bases:\n\n• Contractual necessity: to provide the services you have agreed to use\n• Legitimate interests: to improve the platform and prevent fraud\n• Legal obligation: to comply with POPIA, SARS requirements, and municipal regulations\n• Consent: for optional features such as location sharing and marketing communications`,
  },
  {
    title: '5. Sharing Your Information',
    body: `We may share your personal information with:\n\n• Verified NPO partners when you create a donation listing (limited to listing details)\n• Our verified logistics partners for coordinating pickups\n• FreshLoop administrators for verification and compliance purposes\n• SARS, the Department of Social Development, or other regulators when legally required\n• Technology service providers who help us operate the platform (under strict data processing agreements)\n\nWe do not sell your personal information to third parties.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain your personal information for as long as your account is active or as required by law. Specifically:\n\n• Account data: retained for 5 years after account closure\n• Donation records: retained for 7 years for SARS compliance\n• Device logs: retained for 90 days\n• Anonymised analytics: retained indefinitely\n\nYou may request deletion of your account data at any time, subject to our legal retention obligations.`,
  },
  {
    title: '7. Your Rights Under POPIA',
    body: `You have the right to:\n\n• Access the personal information we hold about you\n• Request correction of inaccurate information\n• Request deletion of your personal information (subject to legal requirements)\n• Object to processing of your personal information\n• Lodge a complaint with the Information Regulator of South Africa\n• Withdraw consent for optional processing at any time\n\nTo exercise any of these rights, contact our Information Officer at privacy@freshloop.app.`,
  },
  {
    title: '8. Security',
    body: `We implement appropriate technical and organisational measures to protect your personal information, including:\n\n• Encryption in transit (TLS 1.3) and at rest (AES-256)\n• Two-factor authentication for business and NPO accounts\n• Regular security assessments and penetration testing\n• Access controls limiting data access to authorised personnel\n• Incident response procedures compliant with POPIA notification requirements`,
  },
  {
    title: '9. Cookies and Tracking',
    body: `The FreshLoop mobile application does not use browser cookies. We use device-local storage for authentication tokens and user preferences. Anonymised crash and performance data may be collected through our analytics provider, which operates under a data processing agreement with us.`,
  },
  {
    title: '10. Children',
    body: `FreshLoop is not intended for use by persons under the age of 18. We do not knowingly collect personal information from minors. If you believe we have collected information from a minor, please contact us immediately at privacy@freshloop.app.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes through the application and by email. The date at the top of this document will always reflect the most recent version. Continued use of FreshLoop after a policy update constitutes acceptance of the revised terms.`,
  },
  {
    title: '12. Contact Us',
    body: `FreshLoop Information Officer\nEmail: privacy@freshloop.app\nPhone: +27 31 000 0000\nAddress: 12 Salmon Grove Road, Durban, 4001, South Africa\n\nFor complaints, you may also contact the Information Regulator:\nWebsite: www.justice.gov.za/inforeg\nEmail: inforeg@justice.gov.za`,
  },
];

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By registering for and using FreshLoop, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using the platform. If you do not agree with any part of these Terms, you must not use FreshLoop.\n\nThese Terms constitute a legally binding agreement between you and FreshLoop (Pty) Ltd, a company registered in the Republic of South Africa.`,
  },
  {
    title: '2. Eligibility',
    body: `To use FreshLoop as a Business or NPO user, you must:\n\n• Be at least 18 years of age\n• Represent a validly registered business (with a trading licence) or a registered NPO (with DSD certification)\n• Provide accurate and up-to-date registration documents\n• Not have been previously banned from the FreshLoop platform\n\nHome users must be at least 18 years old. FreshLoop reserves the right to verify eligibility at any time.`,
  },
  {
    title: '3. Account Registration',
    body: `You are responsible for:\n\n• Providing accurate, current, and complete information during registration\n• Maintaining the security of your password and account\n• All activities that occur under your account\n• Immediately notifying FreshLoop of any unauthorised use of your account at support@freshloop.app\n\nFreshLoop reserves the right to refuse registration or suspend accounts that violate these Terms.`,
  },
  {
    title: '4. Acceptable Use',
    body: `You agree not to use FreshLoop to:\n\n• Post false, misleading, or fraudulent listings\n• List food that is expired, unsafe, or unfit for human consumption\n• Harass, threaten, or discriminate against other users\n• Attempt to gain unauthorised access to the platform or other users' data\n• Use the platform for commercial purposes beyond legitimate food redistribution\n• Misrepresent the quantity, quality, or condition of donated food\n• Circumvent the platform's verification or matching system\n\nViolations may result in immediate account suspension or termination.`,
  },
  {
    title: '5. Food Safety Responsibility',
    body: `Users listing food donations ("Donors") are solely responsible for:\n\n• Ensuring donated food is safe, wholesome, and legally fit for redistribution\n• Accurately describing food types, quantities, allergens, and storage requirements\n• Adhering to all applicable food safety regulations, including the Foodstuffs, Cosmetics and Disinfectants Act\n• Maintaining appropriate storage conditions until collection\n\nFreshLoop does not inspect food donations and is not responsible for food safety issues arising from donated items. Donors indemnify FreshLoop against all claims arising from unsafe donations.`,
  },
  {
    title: '6. NPO and Coordinator Responsibilities',
    body: `NPO users and their registered coordinators agree to:\n\n• Only collect food for legitimate non-profit distribution purposes\n• Ensure proper food-safe transportation and handling\n• Accurately record quantities received in the distribution ledger\n• Not resell donated food or use it for commercial gain\n• Maintain all required food handling certifications\n\nFreshLoop reserves the right to audit NPO records and revoke platform access for non-compliance.`,
  },
  {
    title: '7. Intellectual Property',
    body: `All content on the FreshLoop platform, including but not limited to the application, its design, graphics, text, and algorithms, is the exclusive property of FreshLoop (Pty) Ltd and is protected by South African copyright law.\n\nYou retain ownership of content you submit (e.g., food listing details, documents), but grant FreshLoop a non-exclusive, royalty-free licence to use that content to operate the platform.`,
  },
  {
    title: '8. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law:\n\n• FreshLoop provides the platform on an "as-is" basis without warranties of any kind\n• FreshLoop is not liable for any indirect, incidental, or consequential damages arising from your use of the platform\n• FreshLoop's total liability shall not exceed the subscription fees paid by you in the 3 months preceding the claim\n• FreshLoop is not responsible for the acts or omissions of third-party logistics providers or NPO partners`,
  },
  {
    title: '9. Indemnification',
    body: `You agree to indemnify and hold harmless FreshLoop (Pty) Ltd, its directors, officers, employees, and agents from any claims, losses, damages, or expenses (including legal fees) arising from:\n\n• Your breach of these Terms\n• Your use of the platform in violation of applicable law\n• Any food safety claims arising from your donations\n• Your violation of any third party's rights`,
  },
  {
    title: '10. Termination',
    body: `FreshLoop may suspend or terminate your account at any time if you:\n\n• Breach these Terms\n• Provide false registration information\n• Engage in fraudulent or unlawful activity\n• Fail a re-verification check\n\nYou may close your account at any time by contacting support@freshloop.app. Upon termination, your access to the platform will cease, but FreshLoop retains the right to retain records as required by law.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms are governed by the laws of the Republic of South Africa. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of KwaZulu-Natal, South Africa.\n\nWe encourage you to first attempt to resolve any dispute informally by contacting us at legal@freshloop.app.`,
  },
  {
    title: '12. Changes to Terms',
    body: `FreshLoop reserves the right to modify these Terms at any time. We will provide at least 14 days' notice of material changes through the application and by email. Continued use of the platform after the effective date of changes constitutes your acceptance of the revised Terms.\n\nIf you do not agree to the updated Terms, you must close your account before the effective date.`,
  },
  {
    title: '13. Contact',
    body: `For any questions about these Terms, contact:\n\nFreshLoop Legal Team\nEmail: legal@freshloop.app\nPhone: +27 31 000 0000\nAddress: 12 Salmon Grove Road, Durban, 4001, South Africa`,
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface LegalDocumentModalProps {
  visible: boolean;
  type: 'privacy' | 'terms';
  accentColor?: string;
  onClose: () => void;
  onAgree?: () => void;
  requireScroll?: boolean;
}

export default function LegalDocumentModal({
  visible,
  type,
  accentColor = '#2D6A4F',
  onClose,
  onAgree,
  requireScroll = true,
}: LegalDocumentModalProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sections = type === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const title    = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const updated  = 'Last updated: 2 May 2026';

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 80) setHasScrolledToEnd(true);
  };

  const canProceed = !requireScroll || hasScrolledToEnd;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1C3A2E' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
        }}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ marginRight: 14 }}>
            <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>{updated}</Text>
          </View>
          <View style={{
            backgroundColor: accentColor, borderRadius: 8,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>FreshLoop</Text>
          </View>
        </View>

        {/* Scroll hint */}
        {requireScroll && !hasScrolledToEnd && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: 'rgba(251,191,36,0.15)',
            paddingHorizontal: 16, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: 'rgba(251,191,36,0.2)',
          }}>
            <Feather name="arrow-down" size={13} color="#FBBF24" />
            <Text style={{ color: '#FBBF24', fontSize: 12, fontWeight: '600', flex: 1 }}>
              Please read and scroll to the end to continue
            </Text>
          </View>
        )}
        {requireScroll && hasScrolledToEnd && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: 'rgba(74,222,128,0.12)',
            paddingHorizontal: 16, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: 'rgba(74,222,128,0.2)',
          }}>
            <Feather name="check-circle" size={13} color="#4ADE80" />
            <Text style={{ color: '#4ADE80', fontSize: 12, fontWeight: '600' }}>
              You have read the full document
            </Text>
          </View>
        )}

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 24 }}>{updated}</Text>

          {sections.map((sec, i) => (
            <View key={i} style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 14, fontWeight: '800', color: '#1E293B',
                marginBottom: 8, lineHeight: 20,
              }}>
                {sec.title}
              </Text>
              <Text style={{
                fontSize: 13, color: '#475569', lineHeight: 22,
              }}>
                {sec.body}
              </Text>
              {i < sections.length - 1 && (
                <View style={{ height: 1, backgroundColor: '#E2E8F0', marginTop: 24 }} />
              )}
            </View>
          ))}

          {/* Bottom CTA */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 20,
            padding: 20, marginTop: 8,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
          }}>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16, textAlign: 'center' }}>
              By tapping the button below, you confirm you have read and understood this {title}.
            </Text>
            {onAgree && (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!canProceed}
                onPress={() => { onAgree(); onClose(); }}
                style={{
                  backgroundColor: canProceed ? accentColor : '#CBD5E1',
                  borderRadius: 14, paddingVertical: 15, alignItems: 'center',
                  shadowColor: accentColor,
                  shadowOpacity: canProceed ? 0.3 : 0,
                  shadowRadius: 10, elevation: canProceed ? 4 : 0,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                  {canProceed ? `I agree to the ${title}` : 'Scroll to the end to continue ↓'}
                </Text>
              </TouchableOpacity>
            )}
            {!onAgree && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={{
                  backgroundColor: accentColor, borderRadius: 14,
                  paddingVertical: 15, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
