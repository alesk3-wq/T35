// Verificar autenticação
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    // Verificar role do usuário
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }

    loadUsuarios();
});

// Variáveis globais
let usuariosData = [];
let roleFilter = 'todos';
let usuarioEmEdicao = null;

// Carregar usuários
async function loadUsuarios() {
    try {
        const snapshot = await db.collection('users').get();
        usuariosData = [];
        
        snapshot.forEach(doc => {
            usuariosData.push({ id: doc.id, ...doc.data() });
        });

        renderUsuarios();
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showToast('Erro ao carregar usuários', 'error');
    }
}

// Renderizar tabela de usuários
function renderUsuarios() {
    const tbody = document.getElementById('usuariosTableBody');
    
    // Filtrar por role
    let usuariosFiltrados = usuariosData;
    if (roleFilter !== 'todos') {
        usuariosFiltrados = usuariosData.filter(u => u.role === roleFilter);
    }

    if (usuariosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="vazio">Nenhum usuário encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = usuariosFiltrados.map(usuario => {
        const dataCriacao = usuario.dataCriacao 
            ? new Date(usuario.dataCriacao).toLocaleDateString('pt-BR')
            : '-';
        
        const statusClass = usuario.ativo !== false ? 'status-ativo' : 'status-inativo';
        const statusLabel = usuario.ativo !== false ? 'Ativo' : 'Inativo';
        const roleClass = `role-${usuario.role}`;

        return `
            <tr>
                <td><strong>${usuario.nome || 'Sem nome'}</strong></td>
                <td>${usuario.email}</td>
                <td><span class="role-badge ${roleClass}">${usuario.role}</span></td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${dataCriacao}</td>
                <td>
                    <div class="acoes">
                        <button class="btn-acao" onclick="editarUsuario('${usuario.id}')">Editar</button>
                        <button class="btn-acao danger" onclick="deletarUsuario('${usuario.id}')">Deletar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtros por role
document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        roleFilter = btn.dataset.role;
        renderUsuarios();
    });
});

// Abrir modal novo usuário
document.getElementById('btnNovoUsuario').addEventListener('click', () => {
    usuarioEmEdicao = null;
    document.getElementById('novoNome').value = '';
    document.getElementById('novoEmail').value = '';
    document.getElementById('novoSenha').value = '';
    document.getElementById('novoRole').value = 'candidato';
    document.getElementById('modalNovoUsuario').classList.add('show');
});

// Fechar modal
document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalNovoUsuario').classList.remove('show');
});

document.getElementById('modalCancelar').addEventListener('click', () => {
    document.getElementById('modalNovoUsuario').classList.remove('show');
});

// Criar novo usuário
document.getElementById('modalConfirmar').addEventListener('click', async () => {
    const nome = document.getElementById('novoNome').value.trim();
    const email = document.getElementById('novoEmail').value.trim();
    const senha = document.getElementById('novoSenha').value;
    const role = document.getElementById('novoRole').value;

    if (!nome || !email || !senha) {
        showToast('Preencha todos os campos', 'warning');
        return;
    }

    if (senha.length < 6) {
        showToast('Senha deve ter no mínimo 6 caracteres', 'warning');
        return;
    }

    try {
        // Criar usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const uid = userCredential.user.uid;

        // Salvar dados no Firestore
        await db.collection('users').doc(uid).set({
            nome: nome,
            email: email,
            role: role,
            ativo: true,
            dataCriacao: new Date().toISOString()
        });

        showToast('Usuário criado com sucesso', 'success');
        document.getElementById('modalNovoUsuario').classList.remove('show');
        loadUsuarios();
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        showToast(error.message, 'error');
    }
});

// Editar usuário
function editarUsuario(usuarioId) {
    const usuario = usuariosData.find(u => u.id === usuarioId);
    if (!usuario) return;

    usuarioEmEdicao = usuario;
    document.getElementById('novoNome').value = usuario.nome || '';
    document.getElementById('novoEmail').value = usuario.email;
    document.getElementById('novoRole').value = usuario.role;
    document.getElementById('novoSenha').value = '';
    document.getElementById('novoSenha').placeholder = 'Deixe em branco para manter a senha';
    
    document.getElementById('modalNovoUsuario').classList.add('show');
}

// Deletar usuário
async function deletarUsuario(usuarioId) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
        await db.collection('users').doc(usuarioId).delete();
        showToast('Usuário deletado com sucesso', 'success');
        loadUsuarios();
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        showToast('Erro ao deletar usuário', 'error');
    }
}

// Função para mostrar toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}// Verificar autenticação
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    // Verificar role do usuário
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }

    loadUsuarios();
});

// Variáveis globais
let usuariosData = [];
let roleFilter = 'todos';
let usuarioEmEdicao = null;

// Carregar usuários
async function loadUsuarios() {
    try {
        const snapshot = await db.collection('users').get();
        usuariosData = [];
        
        snapshot.forEach(doc => {
            usuariosData.push({ id: doc.id, ...doc.data() });
        });

        renderUsuarios();
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showToast('Erro ao carregar usuários', 'error');
    }
}

// Renderizar tabela de usuários
function renderUsuarios() {
    const tbody = document.getElementById('usuariosTableBody');
    
    // Filtrar por role
    let usuariosFiltrados = usuariosData;
    if (roleFilter !== 'todos') {
        usuariosFiltrados = usuariosData.filter(u => u.role === roleFilter);
    }

    if (usuariosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="vazio">Nenhum usuário encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = usuariosFiltrados.map(usuario => {
        const dataCriacao = usuario.dataCriacao 
            ? new Date(usuario.dataCriacao).toLocaleDateString('pt-BR')
            : '-';
        
        const statusClass = usuario.ativo !== false ? 'status-ativo' : 'status-inativo';
        const statusLabel = usuario.ativo !== false ? 'Ativo' : 'Inativo';
        const roleClass = `role-${usuario.role}`;

        return `
            <tr>
                <td><strong>${usuario.nome || 'Sem nome'}</strong></td>
                <td>${usuario.email}</td>
                <td><span class="role-badge ${roleClass}">${usuario.role}</span></td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${dataCriacao}</td>
                <td>
                    <div class="acoes">
                        <button class="btn-acao" onclick="editarUsuario('${usuario.id}')">Editar</button>
                        <button class="btn-acao danger" onclick="deletarUsuario('${usuario.id}')">Deletar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtros por role
document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        roleFilter = btn.dataset.role;
        renderUsuarios();
    });
});

