import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBI9dRHuq3UgO-6GrdD2m9S0FIMfpy-P6U",
  authDomain: "freshloop-c0549.firebaseapp.com",
  projectId: "freshloop-c0549",
  storageBucket: "freshloop-c0549.firebasestorage.app",
  messagingSenderId: "538096064336",
  appId: "1:538096064336:web:a1a4d92aebd97b1103be55"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);