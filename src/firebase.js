import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Oulet Caricuao Config provided by user
const firebaseConfig = {
  apiKey: "AIzaSyC-MVrv5vQw7VRQsxhPg4PhPRvFaLoYdqs",
  authDomain: "ouletcaricuao.firebaseapp.com",
  projectId: "ouletcaricuao",
  storageBucket: "ouletcaricuao.firebasestorage.app",
  messagingSenderId: "825852271405",
  appId: "1:825852271405:web:3c001da7d493bdaa9511a4",
  measurementId: "G-Y1RKPVQDPH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
