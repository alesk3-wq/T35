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

function triggerLogoOrbit() {
    const orbit = document.querySelector('.logo-orbit');
    if (!orbit) return;
    orbit.classList.remove('spinning');
    void orbit.offsetWidth; // force reflow para reiniciar animação
    orbit.classList.add('spinning');
}

function injectLogoOrbit() {
    const logo = document.querySelector('.sidebar-header .logo');
    if (!logo || logo.parentElement.classList.contains('logo-orbit-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'logo-orbit-wrap';
    logo.parentNode.insertBefore(wrap, logo);
    wrap.appendChild(logo);

    const orbit = document.createElement('div');
    orbit.className = 'logo-orbit';
    wrap.appendChild(orbit);
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('active');
    getOrCreateOverlay().classList.toggle('active', isOpen);

    if (isOpen) triggerLogoOrbit();
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

// Injeta orbit no carregamento e dispara uma vez no desktop
document.addEventListener('DOMContentLoaded', () => {
    injectLogoOrbit();
    if (window.innerWidth > 768) triggerLogoOrbit();
});

console.log('✅ UI Shell carregado com sucesso!');