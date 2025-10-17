import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

let abshineSystem;

class ABShineSystem {
  constructor() {
  this.cart = this.loadFromStorage("abshine_cart") || [];
  this.user = this.loadFromStorage("abshine_user") || null;
  this.products = {}; // vacío al principio
  this.init();
}

async init() {
  await this.loadProductsFromFirebase(); // 🔥 Esperá a que carguen
  this.setupEventListeners();
  this.updateCartUI();
  this.updateAuthUI();
  this.checkUserSession();
}

async loadProductsFromFirebase() {
  const { collection, getDocs } = await import("./firebase-config.js");
  const snap = await getDocs(collection(db, "productos"));
  snap.forEach(d => {
    const p = d.data();
    this.products[d.id] = { id: d.id, ...p };
  });
}
  loadFromStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  async register(name, email, password, confirmPassword) {
    this.clearFormErrors("register");

    const errors = {};
    if (!name.trim()) errors.name = "El nombre es requerido";
    if (!email.trim() || !this.isValidEmail(email)) errors.email = "Email inválido";
    if (!password || password.length < 6) errors.password = "Mínimo 6 caracteres";
    if (password !== confirmPassword) errors.confirm = "Las contraseñas no coinciden";

    if (Object.keys(errors).length > 0) {
      this.showFormErrors("register", errors);
      return { success: false };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.email), {
        name: name,
        email: user.email,
        role: "user"
      });

      this.user = {
        name: name,
        email: user.email,
        role: "user",
        loginTime: new Date().toISOString(),
      };

      this.saveToStorage("abshine_user", this.user);
      this.updateAuthUI();
      this.closeModal("register-modal");
      this.showNotification("¡Registro exitoso! Bienvenido, " + name, "success");
      return { success: true };
    } catch (error) {
      this.showFormErrors("register", { email: error.message });
      return { success: false };
    }
  }

  async login(email, password) {
    this.clearFormErrors("login");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "usuarios", user.email));
      const userData = userDoc.data();

      this.user = {
        name: userData.name,
        email: user.email,
        role: userData.role,
        loginTime: new Date().toISOString(),
      };

      this.saveToStorage("abshine_user", this.user);
      this.updateAuthUI();
      this.closeModal("login-modal");
      this.showNotification("¡Bienvenido, " + this.user.name + "!", "success");
      // Redirigir al checkout si viene del carrito
    if (window.location.pathname.includes("index_categoria") && this.cart.length > 0) {
      setTimeout(() => {
        window.location.href = "checkout.html";
      }, 1000);
    }
      return { success: true };
    } catch (error) {
      this.showFormErrors("login", { email: "Credenciales incorrectas" });
      return { success: false };
    }
  }

  logout() {
    const name = this.user?.name || "Usuario";
    this.user = null;
    localStorage.removeItem("abshine_user");
    this.updateAuthUI();
    this.showNotification("¡Hasta luego, " + name + "!", "info");
    const dropdown = document.getElementById("user-dropdown");
    if (dropdown) dropdown.classList.remove("show");
  }

  addToCart(productId) {
    const product = this.products[productId];
    if (!product) {
      this.showNotification("Producto no encontrado", "error");
      return;
    }

    const existing = this.cart.find(item => item.id === productId);
    if (existing) {
      existing.quantity += 1;
      this.showNotification(`Cantidad actualizada: ${product.name}`, "success");
    } else {
      this.cart.push({ ...product, quantity: 1 });
      this.showNotification(`${product.name} agregado al carrito`, "success");
    }

    this.saveToStorage("abshine_cart", this.cart);
    this.updateCartUI();
  }
