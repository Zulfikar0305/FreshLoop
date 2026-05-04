// services/firebaseConfig.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// getReactNativePersistence must be imported from @firebase/auth (not firebase/auth)
// because only the @firebase/auth package.json has a "react-native" export condition
// that TypeScript resolves to the RN-specific types which include this function.
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: 'AIzaSyBI9dRHuq3UgO-6GrdD2m9S0FIMfpy-P6U',
  authDomain: 'freshloop-c0549.firebaseapp.com',
  projectId: 'freshloop-c0549',
  storageBucket: 'freshloop-c0549.firebasestorage.app',
  messagingSenderId: '538096064336',
  appId: '1:538096064336:web:a1a4d92aebd97b1103be55',
};

const app = initializeApp(firebaseConfig);

// initializeAuth throws on hot-reload if called a second time on the same app
// instance. Fall back to getAuth() which returns the already-initialised auth.
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);