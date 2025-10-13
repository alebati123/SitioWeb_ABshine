document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  // Apuntamos al nuevo contenedor .nav-wrapper
  const navWrapper = document.querySelector('.nav-wrapper');

  if (menuToggle && navWrapper) {
    menuToggle.addEventListener('click', () => {
      // Aplicamos la clase 'active' al contenedor
      navWrapper.classList.toggle('active');
    });
  }
});