// Abrir modal novo usuário
document.getElementById('btnNovoUsuario').addEventListener('click', () => {
    usuarioEmEdicao = null;
    document.getElementById('novoNome').value = '';
    document.getElementById('novoEmail').value = '';
    document.getElementById('novoSenha').value = '';
    document.getElementById('novoRole').value = 'candidato';
    document.getElementById('modalNovoUsuario').classList.add('show');
});

// Fechar modal
document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalNovoUsuario').classList.remove('show');
});

document.getElementById('modalCancelar').addEventListener('click', () => {
    document.getElementById('modalNovoUsuario').classList.remove('show');
});

// Criar novo usuário
document.getElementById('modalConfirmar').addEventListener('click', async () => {
    const nome = document.getElementById('novoNome').value.trim();
    const email = document.getElementById('novoEmail').value.trim();
    const senha = document.getElementById('novoSenha').value;
    const role = document.getElementById('novoRole').value;

    if (!nome || !email || !senha) {
        showToast('Preencha todos os campos', 'warning');
        return;
    }

    if (senha.length < 6) {
        showToast('Senha deve ter no mínimo 6 caracteres', 'warning');
        return;
    }

    try {
        // Criar usuário no Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
        const uid = userCredential.user.uid;

        // Salvar dados no Firestore
        await db.collection('users').doc(uid).set({
            nome: nome,
            email: email,
            role: role,
            ativo: true,
            dataCriacao: new Date().toISOString()
        });

        showToast('Usuário criado com sucesso', 'success');
        document.getElementById('modalNovoUsuario').classList.remove('show');
        loadUsuarios();
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        showToast(error.message, 'error');
    }
});

// Editar usuário
function editarUsuario(usuarioId) {
    const usuario = usuariosData.find(u => u.id === usuarioId);
    if (!usuario) return;

    usuarioEmEdicao = usuario;
    document.getElementById('novoNome').value = usuario.nome || '';
    document.getElementById('novoEmail').value = usuario.email;
    document.getElementById('novoRole').value = usuario.role;
    document.getElementById('novoSenha').value = '';
    document.getElementById('novoSenha').placeholder = 'Deixe em branco para manter a senha';
    
    document.getElementById('modalNovoUsuario').classList.add('show');
}

// Deletar usuário
async function deletarUsuario(usuarioId) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
        await db.collection('users').doc(usuarioId).delete();
        showToast('Usuário deletado com sucesso', 'success');
        loadUsuarios();
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        showToast('Erro ao deletar usuário', 'error');
    }
}

// Função para mostrar toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}