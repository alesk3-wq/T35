// ============================================
// REGISTRO - NOVO USUÁRIO
// ============================================

import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { collection, addDoc, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { formatCPF, formatPhone } from './utils.js';

// Carrega empresas e cargos ao abrir a página
export async function initRegister() {
    await loadEmpresas();
    await loadCargos();
}

// Carrega lista de empresas
async function loadEmpresas() {
    try {
        const empresasRef = collection(db, 'empresas');
        const q = query(empresasRef, where('ativa', '==', true));
        const snapshot = await getDocs(q);

        const select = document.getElementById('empresa');
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

// Carrega lista de cargos
async function loadCargos() {
    try {
        const cargosRef = collection(db, 'cargos');
        const q = query(cargosRef, where('ativo', '==', true));
        const snapshot = await getDocs(q);

        const select = document.getElementById('cargo');
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar cargos:', error);
    }
}

// Valida formulário completo
function validateForm(dados) {
    const errors = {};

    // Email
    if (!dados.email || !dados.email.includes('@')) {
        errors.email = 'Email inválido';
    }

    // Senha
    if (!dados.password || dados.password.length < 8) {
        errors.password = 'Mínimo 8 caracteres';
    }

    // Nome
    if (!dados.nomeCompleto || dados.nomeCompleto.trim().length < 3) {
        errors.nomeCompleto = 'Nome inválido';
    }

    // CPF
    if (!dados.cpf || !validateCPF(dados.cpf)) {
        errors.cpf = 'CPF inválido';
    }

    // Telefone
    if (!dados.telefone || dados.telefone.replace(/\D/g, '').length < 10) {
        errors.telefone = 'Telefone inválido';
    }

    // Matrícula
    if (!dados.matricula || dados.matricula.trim().length < 2) {
        errors.matricula = 'Matrícula inválida';
    }

    // Empresa
    if (!dados.empresa) {
        errors.empresa = 'Selecione uma empresa';
    }

    // Cargo
    if (!dados.cargo) {
        errors.cargo = 'Selecione um cargo';
    }

    // Local
    if (!dados.localAtuacao || dados.localAtuacao.trim().length < 2) {
        errors.localAtuacao = 'Local inválido';
    }

    return errors;
}

// Valida CPF (básico)
function validateCPF(cpf) {
    const clean = cpf.replace(/\D/g, '');
    return clean.length === 11;
}

// Cria novo usuário
export async function handleRegister(dados) {
    // Valida
    const errors = validateForm(dados);
    if (Object.keys(errors).length > 0) {
        throw new Error(Object.values(errors)[0]);
    }

    try {
        // Cria usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            dados.email,
            dados.password
        );

        const uid = userCredential.user.uid;

        // Salva dados adicionais no Firestore
        await saveUserData(uid, dados);

        // Sucesso - redireciona para login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (error) {
        console.error('Erro ao registrar:', error);

        if (error.code === 'auth/email-already-in-use') {
            throw new Error('Este email já está cadastrado');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Senha muito fraca');
        } else {
            throw new Error(error.message);
        }
    }
}

// Salva dados adicionais do usuário
async function saveUserData(uid, dados) {
    try {
        const usersRef = collection(db, 'users');

        await addDoc(usersRef, {
            uid: uid,
            email: dados.email,
            role: 'candidato', // Novo usuário é sempre candidato
            nomeCompleto: dados.nomeCompleto,
            cpf: formatCPF(dados.cpf),
            telefone: formatPhone(dados.telefone),
            matricula: dados.matricula,
            empresa: dados.empresa,
            cargo: dados.cargo,
            localAtuacao: dados.localAtuacao,
            dataCriacao: new Date(),
            ativo: true
        });

        console.log('✅ Usuário criado com sucesso');
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        throw new Error('Erro ao salvar dados do usuário');
    }
}

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', initRegister);