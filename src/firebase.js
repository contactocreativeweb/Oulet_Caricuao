import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Oulet Caricuao Config provided by user
const firebaseConfig = {
  apiKey: "AIzaSyB2ivERBWLo5idzVfFXzs9S_rPmDGWY8Bs",
  authDomain: "oulet-caricuao.web.app",
  projectId: "ouletcaricuao-867f1",
  storageBucket: "ouletcaricuao-867f1.firebasestorage.app",
  messagingSenderId: "412590304969",
  appId: "1:412590304969:web:e1be5aa43ce9945b342718",
  measurementId: "G-N0CC6YVGE8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
