// ============================================
// FIREBASE AUTHENTICATION
// ============================================

import { auth, db } from '../../firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const googleProvider = new GoogleAuthProvider();

/**
 * Registra um novo usuário
 * @param {object} userData - Dados do usuário
 */
export async function handleRegister(userData) {
    const { email, password, fullName, cpf, phone, matricula, empresa, localAtuacao } = userData;

    try {
        // ✅ 1. Cria usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // ✅ 2. Envia email de verificação
        await sendEmailVerification(userCredential.user);

        // ✅ 3. Salva dados completos no Firestore
        await addDoc(collection(db, 'users'), {
            uid,
            fullName,
            email,
            cpf,           // Sem formatação (só números)
            phone,         // Sem formatação (só números)
            matricula: matricula || null,
            empresa,
            localAtuacao,
            role: 'candidato', // Role padrão
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'ativo'
        });

        console.log('✅ Usuário registrado com sucesso!');
        return { uid, message: 'Cadastro realizado com sucesso!' };

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        
        // Mensagens amigáveis
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('Este email já está cadastrado');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Senha muito fraca. Use pelo menos 6 caracteres');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Email inválido');
        } else {
            throw new Error(error.message || 'Erro ao criar conta');
        }
    }
}

/**
 * Faz login com email e senha
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 */
export async function handleLogin(email, password) {
    try {
        // ✅ 1. Faz login no Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // ✅ 2. Busca dados do usuário no Firestore
        const q = query(collection(db, 'users'), where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('Dados do usuário não encontrados');
        }

        const userData = querySnapshot.docs[0].data();
        const role = userData.role;

        console.log('✅ Login realizado com sucesso!', role);

        // ✅ 3. Redireciona conforme o role
        redirectByRole(role);

    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        if (error.code === 'auth/user-not-found') {
            throw new Error('Usuário não encontrado');
        } else if (error.code === 'auth/wrong-password') {
            throw new Error('Senha incorreta');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Email inválido');
        } else {
            throw new Error(error.message || 'Erro ao fazer login');
        }
    }
}

/**
 * Faz login com Google
 */
export async function handleGoogleLogin() {
    try {
        // ✅ 1. Faz login com Google
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const uid = user.uid;

        // ✅ 2. Verifica se usuário já existe no Firestore
        const q = query(collection(db, 'users'), where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // ⚠️ Primeiro login com Google - precisa completar perfil
            // Por enquanto, cria um usuário básico
            await addDoc(collection(db, 'users'), {
                uid,
                fullName: user.displayName || 'Usuário Google',
                email: user.email,
                cpf: null,
                phone: null,
                matricula: null,
                empresa: null,
                localAtuacao: null,
                role: 'candidato',
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'ativo',
                googleAuth: true
            });

            console.log('✅ Novo usuário Google criado!');
            // Redireciona para completar perfil
            window.location.href = 'candidato/perfil.html';
            return;
        }

        // ✅ 3. Usuário já existe - faz login normal
        const userData = querySnapshot.docs[0].data();
        const role = userData.role;

        console.log('✅ Login Google realizado com sucesso!', role);
        redirectByRole(role);

    } catch (error) {
        console.error('❌ Erro no Google Login:', error);
        throw new Error('Erro ao conectar com Google');
    }
}

/**
 * Redireciona o usuário conforme seu role
 * @param {string} role - Role do usuário (candidato, instrutor, admin)
 */
function redirectByRole(role) {
    const roleMap = {
        'candidato': 'candidato/dashboard.html',
        'instrutor': 'instrutor/dashboard.html',
        'admin': 'admin/dashboard.html'
    };

    const redirectUrl = roleMap[role] || 'candidato/dashboard.html';
    window.location.href = redirectUrl;
}

/**
 * Faz logout
 */
export async function handleLogout() {
    try {
        await signOut(auth);
        // Resolve corretamente a partir de qualquer subpasta (candidato/, instrutor/, admin/)
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        window.location.href = depth > 1 ? '../login.html' : 'login.html';
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        throw new Error('Erro ao fazer logout');
    }
}

/**
 * Verifica se usuário está logado
 */
export function checkAuth() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

console.log('✅ Auth carregado com sucesso!');