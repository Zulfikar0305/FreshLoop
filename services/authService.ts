// services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const SESSION_KEY        = 'freshloop_session';
const BIOMETRIC_FLAG_KEY = 'freshloop_biometrics_enabled';

export type UserRole = 'home' | 'business' | 'npo' | 'admin';
export type AccountStatus = 'active' | 'pending';

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  status: AccountStatus;
  biometricEnabled: boolean;
  phone?: string;
  bizType?: string;
  regNumber?: string;
  city?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  session?: AuthSession;
}

// ── Session helpers ───────────────────────────────────────────────────────────

export async function getSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function persistSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  try { await firebaseSignOut(auth); } catch {}
}

/** Merge a partial update into the persisted session (e.g. city, name). */
export async function patchSession(patch: Partial<AuthSession>): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return;
  const current = JSON.parse(raw) as AuthSession;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...patch }));
}

export async function setBiometricFlag(value: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_FLAG_KEY, value ? 'true' : 'false');
}

export async function getBiometricFlag(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(BIOMETRIC_FLAG_KEY);
  return raw === 'true';
}

// ── Profile helpers ───────────────────────────────────────────────────────────

async function saveUserProfile(uid: string, data: Record<string, any>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() });
}

async function getUserProfile(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerHomeUser(data: {
  fullName: string;
  email: string;
  password: string;
  confirmPass: string;
}): Promise<AuthResult> {
  const { fullName, email, password, confirmPass } = data;

  if (!fullName.trim()) return { success: false, error: 'Please enter your full name.' };
  if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
  if (password !== confirmPass) return { success: false, error: 'Passwords do not match.' };

  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;

    await saveUserProfile(uid, {
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: 'home',
      status: 'active',
      biometricEnabled: false,
    });

    const session: AuthSession = {
      userId: uid,
      email: email.trim().toLowerCase(),
      role: 'home',
      name: fullName.trim(),
      status: 'active',
      biometricEnabled: false,
    };
    await persistSession(session);
    return { success: true, session };
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') return { success: false, error: 'An account with this email already exists.' };
    if (e.code === 'auth/invalid-email') return { success: false, error: 'Please enter a valid email address.' };
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

export async function registerBusiness(data: {
  bizName: string;
  bizType: string;
  email: string;
  phone: string;
  vatNumber: string;
  password: string;
  confirmPass: string;
}): Promise<AuthResult> {
  if (!data.bizName.trim()) return { success: false, error: 'Please enter your business name.' };
  if (!data.bizType) return { success: false, error: 'Please select a business type.' };
  if (!data.phone.trim()) return { success: false, error: 'Please enter a contact number.' };
  if (data.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
  if (data.password !== data.confirmPass) return { success: false, error: 'Passwords do not match.' };

  try {
    const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const uid = cred.user.uid;

    await saveUserProfile(uid, {
      name: data.bizName.trim(),
      bizName: data.bizName.trim(),
      bizType: data.bizType,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      vatNumber: data.vatNumber.trim(),
      role: 'business',
      status: 'pending',
      biometricEnabled: false,
    });

    const session: AuthSession = {
      userId: uid,
      email: data.email.trim().toLowerCase(),
      role: 'business',
      name: data.bizName.trim(),
      status: 'pending',
      biometricEnabled: false,
      bizType: data.bizType,
      phone: data.phone.trim(),
    };
    await persistSession(session);
    return { success: true, session };
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') return { success: false, error: 'An account with this email already exists.' };
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

export async function registerNPO(data: {
  orgName: string;
  regNumber: string;
  email: string;
  phone: string;
  password: string;
  confirmPass: string;
}): Promise<AuthResult> {
  if (!data.orgName.trim()) return { success: false, error: 'Please enter your organisation name.' };
  if (!data.regNumber.trim()) return { success: false, error: 'Please enter the NPO registration number.' };
  if (!data.phone.trim()) return { success: false, error: 'Please enter a contact number.' };
  if (data.password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
  if (data.password !== data.confirmPass) return { success: false, error: 'Passwords do not match.' };

  try {
    const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const uid = cred.user.uid;

    await saveUserProfile(uid, {
      name: data.orgName.trim(),
      orgName: data.orgName.trim(),
      regNumber: data.regNumber.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      role: 'npo',
      status: 'pending',
      biometricEnabled: false,
    });

    const session: AuthSession = {
      userId: uid,
      email: data.email.trim().toLowerCase(),
      role: 'npo',
      name: data.orgName.trim(),
      status: 'pending',
      biometricEnabled: false,
      regNumber: data.regNumber.trim(),
      phone: data.phone.trim(),
    };
    await persistSession(session);
    return { success: true, session };
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') return { success: false, error: 'An account with this email already exists.' };
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

// ── Sign in ───────────────────────────────────────────────────────────────────

export async function signInUser(
  email: string,
  password: string,
  role: UserRole,
): Promise<AuthResult> {
  if (!email.trim()) return { success: false, error: 'Please enter your email address.' };
  if (!password) return { success: false, error: 'Please enter your password.' };

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;
    const profile = await getUserProfile(uid);

    if (!profile) return { success: false, error: 'Account profile not found. Please re-register.' };
    // 'coordinator' is an accepted alias for the 'npo' role (legacy Firestore accounts)
    const normalizedRole: UserRole = profile.role === 'coordinator' ? 'npo' : profile.role as UserRole;
    if (normalizedRole !== role) return { success: false, error: `This account is registered as a ${profile.role}, not ${role}.` };

    const session: AuthSession = {
      userId: uid,
      email: profile.email,
      role: normalizedRole,
      name: profile.name,
      status: profile.status ?? 'active',
      biometricEnabled: profile.biometricEnabled ?? false,
      phone: profile.phone,
      bizType: profile.bizType,
      regNumber: profile.regNumber,
    };
    await persistSession(session);
    return { success: true, session };
  } catch (e: any) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      return { success: false, error: 'Incorrect email or password.' };
    }
    if (e.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Please wait a moment and try again.' };
    }
    return { success: false, error: 'Sign in failed. Please try again.' };
  }
}

// ── Biometrics (unchanged — already uses expo-local-authentication) ────────────

export async function enableBiometric(
  userId: string,
  promptMessage = 'Confirm your identity to enable biometrics',
): Promise<AuthResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return { success: false, error: 'This device does not support biometric authentication.' };

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return { success: false, error: 'No biometrics enrolled. Please set up fingerprint or Face ID in your device settings.' };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  if (!result.success) return { success: false, error: 'Biometric verification cancelled or failed.' };

  // Update Firestore
  try {
    await setDoc(doc(db, 'users', userId), { biometricEnabled: true }, { merge: true });
  } catch {}

  // Persist the device-local flag so login screens can show the biometric button
  await setBiometricFlag(true);

  // Update local session
  const session = await getSession();
  if (session && session.userId === userId) {
    session.biometricEnabled = true;
    await persistSession(session);
  }

  return { success: true };
}

export async function biometricSignIn(role: UserRole): Promise<AuthResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) return { success: false, error: 'Biometrics not available on this device.' };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to FreshLoop',
    cancelLabel: 'Cancel',
  });
  if (!result.success) return { success: false, error: 'Biometric authentication failed or was cancelled.' };

  // Fall back to cached session for biometric sign-in
  const session = await getSession();
  if (!session || session.role !== role) {
    return { success: false, error: 'No account with biometrics set up. Please sign in with email and password first.' };
  }
  return { success: true, session };
}

