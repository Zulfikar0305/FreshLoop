// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBI9dRHuq3UgO-6GrdD2m9S0FIMfpy-P6U",
  authDomain: "freshloop-c0549.firebaseapp.com",
  projectId: "freshloop-c0549",
  storageBucket: "freshloop-c0549.firebasestorage.app",
  messagingSenderId: "538096064336",
  appId: "1:538096064336:web:a1a4d92aebd97b1103be55"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export { auth, db, storage } from '../services/firebaseConfig';
