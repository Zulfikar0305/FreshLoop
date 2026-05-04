// navigation/RootNavigator.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthSession } from '../services/authService';
import { SignOutContext, useSignOut } from '../context/SignOutContext';
import HomeUserNavigator     from './HomeUserNavigator';
import BusinessUserNavigator from './BusinessUserNavigator';
import NPOUserNavigator      from './NPOUserNavigator';
import AdminUserNavigator    from './AdminUserNavigator';
import LandingScreen         from '../screens/auth/LandingScreen';
import GeneralUserLogin      from '../screens/auth/GeneralUserLogin';
import BusinessLogin         from '../screens/auth/BusinessLogin';
import NPOLogin              from '../screens/auth/NPOLogin';
import AdminLogin            from '../screens/auth/AdminLogin';
import OnboardSecurity       from '../screens/auth/OnboardSecurity';
import OnboardBotCheck       from '../screens/auth/OnboardBotCheck';
import OnboardTwoFA          from '../screens/auth/OnboardTwoFA';
import OnboardDocUpload      from '../screens/auth/OnboardDocUpload';
import NewDeviceVerification from '../screens/auth/NewDeviceVerification';

type RootScreen =
  | 'landing'
  | 'generalLogin'
  | 'businessLogin'
  | 'npoLogin'
  | 'adminLogin'
  | 'onboardSecurity'
  | 'onboardBotCheck'
  | 'onboardTwoFA'
  | 'onboardDocUpload'
  | 'newDeviceVerification'
  | 'homeUser'
  | 'business'
  | 'npo'
  | 'admin';

export { useSignOut };

export default function RootNavigator() {
  const { session, isLoading, setSession, signOut } = useAuth();
  const [screen,        setScreen]        = useState<RootScreen>('landing');
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingRole,   setPendingRole]   = useState<'home' | 'business' | 'npo'>('home');
  const [pendingEmail,  setPendingEmail]  = useState('');

  useEffect(() => {
    if (!isLoading && session) {
      if      (session.role === 'home')     setScreen('homeUser');
      else if (session.role === 'business') setScreen('business');
      else if (session.role === 'npo')      setScreen('npo');
      else if (session.role === 'admin')    setScreen('admin');
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C3A2E' }}>
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  const handleSignOut = () => {
    signOut();
    setScreen('landing');
  };

  // Registration flow: steps 2–4 (home) or 2–5 (business/npo)
  const startOnboarding = (s: AuthSession) => {
    setSession(s);
    setPendingUserId(s.userId);
    setPendingRole(s.role as 'home' | 'business' | 'npo');
    setPendingEmail(s.email);
    setScreen('onboardSecurity');
  };

  // Sign-in flow for business/npo: always verify new device
  const startSignIn = (s: AuthSession, role: 'business' | 'npo') => {
    setSession(s);
    setPendingRole(role);
    setPendingEmail(s.email);
    setScreen('newDeviceVerification');
  };

  const roleDestination = (role: 'home' | 'business' | 'npo'): RootScreen => {
    if (role === 'business') return 'business';
    if (role === 'npo')      return 'npo';
    return 'homeUser';
  };

  // After 2FA: home goes to dashboard, business/npo go to doc upload
  const afterTwoFA = (): RootScreen =>
    (pendingRole === 'business' || pendingRole === 'npo') ? 'onboardDocUpload' : 'homeUser';

  // ── Auth screens ────────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return (
      <LandingScreen
        onContinue={(role: string) => {
          if (role === 'home')     setScreen('generalLogin');
          if (role === 'business') setScreen('businessLogin');
          if (role === 'npo')      setScreen('npoLogin');
          if (role === 'admin')    setScreen('adminLogin');
        }}
      />
    );
  }

  if (screen === 'adminLogin') {
    return (
      <AdminLogin
        onBack={() => setScreen('landing')}
        onSignIn={(s: AuthSession) => { setSession(s); setScreen('admin'); }}
      />
    );
  }

  if (screen === 'generalLogin') {
    return (
      <GeneralUserLogin
        onBack={() => setScreen('landing')}
        onSignIn={(s: AuthSession) => { setSession(s); setScreen('homeUser'); }}
        onRegister={startOnboarding}
      />
    );
  }

  if (screen === 'businessLogin') {
    return (
      <BusinessLogin
        onBack={() => setScreen('landing')}
        onSignIn={(s: AuthSession) => startSignIn(s, 'business')}
        onRegister={startOnboarding}
      />
    );
  }

  if (screen === 'npoLogin') {
    return (
      <NPOLogin
        onBack={() => setScreen('landing')}
        onSignIn={(s: AuthSession) => startSignIn(s, 'npo')}
        onRegister={startOnboarding}
      />
    );
  }

  // ── Onboarding flow ─────────────────────────────────────────────────────────

  if (screen === 'onboardSecurity') {
    return (
      <OnboardSecurity
        userId={pendingUserId}
        role={pendingRole}
        onContinue={() => setScreen('onboardBotCheck')}
        onSkip={() => setScreen('onboardBotCheck')}
      />
    );
  }

  if (screen === 'onboardBotCheck') {
    return (
      <OnboardBotCheck
        role={pendingRole}
        onContinue={() => setScreen('onboardTwoFA')}
      />
    );
  }

  if (screen === 'onboardTwoFA') {
    return (
      <OnboardTwoFA
        role={pendingRole}
        email={pendingEmail}
        onContinue={() => setScreen(afterTwoFA())}
        onSkip={() => setScreen(afterTwoFA())}
      />
    );
  }

  if (screen === 'onboardDocUpload') {
    return (
      <OnboardDocUpload
        role={pendingRole as 'business' | 'npo'}
        onContinue={() => setScreen(roleDestination(pendingRole))}
      />
    );
  }

  // ── Sign-in 2FA for new devices (business / npo) ────────────────────────────

  if (screen === 'newDeviceVerification') {
    return (
      <NewDeviceVerification
        email={pendingEmail}
        onContinue={() => setScreen(roleDestination(pendingRole))}
        onBack={() => {
          signOut();
          setPendingEmail('');
          if (pendingRole === 'business') setScreen('businessLogin');
          else if (pendingRole === 'npo') setScreen('npoLogin');
          else setScreen('landing');
        }}
      />
    );
  }

  // ── Authenticated navigators ────────────────────────────────────────────────

  return (
    <SignOutContext.Provider value={handleSignOut}>
      <NavigationContainer>
        {screen === 'homeUser' && <HomeUserNavigator />}
        {screen === 'business' && <BusinessUserNavigator />}
        {screen === 'npo'      && <NPOUserNavigator />}
        {screen === 'admin'    && <AdminUserNavigator />}
      </NavigationContainer>
    </SignOutContext.Provider>
  );
}
