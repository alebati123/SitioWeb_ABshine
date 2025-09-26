import { db, auth, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onAuthStateChanged, signInWithEmailAndPassword } from "./firebase-config.js";

let productos = [];
let editandoId = null;

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
  renderizarProductos();
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

/* ---------- CONTROL ACCESO ---------- */
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

// Cargar categorías en pestaña
async function cargarCategorias() {
  const snap = await getDocs(collection(db, "categorias"));
  const lista = document.getElementById("categories-list");
  lista.innerHTML = "";
  snap.forEach(d => {
    const c = d.data();
    const div = document.createElement("div");
    div.className = "product-card-admin";
    div.innerHTML = `
      <div class="product-info-admin" style="flex:1;">
        <span class="product-category">${c.nombre}</span>
        <p class="product-details-admin">Slug: ${c.slug} · Orden: ${c.orden}</p>
      </div>
      <div class="product-actions">
        <button class="delete-btn" onclick="eliminarCategoria('${d.id}', '${c.slug}')">Eliminar</button>
      </div>
    `;
    lista.appendChild(div);
  });
}

// Eliminar categoría
window.eliminarCategoria = async (id, slug) => {
  // Verificar que no haya productos usando esta categoría
  const prodSnap = await getDocs(collection(db, "productos"));
  const usada = prodSnap.docs.some(p => p.data().category === slug);
  if (usada) {
    alert("No podés eliminar esta categoría porque hay productos que la usan.");
    return;
  }
  if (!confirm("¿Seguro querés eliminar esta categoría?")) return;
  await deleteDoc(doc(db, "categorias", id));
  alert("Categoría eliminada");
  cargarCategorias();
  loadMenuCategories(); // actualiza menú superior
};

// Pestaña categorías
document.querySelector('[data-tab="categories"]').onclick = () => {
  showTab("categories");
  cargarCategorias();
};

// Abrir modal categoría
document.getElementById("add-category-btn").onclick = () => {
  document.getElementById("category-modal").classList.add("show");
};

// Cerrar modal categoría
function cerrarModalCategoria() {
  document.getElementById("category-modal").classList.remove("show");
  document.getElementById("category-form").reset();
}

// Guardar categoría
document.getElementById("category-form").onsubmit = async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("category-name").value.trim();
  const orden = parseInt(document.getElementById("category-order").value);
  const slug = nombre.toLowerCase().replace(/\s+/g, '-');
  await addDoc(collection(db, "categorias"), {
    nombre,
    slug,
    orden,
    activa: true
  });
  alert("Categoría agregada");
  cerrarModalCategoria();
  cargarCategorias();
  loadMenuCategories(); // actualiza menú
};

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
});