/** Hardware + enrollment check (ported from backend authService). */
export async function checkBiometricSupport(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  return LocalAuthentication.isEnrolledAsync();
}

// ── Google Sign-In (Home users only) ─────────────────────────────────────────

/**
 * Sign in or register a Home user via Google OAuth.
 * Accepts the id_token returned by expo-auth-session's Google provider.
 * - If users/{uid} does not exist, creates it with role 'home'.
 * - If users/{uid} exists with a different role, returns an error.
 * - Persists the AuthSession to AsyncStorage.
 */
export async function googleSignInHome(idToken: string): Promise<AuthResult> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const uid = cred.user.uid;
    const email = (cred.user.email ?? '').toLowerCase();
    const displayName = cred.user.displayName ?? 'FreshLoop User';

    let profile = await getUserProfile(uid);

    if (!profile) {
      // New user — create Firestore document with role 'home'
      await saveUserProfile(uid, {
        name: displayName,
        email,
        role: 'home',
        status: 'active',
        biometricEnabled: false,
      });
      profile = { name: displayName, email, role: 'home', status: 'active', biometricEnabled: false };
    } else if (profile.role !== 'home') {
      // Account exists but belongs to a different role — reject
      return {
        success: false,
        error: 'This Google account is registered under a different user type. Please use the correct login screen.',
      };
    }

    const session: AuthSession = {
      userId: uid,
      email,
      role: 'home',
      name: profile.name ?? displayName,
      status: profile.status ?? 'active',
      biometricEnabled: profile.biometricEnabled ?? false,
    };
    await persistSession(session);
    return { success: true, session };
  } catch (e: any) {
    return { success: false, error: 'Google sign-in failed. Please try again.' };
  }
}

/**
 * Full visibility check for login screens:
 * hardware present + enrolled + user has previously enabled biometrics.
 * Backward-compatible: also trusts session.biometricEnabled for existing users.
 */
export async function checkBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return false;
  const flagSet = await getBiometricFlag();
  if (flagSet) return true;
  const session = await getSession();
  return session?.biometricEnabled === true;
}

/** Prompt-only biometric gate (ported from backend authService). */
export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  return result.success;
}