removeFromCart(productId) {
  const item = this.cart.find(item => item.id === productId);
  if (!item) return;

  this.cart = this.cart.filter(item => item.id !== productId);
  this.saveToStorage("abshine_cart", this.cart);
  this.updateCartUI();
  this.showNotification(`${item.name} eliminado del carrito`, "info");
}
  updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const item = this.cart.find(item => item.id === productId);
    if (item) {
      item.quantity = newQuantity;
      this.saveToStorage("abshine_cart", this.cart);
      this.updateCartUI();
    }
  }

  getCartTotal() {
    return this.cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  getCartItemCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

updateCartUI() {
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    const count = this.getCartItemCount();
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? "flex" : "none";
  }

  const cartItemsContainer = document.getElementById("cart-items");
  const cartFooter = document.querySelector(".cart-footer");   // ← agregado
  if (!cartItemsContainer) return;

  if (this.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Tu carrito está vacío</p>
      </div>`;
    if (cartFooter) cartFooter.style.display = "none";         // ← ocultar
    return;
  }

  if (cartFooter) cartFooter.style.display = "block";          // ← mostrar

  cartItemsContainer.innerHTML = this.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='./imagenes/placeholder.jpg'">
      <div class="item-details">
        <h3>${item.name}</h3>
        <p class="price">$${item.price.toLocaleString()}</p>
        <p class="details">${item.details}</p>
      </div>
      <div class="quantity-controls">
        <button class="quantity-btn" data-action="minus" title="Restar"><i class="fas fa-minus"></i></button>
        <span class="quantity">${item.quantity}</span>
        <button class="quantity-btn" data-action="plus" title="Sumar"><i class="fas fa-plus"></i></button>
      </div>
      <button class="remove-btn" data-action="remove" title="Eliminar"><i class="fas fa-trash"></i></button>
    </div>`).join("");

  const cartTotal = document.getElementById("cart-total");
  if (cartTotal) cartTotal.textContent = `$${this.getCartTotal().toLocaleString()}`;
}

  updateAuthUI() {
    const authButtons = document.getElementById("auth-buttons");
    const userProfile = document.getElementById("user-profile");
    const displayName = document.getElementById("display-name");
    const displayEmail = document.getElementById("display-email");
    const userName = document.getElementById("user-name");

    if (this.user) {
      if (authButtons) authButtons.style.display = "none";
      if (userProfile) userProfile.style.display = "block";
      if (displayName) displayName.textContent = this.user.name;
      if (displayEmail) displayEmail.textContent = this.user.email;
      if (userName) userName.textContent = this.user.name;
    } else {
      if (authButtons) authButtons.style.display = "flex";
      if (userProfile) userProfile.style.display = "none";
    }
  }

  setupEventListeners() {
    const cartToggle = document.getElementById("cart-toggle");
    if (cartToggle) cartToggle.addEventListener("click", () => this.showModal("cart-modal"));

    const cartClose = document.getElementById("cart-close");
    if (cartClose) cartClose.addEventListener("click", () => this.closeModal("cart-modal"));

    const continueShopping = document.getElementById("continue-shopping");
    if (continueShopping) continueShopping.addEventListener("click", () => this.closeModal("cart-modal"));

    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) loginBtn.addEventListener("click", () => this.showModal("login-modal"));

    const registerBtn = document.getElementById("register-btn");
    if (registerBtn) registerBtn.addEventListener("click", () => this.showModal("register-modal"));

    const profileToggle = document.getElementById("profile-toggle");
    const userDropdown = document.getElementById("user-dropdown");
    if (profileToggle && userDropdown) {
      profileToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("show");
      });
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => this.logout());

    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      this.login(email, password);
    });

    const registerForm = document.getElementById("register-form");
    if (registerForm) registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("register-name").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const confirm = document.getElementById("register-confirm-password").value;
      this.register(name, email, password, confirm);
    });

    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) checkoutBtn.addEventListener("click", () => this.handleCheckout());

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) this.closeModal(e.target.id);
      const dropdown = document.getElementById("user-dropdown");
      const toggle = document.getElementById("profile-toggle");
      if (dropdown && toggle && !dropdown.contains(e.target) && !toggle.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const openModal = document.querySelector(".modal-overlay.show");
        if (openModal) this.closeModal(openModal.id);
      }
    });
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
      document.body.style.overflow = "auto";
      const form = modal.querySelector("form");
      if (form) {
        form.reset();
        this.clearFormErrors(modalId.replace("-modal", ""));
      }
    }
  }

  clearFormErrors(formType) {
    const errorElements = document.querySelectorAll(`#${formType}-modal .error-message`);
    errorElements.forEach(el => el.textContent = "");
  }

  showFormErrors(formType, errors) {
    Object.keys(errors).forEach(field => {
      const errorElement = document.getElementById(`${formType}-${field}-error`);
      if (errorElement) errorElement.textContent = errors[field];
    });
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showNotification(message, type = "info") {
    const container = document.getElementById("notification-container") || document.body;
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#cc117b'};
      color: white; padding: 1rem; border-radius: 8px; z-index: 10000; display: flex; align-items: center; gap: 0.5rem; max-width: 400px;
    `;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

handleCheckout() {
  if (this.cart.length === 0) {
    this.showNotification("Tu carrito está vacío", "warning");
    return;
  }
  if (!this.user) {
    this.closeModal("cart-modal");
    this.showModal("login-modal");
    this.showNotification("Debes iniciar sesión para comprar", "info");
    return;
  }

  // ✅ Guardar carrito antes de redirigir
  this.saveToStorage("abshine_cart", this.cart);

  // ✅ Ir al checkout
  window.location.href = "checkout.html";
}

  checkUserSession() {
    if (this.user) {
      const loginTime = new Date(this.user.loginTime);
      const hours = (new Date() - loginTime) / (1000 * 60 * 60);
      if (hours > 24) this.logout();
    }
  }
}

// Funciones globales
function addProductToCart(productId) {
  abshineSystem.addToCart(productId);
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return; // Si no encuentra el input, no hace nada

  // Busca el ícono dentro del elemento hermano (el botón)
  const icon = input.parentElement.querySelector(".toggle-password i");
  if (!icon) return; // Si no encuentra el ícono, no hace nada

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

// Hacemos la función global para que se pueda llamar desde el HTML
window.togglePassword = togglePassword;

function switchToRegister() {
  abshineSystem.closeModal("login-modal");
  abshineSystem.showModal("register-modal");
}

function switchToLogin() {
  abshineSystem.closeModal("register-modal");
  abshineSystem.showModal("login-modal");
}

function closeModal(modalId) {
  abshineSystem.closeModal(modalId);
}

document.addEventListener("DOMContentLoaded", () => {
  abshineSystem = new ABShineSystem();
});


// ✅ Hacer estas funciones globales para que onclick funcione
window.closeModal = function (modalId) {
  abshineSystem.closeModal(modalId);
};

window.switchToRegister = function () {
  abshineSystem.closeModal("login-modal");
  abshineSystem.showModal("register-modal");
};

window.switchToLogin = function () {
  abshineSystem.closeModal("register-modal");
  abshineSystem.showModal("login-modal");
};

window.addProductToCart = function (productId) {
  abshineSystem.addToCart(productId);
};
// ===== Delegación de eventos para +, – y 🗑️ dentro del modal =====
document.addEventListener("click", e => {
  const cartItem = e.target.closest(".cart-item");
  if (!cartItem) return;

  const id = cartItem.dataset.id;
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  switch (action) {
    case "plus":
      abshineSystem.updateQuantity(id, parseInt(cartItem.querySelector(".quantity").textContent) + 1);
      break;
    case "minus":
      const qty = parseInt(cartItem.querySelector(".quantity").textContent);
      if (qty > 1) abshineSystem.updateQuantity(id, qty - 1);
      break;
    case "remove":
      abshineSystem.removeFromCart(id);
      break;
  }
});