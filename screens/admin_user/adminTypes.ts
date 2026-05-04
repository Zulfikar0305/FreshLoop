// screens/admin_user/adminTypes.ts
// Shared types, colours, mock data, and helper functions for all admin screens.

export type AccountType = 'business' | 'coordinator';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type TicketCategory = 'user' | 'listing' | 'system';
export type StrikeLevel = 1 | 2 | 3;

export interface PendingAccount {
  id: string; accountType: AccountType; displayName: string;
  email: string; submittedAt: string; documentLabel: string;
  documentThumbnailUri: string; documentFullUri: string;
  status: VerificationStatus; strikeCount: number;
}
export interface VerifiedAccount {
  id: string; accountType: AccountType; displayName: string;
  email: string; strikeCount: number; status: 'active' | 'suspended' | 'banned';
  strikeReasons?: string[];
}
export interface AppealRequest {
  id: string; displayName: string; email: string;
  reason: string; submittedAt: string; accountType: AccountType;
}
export interface DisputeTicket {
  id: string; category: TicketCategory; submittedBy: string;
  counterparty?: string; timestamp: string; description: string;
  hasPhoto: boolean; resolved: boolean;
}
export interface AuditEntry {
  id: string; adminName: string; action: string; timestamp: string;
}
export interface AdminAccount {
  id: string; fullName: string; email: string; lastActive: string;
}
export interface AITip {
  id: string; tip: string; active: boolean; flagged: boolean;
}
export interface BroadcastHistory {
  id: string; message: string; audience: string;
  sentAt: string; deliveryCount: number;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
export const C = {
  primary:       '#1C3A2E',
  primaryLight:  '#2D6A4F',
  surface:       '#ffffff',
  background:    '#E2EBE1',
  danger:        '#c62828',
  dangerLight:   '#ffebee',
  warning:       '#f57f17',
  warningLight:  '#fff8e1',
  info:          '#1565c0',
  infoLight:     '#e3f2fd',
  textPrimary:   '#1a1a1a',
  textSecondary: '#555555',
  textMuted:     '#888888',
  border:        '#E2E8F0',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
export function getBadge(type: AccountType) {
  return type === 'business'
    ? { label: 'Business',       color: '#e65100', bg: '#fff3e0' }
    : { label: 'NPO Coordinator', color: C.info,   bg: C.infoLight };
}
export function getCategoryColor(cat: TicketCategory) {
  if (cat === 'listing') return { label: 'Listing', color: C.warning, bg: C.warningLight };
  if (cat === 'user')    return { label: 'User',    color: C.danger,  bg: C.dangerLight  };
  return                        { label: 'System',  color: C.info,    bg: C.infoLight    };
}

// ── Mock data ──────────────────────────────────────────────────────────────────
export const MOCK_PENDING: PendingAccount[] = [
  { id: 'p1', accountType: 'business',    displayName: 'Sunrise Spar – Pinetown',   email: 'manager@sunrisespar.co.za',    submittedAt: '2026-04-25T09:14:00Z', documentLabel: 'Trading Licence',  documentThumbnailUri: 'https://placehold.co/120x90/e8f5e9/2e7d32?text=Licence', documentFullUri: 'https://placehold.co/800x600/e8f5e9/2e7d32?text=Trading+Licence',  status: 'pending', strikeCount: 0 },
  { id: 'p2', accountType: 'coordinator', displayName: 'Durban Food Bank NPO',       email: 'coord@durbanfoodbank.org.za',  submittedAt: '2026-04-25T11:02:00Z', documentLabel: 'NPO Certificate', documentThumbnailUri: 'https://placehold.co/120x90/e3f2fd/1565c0?text=NPO',    documentFullUri: 'https://placehold.co/800x600/e3f2fd/1565c0?text=NPO+Certificate', status: 'pending', strikeCount: 0 },
  { id: 'p3', accountType: 'business',    displayName: 'FreshMart Umhlanga',         email: 'ops@freshmart.co.za',          submittedAt: '2026-04-26T08:30:00Z', documentLabel: 'Trading Licence',  documentThumbnailUri: 'https://placehold.co/120x90/fff3e0/e65100?text=Licence', documentFullUri: 'https://placehold.co/800x600/fff3e0/e65100?text=Trading+Licence',  status: 'pending', strikeCount: 0 },
];
export const MOCK_VERIFIED: VerifiedAccount[] = [
  { id: 'v1', accountType: 'business',    displayName: 'Pick n Pay Westville',       email: 'mgr@pnpwestville.co.za',      strikeCount: 0, status: 'active'    },
  { id: 'v2', accountType: 'coordinator', displayName: 'Umlazi Community Kitchen',   email: 'hello@umlazikitchen.org',     strikeCount: 1, status: 'active',    strikeReasons: ['Coordinator did not show up for scheduled pickup'] },
  { id: 'v3', accountType: 'business',    displayName: 'Ocean Basket Pavilion',      email: 'ops@oceanbasket.co.za',       strikeCount: 2, status: 'suspended', strikeReasons: ['Donated bread was mouldy and not as described', 'Failed to respond to admin inquiry within 48 hours'] },
];
export const MOCK_APPEALS: AppealRequest[] = [
  { id: 'a1', displayName: 'Ocean Basket Pavilion', email: 'ops@oceanbasket.co.za', reason: 'The suspension was due to a misunderstanding with the coordinator. We have resolved the issue.', submittedAt: '2026-04-27T10:00:00Z', accountType: 'business' },
];
export const MOCK_TICKETS: DisputeTicket[] = [
  { id: 't1', category: 'listing', submittedBy: 'coord@durbanfoodbank.org.za', counterparty: 'ops@freshmart.co.za',     timestamp: '2026-04-27T08:00:00Z', description: 'The donated bread was mouldy and not as described.',             hasPhoto: true,  resolved: false },
  { id: 't2', category: 'user',    submittedBy: 'manager@sunrisespar.co.za',   counterparty: 'hello@umlazikitchen.org', timestamp: '2026-04-26T14:30:00Z', description: 'Coordinator did not show up for pickup twice in a row.',         hasPhoto: false, resolved: false },
  { id: 't3', category: 'system',  submittedBy: 'user@home.co.za',             timestamp:                              '2026-04-26T09:00:00Z', description: 'The QR scanner crashes on Samsung Galaxy A32.', hasPhoto: false, resolved: false },
];
export const MOCK_AUDIT: AuditEntry[] = [
  { id: 'au1', adminName: 'Admin Zinhle', action: 'Approved Business: Sunrise Spar',         timestamp: '2026-04-25T10:00:00Z' },
  { id: 'au2', adminName: 'Admin Zinhle', action: 'Rejected Coordinator: Bad NPO Cert',       timestamp: '2026-04-25T11:30:00Z' },
  { id: 'au3', adminName: 'Admin Thabo',  action: 'Issued Strike 1 to: Ocean Basket',         timestamp: '2026-04-24T15:00:00Z' },
  { id: 'au4', adminName: 'Admin Thabo',  action: 'Sent broadcast to all Home Users',         timestamp: '2026-04-23T09:00:00Z' },
];
export const MOCK_ADMINS: AdminAccount[] = [
  { id: 'ad1', fullName: 'Admin Zinhle', email: 'zinhle@freshloop.co.za', lastActive: '2026-04-27T08:00:00Z' },
  { id: 'ad2', fullName: 'Admin Thabo',  email: 'thabo@freshloop.co.za',  lastActive: '2026-04-26T16:00:00Z' },
];
export const MOCK_TIPS: AITip[] = [
  { id: 'tip1', tip: 'Your spinach expires tomorrow. Tap to see a 15-min recipe.',                active: true,  flagged: false },
  { id: 'tip2', tip: 'You have 3 items expiring this week. Plan meals now to save R120.',         active: true,  flagged: true  },
  { id: 'tip3', tip: 'Consider buying frozen vegetables — they last 3 months longer.',             active: false, flagged: false },
];
export const MOCK_BROADCASTS: BroadcastHistory[] = [
  { id: 'b1', message: 'FreshLoop is now available in Cape Town!', audience: 'All Users',   sentAt: '2026-04-23T09:00:00Z', deliveryCount: 1652 },
  { id: 'b2', message: 'New recipe feature launched — try it now!', audience: 'Home Users', sentAt: '2026-04-20T10:00:00Z', deliveryCount: 1200 },
];
