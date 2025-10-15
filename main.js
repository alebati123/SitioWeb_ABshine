document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navWrapper = document.querySelector('.nav-wrapper');

  if (menuToggle && navWrapper) {
    menuToggle.addEventListener('click', () => {
      navWrapper.classList.toggle('active');
    });
  }

  // Lógica para el submenú desplegable en móvil
  const submenuToggles = document.querySelectorAll('.submenu-toggle');

  submenuToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const parentLi = toggle.parentElement;

      // Cerrar otros submenús abiertos
      const openSubmenus = document.querySelectorAll('.has-submenu.submenu-active');
      openSubmenus.forEach(submenu => {
        if (submenu !== parentLi) {
          submenu.classList.remove('submenu-active');
        }
      });

      // Abrir o cerrar el submenú actual
      parentLi.classList.toggle('submenu-active');
    });
  });
});

