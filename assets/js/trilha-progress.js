// ============================================
// TRILHA PROGRESS — cálculo de progresso de cursos modulares
// (curso.modulos + inscricao.modulosProgresso)
// ============================================

import {
    doc, updateDoc, arrayUnion
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

/**
 * Calcula o progresso de uma trilha (curso com módulos) a partir dos dados
 * do curso e do progresso salvo na inscrição.
 * Itera sobre curso.modulos (nunca sobre modulosProgresso) para não quebrar
 * quando um módulo com progresso salvo foi removido do curso depois.
 * @param {object} curso - documento de cursos/{id}
 * @param {object} inscricaoData - documento de inscricoes/{id}
 * @returns {{ modulos: Array, totalPct: number, todosConcluidos: boolean }}
 */
export function calcularProgressoTrilha(curso, inscricaoData) {
    const modulosProgresso = inscricaoData?.modulosProgresso || {};

    const modulos = (curso?.modulos || []).map(m => {
        const prog = modulosProgresso[m.id] || {};
        const partes = [];
        if (m.video)     partes.push({ pct: prog.video?.percentualVideo || 0, concluido: !!prog.video?.concluido });
        if (m.documento) partes.push({ pct: prog.documento?.percentualScroll || 0, concluido: !!prog.documento?.concluido });

        // Módulo sem vídeo nem documento (edge case de edição manual no console) não entra na média
        const temConteudo = partes.length > 0;
        const pctModulo   = temConteudo ? Math.round(partes.reduce((s, p) => s + p.pct, 0) / partes.length) : 0;
        const concluido   = temConteudo && partes.every(p => p.concluido);

        return {
            id: m.id,
            titulo: m.titulo,
            temVideo:     !!m.video,
            temDocumento: !!m.documento,
            pctVideo:     m.video     ? (prog.video?.percentualVideo || 0)     : null,
            pctDocumento: m.documento ? (prog.documento?.percentualScroll || 0) : null,
            pctModulo,
            concluido,
            temConteudo
        };
    });

    const modulosComConteudo = modulos.filter(m => m.temConteudo);
    const totalPct = modulosComConteudo.length
        ? Math.round(modulosComConteudo.reduce((s, m) => s + m.pctModulo, 0) / modulosComConteudo.length)
        : 0;
    const todosConcluidos = modulosComConteudo.length > 0 && modulosComConteudo.every(m => m.concluido);

    return { modulos, totalPct, todosConcluidos };
}

/**
 * Se todos os módulos da trilha estiverem concluídos e a presença de hoje
 * ainda não tiver sido registrada, registra (arrayUnion), igual ao fluxo EAD de vídeo único.
 * Recebe o estado da inscrição já mesclado em memória (progresso atual + sub-item recém-salvo)
 * para não precisar de um getDoc extra.
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} inscricaoId
 * @param {object} curso
 * @param {object} inscricaoDataMesclada
 * @returns {Promise<boolean>} true se a presença foi registrada agora
 */
export async function registrarPresencaSeCompleto(db, inscricaoId, curso, inscricaoDataMesclada) {
    const { todosConcluidos } = calcularProgressoTrilha(curso, inscricaoDataMesclada);
    if (!todosConcluidos) return false;

    const hoje = new Date().toISOString().split('T')[0];
    const presencas = inscricaoDataMesclada.presencas || [];
    if (presencas.includes(hoje)) return false;

    await updateDoc(doc(db, 'inscricoes', inscricaoId), { presencas: arrayUnion(hoje) });
    return true;
}

console.log('✅ Trilha progress carregado com sucesso!');
