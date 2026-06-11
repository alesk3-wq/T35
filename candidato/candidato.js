import { db, auth } from '../firebase-config.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

let usuarioAtual = null;
let cursosDisponiveis = [];
let cursoSelecionado = null;

// Verificar autenticação
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    usuarioAtual = user;
    await carregarCursos();
});

// Carregar cursos do Firestore
async function carregarCursos() {
    try {
        const cursosRef = collection(db, 'cursos');
        const q = query(cursosRef, where('status', '==', 'ativo'));
        const snapshot = await getDocs(q);
        
        cursosDisponiveis = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderizarCursos(cursosDisponiveis);
    } catch (erro) {
        console.error('Erro ao carregar cursos:', erro);
        mostrarToast('Erro ao carregar cursos', 'erro');
    }
}

// Renderizar grid de cursos
function renderizarCursos(cursos) {
    const gridCursos = document.getElementById('gridCursos');
    
    if (cursos.length === 0) {
        gridCursos.innerHTML = `
            <div class="vazio">
                <p>Nenhum curso disponível no momento</p>
            </div>
        `;
        return;
    }
    
    gridCursos.innerHTML = cursos.map(curso => `
        <div class="curso-card">
            <div class="curso-header">
                <span class="curso-tipo">${curso.tipo}</span>
                <h3 class="curso-nome">${curso.nome}</h3>
            </div>
            <div class="curso-body">
                <p class="curso-descricao">${curso.descricao}</p>
                
                <div class="curso-info">
                    <svg class="curso-info-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1 4.5 4.5 0 1-3.764 6.233z"></path>
                    </svg>
                    <span>${curso.instrutor}</span>
                </div>
                
                <div class="curso-info">
                    <svg class="curso-info-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                    </svg>
                    <span>${formatarData(curso.dataInicio)} até ${formatarData(curso.dataFim)}</span>
                </div>
                
                <div class="curso-info">
                    <svg class="curso-info-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>${curso.horario}</span>
                </div>
            </div>
            <div class="curso-footer">
                <span class="vagas-info"><strong>${curso.vagas}</strong> vagas</span>
                <button class="btn-inscrever" onclick="abrirModal('${curso.id}')">
                    Inscrever-se
                </button>
            </div>
        </div>
    `).join('');
}

// Abrir modal de inscrição
function abrirModal(cursoId) {
    cursoSelecionado = cursosDisponiveis.find(c => c.id === cursoId);
    
    if (!cursoSelecionado) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <strong>Curso:</strong>
                <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${cursoSelecionado.nome}</p>
            </div>
            <div>
                <strong>Tipo:</strong>
                <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${cursoSelecionado.tipo}</p>
            </div>
            <div>
                <strong>Período:</strong>
                <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${formatarData(cursoSelecionado.dataInicio)} até ${formatarData(cursoSelecionado.dataFim)}</p>
            </div>
            <div>
                <strong>Instrutor:</strong>
                <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${cursoSelecionado.instrutor}</p>
            </div>
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem; border-left: 4px solid var(--amber);">
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
                    ✓ Você será inscrito neste curso e poderá acompanhar sua presença
                </p>
            </div>
        </div>
    `;
    
    document.getElementById('modalInscricao').style.display = 'flex';
}

// Fechar modal
document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalInscricao').style.display = 'none';
});

document.getElementById('modalCancelar').addEventListener('click', () => {
    document.getElementById('modalInscricao').style.display = 'none';
});

// Confirmar inscrição
document.getElementById('modalConfirmar').addEventListener('click', async () => {
    if (!cursoSelecionado) return;
    
    try {
        const btn = document.getElementById('modalConfirmar');
        btn.disabled = true;
        btn.textContent = 'Inscrevendo...';
        
        // Verificar se já está inscrito
        const inscricoes = collection(db, 'inscricoes');
        const q = query(
            inscricoes,
            where('usuarioId', '==', usuarioAtual.uid),
            where('cursoId', '==', cursoSelecionado.id)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            mostrarToast('Você já está inscrito neste curso', 'aviso');
            btn.disabled = false;
            btn.textContent = 'Confirmar Inscrição';
            return;
        }
        
        // Criar inscrição
        await addDoc(inscricoes, {
            usuarioId: usuarioAtual.uid,
            cursoId: cursoSelecionado.id,
            cursoNome: cursoSelecionado.nome,
            dataInscricao: serverTimestamp(),
            status: 'ativo',
            presencas: []
        });
        
        mostrarToast('Inscrito com sucesso!', 'sucesso');
        document.getElementById('modalInscricao').style.display = 'none';
        
        // Redirecionar para meus-cursos após 2 segundos
        setTimeout(() => {
            window.location.href = 'meus-cursos.html';
        }, 2000);
        
    } catch (erro) {
        console.error('Erro ao inscrever:', erro);
        mostrarToast('Erro ao inscrever no curso', 'erro');
        document.getElementById('modalConfirmar').disabled = false;
        document.getElementById('modalConfirmar').textContent = 'Confirmar Inscrição';
    }
});

// Filtros
document.getElementById('buscaNome').addEventListener('input', aplicarFiltros);
document.getElementById('filtroTipo').addEventListener('change', aplicarFiltros);

function aplicarFiltros() {
    const buscaNome = document.getElementById('buscaNome').value.toLowerCase();
    const filtroTipo = document.getElementById('filtroTipo').value;
    
    const cursosFiltrados = cursosDisponiveis.filter(curso => {
        const matchNome = curso.nome.toLowerCase().includes(buscaNome);
        const matchTipo = filtroTipo === '' || curso.tipo === filtroTipo;
        return matchNome && matchTipo;
    });
    
    renderizarCursos(cursosFiltrados);
}

// Mostrar toast
function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = mensagem;
    toast.className = `toast toast-${tipo} visible`;
    
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// Formatar data
function formatarData(data) {
    if (!data) return '';
    if (typeof data === 'object' && data.toDate) {
        data = data.toDate();
    }
    return new Date(data).toLocaleDateString('pt-BR');
}