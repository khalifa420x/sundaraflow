// lib/firebase.ts

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXsRvX5a39FFGiVqy3KWrmZGQOQH-QBR4",
  authDomain: "sundaraflow.firebaseapp.com",
  projectId: "sundaraflow",
  storageBucket: "sundaraflow.firebasestorage.app",
  messagingSenderId: "297501694014",
  appId: "1:297501694014:web:7090bb554547056144d96f"
};

// éviter double init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);