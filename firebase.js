import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { 
    getAuth, 
    sendEmailVerification, 
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs,
    getDoc,
    updateDoc,
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp,
    deleteDoc,
    doc,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDD82LWEkdEJb6VFGJH-xxTDSLxld3Rtkk",
    authDomain: "okasha-ahmed.firebaseapp.com",
    projectId: "okasha-ahmed",
    storageBucket: "okasha-ahmed.firebasestorage.app",
    messagingSenderId: "245362016744",
    appId: "1:245362016744:web:5abfcdaa103e21c1d5a45d",
    measurementId: "G-CNHVX40M14"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export { 
    sendEmailVerification, 
    sendPasswordResetEmail, 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp,
    deleteDoc,
    doc,
    where,
    limit
};