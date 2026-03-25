import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA7Ls8SMnwHGid24kv51ei7uytg4KoNQHo",
  authDomain: "study-house-ea031.firebaseapp.com",
  projectId: "study-house-ea031",
  storageBucket: "study-house-ea031.firebasestorage.app",
  messagingSenderId: "240943562850",
  appId: "1:240943562850:web:efdebf86273d054bb4513b",
  measurementId: "G-2EY6QK1T6T"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);