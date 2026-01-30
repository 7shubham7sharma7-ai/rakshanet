import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCRu443o3OXZwY3mR0PPd9XbexCj-4w3TU",
  authDomain: "rakshanet-9a0a5.firebaseapp.com",
  projectId: "rakshanet-9a0a5",
  storageBucket: "rakshanet-9a0a5.firebasestorage.app",
  messagingSenderId: "1076423396657",
  appId: "1:1076423396657:web:a6fcd752acfcce35603410",
  measurementId: "G-P2WFP52PQG"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (only in browser and if supported)
export const initAnalytics = async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
