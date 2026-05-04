/// <reference types="nativewind/types" />

// export {} makes this a module file so the declare module below AUGMENTS
// @firebase/auth rather than replacing it entirely.
export {};

// @firebase/auth ships getReactNativePersistence in its react-native bundle
// (dist/rn/index.js) but its package.json "types" key points to browser types
// that omit this export. This augmentation adds the missing declaration so
// services/firebaseConfig.ts can import it without TypeScript errors.
declare module '@firebase/auth' {
  import type { Persistence } from 'firebase/auth';
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
