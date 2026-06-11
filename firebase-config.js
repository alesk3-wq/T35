// ============================================
// FIREBASE CONFIG - Versão 12.14.0
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBTjlhzAhLDVxlzxIIlUSpwDNI9L9MffO0",
    authDomain: "team35-academy.firebaseapp.com",
    projectId: "team35-academy",
    storageBucket: "team35-academy.firebasestorage.app",
    messagingSenderId: "1050613869311",
    appId: "1:1050613869311:web:f5af9662ef10daacabfaca",
    measurementId: "G-4E6DBJ890P"
  };

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Auth com persistência local
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error('Erro ao configurar persistência:', err);
});

// Inicializa Firestore
export const db = getFirestore(app);

// Inicializa Storage
export const storage = getStorage(app);

console.log('✅ Firebase inicializado com sucesso');

export { app };