import { db, auth, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onAuthStateChanged, signInWithEmailAndPassword } from "./firebase-config.js";

let productos = [];
let editandoId = null;
let paginaActual = 1;
const productosPorPagina = 6;   // 

// Cargar categorías
async function loadCategories() {
  const snapshot = await getDocs(collection(db, "categorias"));
  const select = document.getElementById("product-category");
  select.innerHTML = '<option value="">Seleccionar o escribir nueva</option>';
  snapshot.forEach(d => {
    const c = d.data();
    const opt = document.createElement("option");
    opt.value = c.slug;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}
// ===== Cargar combo de filtros =====
async function cargarComboCategorias() {
  const snapshot = await getDocs(collection(db, "categorias"));
  const select = document.getElementById("filter-category");
  select.innerHTML = '<option value="">Todas las categorías</option>';
  snapshot.forEach(d => {
    const c = d.data();
    const opt = document.createElement("option");
    opt.value = c.slug;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}
// Cargar productos
const cargarProductos = async () => {
  const snapshot = await getDocs(collection(db, "productos"));
  productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  paginaActual = 1;        // siempre empezar en página 1
  renderizarPagina();      // pintar solo 12 productos
  await cargarComboCategorias(); // ← nueva
};

const renderizarProductos = () => {
  const contenedor = document.getElementById("products-grid");
  contenedor.innerHTML = productos.map(p => `
    <div class="product-card-admin">
      <img src="${p.image}" alt="${p.name}" class="product-image-admin">
      <div class="product-info-admin">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name-admin">${p.name}</h3>
        <p class="product-details-admin">${p.details}</p>
        <p class="product-price-admin">$${p.price}</p>
        <div class="product-actions">
          <button class="edit-btn" onclick="editarProducto('${p.id}')">Editar</button>
          <button class="delete-btn" onclick="eliminarProducto('${p.id}')">Eliminar</button>
        </div>
      </div>
    </div>
  `).join("");
};

window.editarProducto = async (id) => {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;
  editandoId = id;
  document.getElementById("modal-title").innerText = "Editar Producto";
  document.getElementById("product-name").value = producto.name;
  document.getElementById("product-category").value = producto.category;
  document.getElementById("product-price").value = producto.price;
  document.getElementById("product-details").value = producto.details;
  document.getElementById("product-image").value = producto.image;
  document.getElementById("product-modal").classList.add("show");
};

window.eliminarProducto = async (id) => {
  if (!confirm("¿Eliminar este producto?")) return;
  await deleteDoc(doc(db, "productos", id));
  alert("Producto eliminado");
  cargarProductos();
};

document.getElementById("add-product-btn").onclick = () => {
  editandoId = null;
  document.getElementById("modal-title").innerText = "Agregar Producto";
  document.getElementById("product-form").reset();
  document.getElementById("product-modal").classList.add("show");
};

document.getElementById("toggle-new-category").onclick = () => {
  const input = document.getElementById("new-category-input");
  const select = document.getElementById("product-category");
  if (input.style.display === "none") {
    input.style.display = "block";
    select.required = false;
    input.required = true;
    input.focus();
  } else {
    input.style.display = "none";
    select.required = true;
    input.required = false;
  }
};

document.getElementById("product-form").onsubmit = async (e) => {
  e.preventDefault();
  let category = document.getElementById("product-category").value;
  const newCatInput = document.getElementById("new-category-input").value.trim();

  if (newCatInput) {
    const newSlug = newCatInput.toLowerCase().replace(/\s+/g, '-');
    await addDoc(collection(db, "categorias"), {
      nombre: newCatInput,
      slug: newSlug,
      orden: 99,
      activa: true
    });
    category = newSlug;
  }

  const data = {
    name: document.getElementById("product-name").value,
    category: category,
    price: parseFloat(document.getElementById("product-price").value),
    details: document.getElementById("product-details").value,
    image: document.getElementById("product-image").value
  };

  if (editandoId) {
    await updateDoc(doc(db, "productos", editandoId), data);
    alert("Producto actualizado");
  } else {
    await addDoc(collection(db, "productos"), data);
    alert("Producto agregado");
  }
  cerrarModal();
  cargarProductos();
};

const cerrarModal = () => {
  document.getElementById("product-modal").classList.remove("show");
};

document.getElementById("close-modal").onclick = cerrarModal;
document.getElementById("cancel-btn").onclick = cerrarModal;

/* ---------- LOGIN ADMIN ---------- */
document.getElementById("admin-login-form").onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById("admin-login-modal").classList.remove("show");
  } catch (err) {
    alert("Error al iniciar sesión: " + err.message);
  }
};



onAuthStateChanged(auth, user => {
  if (!user) {
    document.getElementById("admin-login-modal").classList.add("show");
    document.getElementById("access-denied").style.display = "block";
    document.getElementById("admin-content").style.display = "none";
  } else {
    document.getElementById("admin-login-modal").classList.remove("show");
    document.getElementById("access-denied").style.display = "none";
    document.getElementById("admin-content").style.display = "block";
    loadCategories();
    cargarProductos();
  }



 let productos = [];
let editandoId = null;
let paginaActual = 1;
const productosPorPagina = 6;

// ===== FUNCION CAMBIO DE PESTAÑAS =====
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabName + '-tab').classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}
});

