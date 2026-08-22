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
    sendEmailVerification,
    deleteUser
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
    const { email, password, fullName, cpf, phone, matricula } = userData;

    // Empresa/Equipe/Atuação/Posto de Atuação não vêm mais do formulário de cadastro — são
    // preenchidos pelo gestor/admin em Funcionários Autorizados, e copiados de lá pro perfil
    // assim que o CPF bate com um registro da whitelist (mesmo se ainda não tiverem sido
    // preenchidos, ficam null e o gestor completa depois).
    let empresa = null, equipe = null, atuacao = null, postoAtuacao = null;
    try {
        const autDoc = await getDoc(doc(db, 'funcionariosAutorizados', cpf));
        if (autDoc.exists()) {
            const d = autDoc.data();
            empresa = d.empresa || null;
            equipe = d.equipe || null;
            atuacao = d.atuacao || null;
            postoAtuacao = d.postoAtuacao || null;
        }
    } catch (_) {}

    let userCredential;
    try {
        // ✅ 1. Cria usuário no Firebase Auth
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // ✅ 2. Salva dados completos no Firestore (a regra do Firestore valida o CPF
        // contra a lista de funcionários autorizados antes de aceitar a gravação)
        await addDoc(collection(db, 'users'), {
            uid,
            fullName,
            email,
            cpf,           // Sem formatação (só números)
            phone,         // Sem formatação (só números)
            matricula: matricula || null,
            empresa,
            equipe: equipe || null,
            atuacao: atuacao || null,
            postoAtuacao: postoAtuacao || null,
            role: 'candidato', // Role padrão
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'ativo'
        });

        // ✅ 3. Envia email de verificação (só depois de confirmar que o cadastro foi aceito)
        await sendEmailVerification(userCredential.user);

        console.log('✅ Usuário registrado com sucesso!');
        return { uid, message: 'Cadastro realizado com sucesso!' };

    } catch (error) {
        console.error('❌ Erro no registro:', error);

        // CPF não autorizado: a conta de Auth já foi criada, mas o doc em `users` foi
        // recusado pela regra do Firestore — desfaz a conta pra não deixar órfã.
        if (userCredential?.user && error.code === 'permission-denied') {
            await deleteUser(userCredential.user).catch(() => {});
            throw new Error('CPF não autorizado. Fale com o RH/administrador da sua empresa.');
        }

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

// ⚠️ DESATIVADA TEMPORARIAMENTE em 2026-08-12 a pedido do admin — treinamento no dia
// seguinte, cadastro liberado por hoje. Trocar pra `true` religa a trava de CPF autorizado
// (não esquecer — combinado pra reativar amanhã, junto com o firestore.rules).
const WHITELIST_CPF_ATIVA = false;

/**
 * Verifica se o candidato (perfil único, sem outros papéis) ainda está autorizado a
 * acessar o sistema — desloga e bloqueia se o CPF não estiver mais ativo na lista de
 * funcionários autorizados. Não afeta admin/instrutor/gestor.
 * @param {object} userData - Dados do usuário vindos do Firestore
 */
async function verificarAutorizacaoCpf(userData) {
    if (!WHITELIST_CPF_ATIVA) return;

    const perfis = Array.isArray(userData.perfis) ? userData.perfis : [userData.role];
    const somenteCandidato = perfis.length === 1 && perfis[0] === 'candidato';
    if (!somenteCandidato || !userData.cpf) return;

    const autDoc = await getDoc(doc(db, 'funcionariosAutorizados', userData.cpf));
    if (!autDoc.exists() || autDoc.data().ativo === false) {
        await signOut(auth);
        throw new Error('Seu acesso foi desativado. Entre em contato com o RH/administrador.');
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

        // ✅ 3. Bloqueia se o CPF não estiver mais autorizado (candidato puro só)
        await verificarAutorizacaoCpf(userData);

        console.log('✅ Login realizado com sucesso!');

        // ✅ 4. Redireciona conforme perfis disponíveis
        const perfis = userData.perfis;
        if (Array.isArray(perfis) && perfis.length > 1) {
            return { needsRoleSelection: true, perfis };
        }
        const destino = (Array.isArray(perfis) && perfis[0]) || userData.role;
        redirectByRole(destino);

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
                equipe: null,
                atuacao: null,
                postoAtuacao: null,
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

        // ✅ 3.1 Bloqueia se o CPF não estiver mais autorizado (candidato puro só)
        await verificarAutorizacaoCpf(userData);

        console.log('✅ Login Google realizado com sucesso!');

        const perfis = userData.perfis;
        if (Array.isArray(perfis) && perfis.length > 1) {
            return { needsRoleSelection: true, perfis };
        }
        const destino = (Array.isArray(perfis) && perfis[0]) || userData.role;
        redirectByRole(destino);

    } catch (error) {
        console.error('❌ Erro no Google Login:', error);
        // Erros nossos (ex.: bloqueio por CPF desativado) não têm `.code` — repassa a
        // mensagem original em vez de esconder atrás do genérico abaixo.
        if (!error.code) throw error;
        throw new Error('Erro ao conectar com Google');
    }
}

/**
 * Redireciona o usuário conforme seu role
 * @param {string} role - Role do usuário (candidato, instrutor, admin)
 */
export function redirectByRole(role) {
    const roleMap = {
        'candidato': 'candidato/dashboard.html',
        'instrutor': 'instrutor/dashboard.html',
        'admin': 'admin/dashboard.html',
        'gestor': 'gestor/dashboard.html'
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