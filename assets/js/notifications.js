// ============================================
// NOTIFICATIONS — sino + banner de verificação
// Injeta-se automaticamente em todas as páginas
// via import em ui-shell.js
// ============================================

import { auth, db } from '../../firebase-config.js';
import {
    onAuthStateChanged,
    sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
    collection, query, where, getDocs,
    doc, updateDoc, arrayUnion,
    orderBy, limit
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

let _userDocId = null;
let _userData  = null;

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Auto-inicializa quando o módulo é importado
onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
        const snap = await getDocs(
            query(collection(db, 'users'), where('uid', '==', user.uid))
        );
        if (snap.empty) return;
        _userDocId = snap.docs[0].id;
        _userData  = snap.docs[0].data();

        _injectBell();
        _injectSidebarUser();
        _checkEmailVerification(user);
        await _loadNotifications();
    } catch (err) {
        console.error('[notifications] init error:', err);
    }
});

// ─────────────────────────────────────────────
// USUÁRIO NA SIDEBAR
// ─────────────────────────────────────────────

function _injectSidebarUser() {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer || footer.querySelector('.sidebar-user')) return;

    const inicial = esc((_userData.fullName || _userData.email || '?')[0].toUpperCase());
    const role    = _userData.role || 'candidato';
    const roleMap = { candidato: 'Candidato', instrutor: 'Instrutor', admin: 'Admin' };
    const roleLabel = roleMap[role] || role;

    const isPerfil = window.location.pathname.includes('perfil.html');

    const userEl = document.createElement('a');
    userEl.className = 'sidebar-user' + (isPerfil ? ' sidebar-user-active' : '');
    userEl.href = 'perfil.html';
    userEl.innerHTML = `
        <div class="sidebar-user-avatar">${inicial}</div>
        <div class="sidebar-user-info">
            <span class="sidebar-user-name">${esc(_userData.fullName || 'Usuário')}</span>
            <span class="sidebar-user-email">${esc(_userData.email || '')}</span>
            <span class="sidebar-user-role role-${esc(role)}">${esc(roleLabel)}</span>
        </div>
    `;
    footer.insertBefore(userEl, footer.firstChild);
}

// ─────────────────────────────────────────────
// SINO
// ─────────────────────────────────────────────

function _injectBell() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || topbar.querySelector('.notif-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'notif-wrap';
    wrap.id = 'notifWrap';
    wrap.innerHTML = `
        <button class="notif-bell" id="notifBell" title="Notificações" aria-label="Notificações">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="notif-badge" id="notifBadge">0</span>
        </button>
        <div class="notif-dropdown" id="notifDropdown" role="dialog" aria-label="Painel de notificações">
            <div class="notif-header">
                <span class="notif-header-title">Notificações</span>
                <button class="notif-mark-all" id="notifMarkAll">Marcar todas como lidas</button>
            </div>
            <div class="notif-list" id="notifList">
                <div class="notif-empty">Carregando...</div>
            </div>
        </div>
    `;
    topbar.appendChild(wrap);

    document.getElementById('notifBell').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('notifDropdown').classList.toggle('open');
    });

    document.getElementById('notifMarkAll').addEventListener('click', _markAllRead);

    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
        const w = document.getElementById('notifWrap');
        if (w && !w.contains(e.target)) {
            document.getElementById('notifDropdown')?.classList.remove('open');
        }
    });
}

async function _loadNotifications() {
    if (!_userData) return;

    const lidas = _userData.notificacoesLidas || [];

    try {
        const snap = await getDocs(query(
            collection(db, 'notificacoes'),
            orderBy('createdAt', 'desc'),
            limit(30)
        ));

        const todas   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const naoLidas = todas.filter(n => !lidas.includes(n.id));

        // Badge
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.textContent   = naoLidas.length > 9 ? '9+' : naoLidas.length;
            badge.style.display = naoLidas.length > 0 ? 'flex' : 'none';
        }

        // Lista
        const list = document.getElementById('notifList');
        if (!list) return;

        if (todas.length === 0) {
            list.innerHTML = '<div class="notif-empty">Nenhuma notificação ainda.</div>';
            return;
        }

        list.innerHTML = todas.map(n => {
            const lida = lidas.includes(n.id);
            const data = n.createdAt?.toDate
                ? n.createdAt.toDate().toLocaleDateString('pt-BR')
                : '';
            return `
                <div class="notif-item${lida ? ' lida' : ''}" data-id="${esc(n.id)}">
                    <div class="notif-icon-wrap tipo-${esc(n.tipo || 'aviso')}">${_tipoIcon(n.tipo)}</div>
                    <div class="notif-body">
                        <p class="notif-titulo">${esc(n.titulo)}</p>
                        <p class="notif-msg">${esc(n.mensagem)}</p>
                        <span class="notif-data">${esc(data)}</span>
                    </div>
                    ${!lida ? '<div class="notif-dot"></div>' : ''}
                </div>`;
        }).join('');

        // Click → marcar como lida
        list.querySelectorAll('.notif-item:not(.lida)').forEach(el =>
            el.addEventListener('click', () => _marcarLida(el.dataset.id))
        );

    } catch (err) {
        console.error('[notifications] load error:', err);
        const list = document.getElementById('notifList');
        if (list) list.innerHTML = '<div class="notif-empty">Erro ao carregar.</div>';
    }
}

