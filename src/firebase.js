
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA1pHJnHb7-Q-3JStC6mTvqkZXeOl3_9t4",
  authDomain: "certverify-94a64.firebaseapp.com",
  projectId: "certverify-94a64",
  storageBucket: "certverify-94a64.firebasestorage.app",
  messagingSenderId: "1092872206598",
  appId: "1:1092872206598:web:d5bd70cde7db2ad1c10687"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
