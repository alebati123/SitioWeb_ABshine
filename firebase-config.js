import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0LCmYwiq_cShULcfPMNwUamYVyIFSLi4",
  authDomain: "sitioweb-abshine.firebaseapp.com",
  projectId: "sitioweb-abshine",
  storageBucket: "sitioweb-abshine.firebasestorage.app",
  messagingSenderId: "929750246048",
  appId: "1:929750246048:web:412aded008e259a6ab9fc5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged };