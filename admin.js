import { db, auth, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onAuthStateChanged, signInWithEmailAndPassword } from "./firebase-config.js";

let productos = [];
let editandoId = null;

const cargarProductos = async () => {
  const snapshot = await getDocs(collection(db, "productos"));
  productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderizarProductos();
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

  document.getElementById("product-form").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("product-name").value,
      category: document.getElementById("product-category").value,
      price: parseFloat(document.getElementById("product-price").value),
      details: document.getElementById("product-details").value,
      image: document.getElementById("product-image").value
    };
    await updateDoc(doc(db, "productos", id), data);
    alert("Producto actualizado");
    cerrarModal();
    cargarProductos();
  };
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

  document.getElementById("product-form").onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("product-name").value,
      category: document.getElementById("product-category").value,
      price: parseFloat(document.getElementById("product-price").value),
      details: document.getElementById("product-details").value,
      image: document.getElementById("product-image").value
    };
    await addDoc(collection(db, "productos"), data);
    alert("Producto agregado");
    cerrarModal();
    cargarProductos();
  };
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
    cargarProductos();
  }
});