async function _marcarLida(notifId) {
    if (!_userDocId) return;

    const el = document.querySelector(`.notif-item[data-id="${notifId}"]`);
    el?.classList.add('lida');
    el?.querySelector('.notif-dot')?.remove();

    const badge = document.getElementById('notifBadge');
    if (badge) {
        const n = Math.max(0, parseInt(badge.textContent) - 1);
        badge.textContent   = n;
        badge.style.display = n > 0 ? 'flex' : 'none';
    }

    try {
        await updateDoc(doc(db, 'users', _userDocId), {
            notificacoesLidas: arrayUnion(notifId)
        });
        if (_userData) {
            _userData.notificacoesLidas = [...(_userData.notificacoesLidas || []), notifId];
        }
    } catch (err) {
        console.error('[notifications] marcarLida error:', err);
    }
}

async function _markAllRead() {
    const pendentes = [...document.querySelectorAll('.notif-item:not(.lida)')];
    if (pendentes.length === 0) return;

    const ids = pendentes.map(el => el.dataset.id);
    pendentes.forEach(el => {
        el.classList.add('lida');
        el.querySelector('.notif-dot')?.remove();
    });

    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';

    try {
        if (!_userDocId) return;
        const novasLidas = [...(_userData?.notificacoesLidas || []), ...ids];
        await updateDoc(doc(db, 'users', _userDocId), {
            notificacoesLidas: novasLidas
        });
        if (_userData) _userData.notificacoesLidas = novasLidas;
    } catch (err) {
        console.error('[notifications] markAllRead error:', err);
    }
}

function _tipoIcon(tipo) {
    const icons = {
        aviso: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        novo_curso: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
        sistema: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        inscricao: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/></svg>`,
    };
    return icons[tipo] || icons.sistema;
}

// ─────────────────────────────────────────────
// BANNER DE VERIFICAÇÃO DE EMAIL
// ─────────────────────────────────────────────

function _checkEmailVerification(user) {
    if (user.emailVerified) return;

    // Tenta montar o banner assim que o DOM do main estiver disponível
    const tryInject = () => {
        const main = document.querySelector('.main');
        if (!main || document.getElementById('verif-banner')) return;

        const banner = document.createElement('div');
        banner.id        = 'verif-banner';
        banner.className = 'verif-banner';
        banner.innerHTML = `
            <div class="verif-banner-body">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>Confirme seu email para garantir acesso completo à plataforma.</span>
                <button class="verif-btn" id="btnReenviarVerif">Reenviar email de confirmação</button>
            </div>
            <button class="verif-close" id="btnFecharBanner" title="Fechar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        main.insertAdjacentElement('afterbegin', banner);

        const btnRe = document.getElementById('btnReenviarVerif');
        let cooldown = false;
        btnRe.addEventListener('click', async () => {
            if (cooldown) return;
            cooldown = true;
            btnRe.disabled    = true;
            btnRe.textContent = 'Enviando...';
            try {
                await sendEmailVerification(auth.currentUser);
                btnRe.textContent = '✓ Email enviado!';
            } catch {
                btnRe.textContent = 'Erro — tente novamente';
                cooldown = false;
            }
            setTimeout(() => {
                btnRe.disabled    = false;
                btnRe.textContent = 'Reenviar email de confirmação';
                cooldown = false;
            }, 30_000);
        });

        document.getElementById('btnFecharBanner').addEventListener('click', () => banner.remove());
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        tryInject();
    } else {
        document.addEventListener('DOMContentLoaded', tryInject);
    }
}