// ========= FILTRADO =========
function filtrarYRenderizar() {
  const texto = document.getElementById("search-products").value.trim().toLowerCase();
  const cat   = document.getElementById("filter-category").value;

  const filtrados = productos.filter(p =>
    p.name.toLowerCase().includes(texto) &&
    (cat === "" || p.category === cat)
  );

  const contenedor = document.getElementById("products-grid");
  contenedor.innerHTML = filtrados.map(p => `
    <div class="product-card-admin">
      <img src="${p.image}" alt="${p.name}" class="product-image-admin">
      <div class="product-info-admin">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name-admin">${p.name}</h3>
        <p class="product-details-admin">${p.details}</p>
        <p class="product-price-admin">$${p.price}</p>
        <div class="product-actions">
          <button class="edit-btn" onclick="editarProducto('${p.id}')">Editar</button>
          <button class="delete-btn" onclick="eliminarProducto('${p.id}')">Eliminar</button>
        </div>
      </div>
    </div>`).join("");
}

// ===== DEBUG: verificá valores =====
function debugFiltro() {
  const cat = document.getElementById("filter-category").value;
  console.log("Categoría seleccionada:", cat);
  console.log("Productos disponibles:", productos.map(p => ({name: p.name, category: p.category})));
  const filtrados = productos.filter(p => cat === "" || p.category === cat);
  console.log("Productos después del filtro:", filtrados);
}
document.getElementById("filter-category").addEventListener("change", debugFiltro);

// ===== FILTROS: conectamos después de que existan los elementos =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search-products")?.addEventListener("input", filtrarYRenderizar);
  document.getElementById("filter-category")?.addEventListener("change", filtrarYRenderizar);

// ===== FUNCIÓN CAMBIO DE PESTAÑAS =====
function showTab(tabName) {
  // Oculta todos los contenidos
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  // Quita active de todos los botones
  document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
  // Muestra solo el tab seleccionado
  document.getElementById(tabName + '-tab').classList.add('active');
  // Marca el botón como activo
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// ===== CONECTAR EVENTO VENTAS =====
document.querySelector('[data-tab="ventas"]').onclick = () => {
  showTab("ventas");
  cargarVentas();
};

});

function renderizarPagina() {
  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin    = inicio + productosPorPagina;
  const visibles = productos.slice(inicio, fin);

  const contenedor = document.getElementById("products-grid");
  contenedor.innerHTML = visibles.map(p => `
    <div class="product-card-admin">
      <img src="${p.image}" alt="${p.name}" class="product-image-admin">
      <div class="product-info-admin">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name-admin">${p.name}</h3>
        <p class="product-details-admin">${p.details}</p>
        <p class="product-price-admin">$${p.price}</p>
        <div class="product-actions">
          <button class="edit-btn" onclick="editarProducto('${p.id}')">Editar</button>
          <button class="delete-btn" onclick="eliminarProducto('${p.id}')">Eliminar</button>
        </div>
      </div>
    </div>`).join("");

  pintarBotonesPaginacion();
}

function pintarBotonesPaginacion() {
  const totalPaginas = Math.ceil(productos.length / productosPorPagina);
  const div = document.getElementById("pagination");
  div.innerHTML = "";

  const btnAnt = document.createElement("button");
  btnAnt.className = "btn-pagination";
  btnAnt.innerHTML = '<i class="fas fa-chevron-left"></i>';
  btnAnt.disabled = paginaActual === 1;
  btnAnt.onclick = () => { paginaActual--; renderizarPagina(); };
  div.appendChild(btnAnt);

  const inicio = Math.max(1, paginaActual - 2);
  const fin = Math.min(totalPaginas, inicio + 4);
  for (let i = inicio; i <= fin; i++) {
    const btn = document.createElement("button");
    btn.className = "btn-pagination" + (i === paginaActual ? " active" : "");
    btn.textContent = i;
    btn.onclick = () => { paginaActual = i; renderizarPagina(); };
    div.appendChild(btn);
  }

  const btnSig = document.createElement("button");
  btnSig.className = "btn-pagination";
  btnSig.innerHTML = '<i class="fas fa-chevron-right"></i>';
  btnSig.disabled = paginaActual === totalPaginas;
  btnSig.onclick = () => { paginaActual++; renderizarPagina(); };
  div.appendChild(btnSig);
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabName + '-tab').classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

async function cargarVentas() {
  const snap = await getDocs(collection(db, "pedidos"));
  const lista = document.getElementById("ventas-list");
  lista.innerHTML = "";
  if (snap.empty) {
    lista.innerHTML = "<p style='padding:1rem;'>No hay pedidos aún.</p>";
    return;
  }
  snap.forEach(doc => {
    const p = doc.data();
    const fecha = p.fecha?.toDate().toLocaleString() || "Sin fecha";
    const items = (p.items || []).map(i =>
      `<li>${i.quantity} × ${i.name} ($${i.price})</li>`
    ).join("");
    lista.innerHTML += `
      <div class="product-card-admin" style="flex-direction:column; align-items:start;">
        <div><strong>Fecha:</strong> ${fecha}</div>
        <div><strong>Cliente:</strong> ${p.usuario || "N/A"}</div>
        <div><strong>Total:</strong> $${p.totalFinal || 0}</div>
        <div><strong>Estado:</strong> ${p.estado || "pendiente"}</div>
        <div><strong>Items:</strong><ul style="margin:.5rem 0 0 1.2rem;">${items}</ul></div>
      </div>`;
  });
}

  // ===== EVENTOS PESTAÑAS =====
document.querySelector('[data-tab="products"]').onclick = () => showTab("products");
document.querySelector('[data-tab="ventas"]').onclick   = () => {
  showTab("ventas");
  cargarVentas();
};