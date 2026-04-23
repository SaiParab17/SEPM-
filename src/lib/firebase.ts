import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1VVcDhri-5hBTAPuJ91LtbNfpu7ttSF8",
  authDomain: "documind-insight.firebaseapp.com",
  projectId: "documind-insight",
  storageBucket: "documind-insight.firebasestorage.app",
  messagingSenderId: "633913460261",
  appId: "1:633913460261:web:45f62e0b911105d83b61cc",
  measurementId: "G-L3JGBXWWXL",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
