// ============================================
// DASHBOARD DO CANDIDATO - COMPLETO
// ============================================

// Usa Firebase via window (não é módulo)
let currentUser = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initDashboard() {
    currentUser = auth.currentUser;

    if (!currentUser) {
        window.location.href = '../login.html';
        return;
    }

    // Verifica se é candidato
    await checkUserRole();
    // Carrega dados do usuário
    await loadUserData();
    // Carrega cursos
    await loadCursos();
    // Carrega certificados
    await loadCertificados();
}

// Verifica se o usuário é candidato
async function checkUserRole() {
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const doc = await userRef.get();

        if (!doc.exists || doc.data().role !== 'candidato') {
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('Erro ao verificar role:', error);
        window.location.href = '../login.html';
    }
}

// ============================================
// CARREGA DADOS DO USUÁRIO
// ============================================

async function loadUserData() {
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('userName').textContent = userData.nomeCompleto || 'Usuário';
            
            // Atualiza topbar com avatar
            const topbarUser = document.getElementById('topbarUser');
            const iniciais = userData.nomeCompleto.split(' ').map(n => n[0]).join('').toUpperCase();
            
            topbarUser.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="text-align: right;">
                        <p style="margin: 0; color: var(--text); font-size: 14px; font-weight: 600;">${userData.nomeCompleto}</p>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">Candidato</p>
                    </div>
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--amber); display: flex; align-items: center; justify-content: center; color: var(--bg); font-weight: 700; font-size: 14px;">
                        ${iniciais}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// ============================================
// CARREGA CURSOS DO CANDIDATO
// ============================================

async function loadCursos() {
    try {
        const inscricoes = await db.collection('inscricoes')
            .where('candidatoUid', '==', currentUser.uid)
            .get();

        const cursosAtivos = [];
        const historioCursos = [];
        let statsAtivos = 0;

        // Para cada inscrição aprovada
        for (const inscricaoDoc of inscricoes.docs) {
            const inscricao = inscricaoDoc.data();

            // Apenas cursos aprovados
            if (inscricao.status !== 'apto') continue;

            try {
                // Busca o curso
                const cursoDoc = await db.collection('cursos').doc(inscricao.cursoId).get();

                if (cursoDoc.exists) {
                    const curso = cursoDoc.data();
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);

                    const dataInicio = new Date(curso.dataInicio.seconds * 1000);
                    const dataFim = new Date(curso.dataFim.seconds * 1000);
                    dataInicio.setHours(0, 0, 0, 0);
                    dataFim.setHours(0, 0, 0, 0);

                    const cursoData = {
                        id: cursoDoc.id,
                        ...curso,
                        inscricaoId: inscricaoDoc.id,
                        dataInicio: dataInicio,
                        dataFim: dataFim
                    };

                    // Verifica se está ativo ou finalizado
                    if (dataInicio <= hoje && dataFim >= hoje) {
                        cursosAtivos.push(cursoData);
                        statsAtivos++;
                    } else if (dataFim < hoje) {
                        historioCursos.push(cursoData);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar curso:', error);
            }
        }

        // Atualiza stats
        document.getElementById('statsActive').textContent = statsAtivos;
        document.getElementById('statsHistory').textContent = historioCursos.length;

        // Renderiza cursos
        renderCursos(cursosAtivos, 'cursosAtivos');
        renderCursos(historioCursos, 'historioCursos');

    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
    }
}

// ============================================
// CARREGA CERTIFICADOS
// ============================================

async function loadCertificados() {
    try {
        const certificados = await db.collection('certificados')
            .where('candidatoUid', '==', currentUser.uid)
            .where('status', '==', 'aprovado')
            .get();

        document.getElementById('statsCerts').textContent = certificados.size;
    } catch (error) {
        console.error('Erro ao carregar certificados:', error);
    }
}

// ============================================
// RENDERIZA CARDS DE CURSOS
// ============================================

function renderCursos(cursos, containerId) {
    const container = document.getElementById(containerId);

    if (cursos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                </svg>
                <p>Nenhum curso disponível</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cursos.map(curso => {
        const dataInicio = curso.dataInicio;
        const dataFim = curso.dataFim;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const ativo = dataInicio <= hoje && dataFim >= hoje;

        return `
            <div class="course-card">
                <div class="course-card-header">
                    <h4>${escapeHtml(curso.nome)}</h4>
                    <p>${escapeHtml(curso.instrutor)}</p>
                </div>
                <div class="course-card-body">
                    ${ativo ? '<div class="course-status">Em andamento</div>' : ''}
                    <div class="course-info">
                        <div class="course-info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>${formatDate(dataInicio)} até ${formatDate(dataFim)}</span>
                        </div>
                        <div class="course-info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${curso.duracao} dia(s)</span>
                        </div>
                        <div class="course-info-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>${escapeHtml(curso.instrutor)}</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn-course btn-course-primary" onclick="viewCourseDetails('${curso.id}')">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function viewCourseDetails(cursoId) {
    // TODO: Implementar navegação para página de detalhes do curso
    console.log('Vendo detalhes do curso:', cursoId);
    // window.location.href = `curso-detalhes.html?id=${cursoId}`;
}

// ============================================
// INICIALIZA QUANDO PÁGINA CARREGA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});