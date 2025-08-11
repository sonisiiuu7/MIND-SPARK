// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBz-cyURlxY9PwBnSIDR2IGOINPMKH6QIo",
  authDomain: "mind-spark-app-52521.firebaseapp.com",
  projectId: "mind-spark-app-52521",
  storageBucket: "mind-spark-app-52521.firebasestorage.app",
  messagingSenderId: "15957833039",
  appId: "1:15957833039:web:12ec8f4e6be323f026813a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Get the auth service
export const auth = getAuth(app);
