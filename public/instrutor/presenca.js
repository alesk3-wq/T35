// Verificar autenticação
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    // Verificar role do usuário
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'instrutor') {
        window.location.href = '../login.html';
        return;
    }

    loadTurmas(user.uid);
});

// Variáveis globais
let turmasInstrutor = [];
let turmaSelecionada = null;

// Carregar turmas do instrutor
async function loadTurmas(instrutorId) {
    try {
        const turmasSnapshot = await db.collection('cursos')
            .where('instrutorId', '==', instrutorId)
            .get();

        turmasInstrutor = [];
        turmasSnapshot.forEach(doc => {
            turmasInstrutor.push({ id: doc.id, ...doc.data() });
        });

        renderTurmas();
    } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        showToast('Erro ao carregar turmas', 'error');
    }
}

// Renderizar lista de turmas
function renderTurmas() {
    const turmasList = document.getElementById('turmasList');
    
    if (turmasInstrutor.length === 0) {
        turmasList.innerHTML = '<div class="vazio"><p>Nenhuma turma encontrada</p></div>';
        return;
    }

    turmasList.innerHTML = turmasInstrutor.map(turma => `
        <div class="turma-item" data-turma-id="${turma.id}">
            <div class="turma-nome">${turma.nome}</div>
            <div class="turma-info">${turma.tipo} • ${turma.dataInicio}</div>
        </div>
    `).join('');

    // Event listeners para seleção de turma
    document.querySelectorAll('.turma-item').forEach(item => {
        item.addEventListener('click', () => selecionarTurma(item));
    });
}

// Selecionar turma
function selecionarTurma(element) {
    document.querySelectorAll('.turma-item').forEach(item => item.classList.remove('selected'));
    element.classList.add('selected');
    
    const turmaId = element.dataset.turmaId;
    turmaSelecionada = turmasInstrutor.find(t => t.id === turmaId);
    
    // Mostrar formulário de presença
    document.getElementById('presencaForm').style.display = 'block';
    document.getElementById('turmaSelecionada').textContent = turmaSelecionada.nome;
    document.getElementById('codigoPresenca').focus();
}

// Confirmar presença
document.getElementById('btnConfirmarPresenca').addEventListener('click', async () => {
    const codigo = document.getElementById('codigoPresenca').value.trim().toUpperCase();
    
    if (!codigo) {
        showToast('Digite o código de presença', 'warning');
        return;
    }

    if (!turmaSelecionada) {
        showToast('Selecione uma turma', 'warning');
        return;
    }

    try {
        // Validar código (deve ser igual ao código da turma)
        if (codigo !== turmaSelecionada.codigoPresenca) {
            showToast('Código inválido', 'error');
            return;
        }

        // Buscar inscrições do dia
        const hoje = new Date().toISOString().split('T')[0];
        const inscricoes = await db.collection('inscricoes')
            .where('cursoId', '==', turmaSelecionada.id)
            .get();

        // Registrar presença para cada inscrição
        let count = 0;
        for (const doc of inscricoes.docs) {
            const presencas = doc.data().presencas || [];
            if (!presencas.includes(hoje)) {
                presencas.push(hoje);
                await doc.ref.update({
                    presencas: presencas,
                    diasPresentes: presencas.length
                });
                count++;
            }
        }

        showToast(`Presença registrada para ${count} aluno(s)`, 'success');
        document.getElementById('codigoPresenca').value = '';
        document.getElementById('codigoPresenca').focus();
    } catch (error) {
        console.error('Erro ao registrar presença:', error);
        showToast('Erro ao registrar presença', 'error');
    }
});

// Função para mostrar toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}