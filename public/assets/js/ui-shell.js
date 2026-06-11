// ============================================
// UI SHELL - SIDEBAR E TOPBAR
// ============================================

// Inicializa notificações em todas as páginas que usam o shell
import './notifications.js';

let overlay = null;

function getOrCreateOverlay() {
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', closeSidebar);
    }
    return overlay;
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('active');
    getOrCreateOverlay().classList.toggle('active', isOpen);
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.classList.remove('active');
    getOrCreateOverlay().classList.remove('active');
}

export async function logout() {
    const { handleLogout } = await import('./auth.js');
    await handleLogout();
}

console.log('✅ UI Shell carregado com sucesso!');