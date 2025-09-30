// Import db and auth from your config file
import { db, auth } from "./firebase-config.js";

// Import necessary Firebase functions directly from the SDKs
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// Global variables
let productos = [];
let editandoId = null;

// --- AUTHENTICATION ---
// Check user auth state to grant or deny access to the admin panel
onAuthStateChanged(auth, user => {
    const accessDenied = document.getElementById("access-denied");
    const adminContent = document.getElementById("admin-content");
    const adminLoginModal = document.getElementById("admin-login-modal");

    // For this project, we check for a specific admin email.
    if (user && user.email === 'admin@abshine.com') {
        adminLoginModal.classList.remove("show");
        accessDenied.style.display = "none";
        adminContent.style.display = "block";
        initializeAdminPanel();
    } else {
        adminLoginModal.classList.add("show");
        accessDenied.style.display = "block";
        adminContent.style.display = "none";
    }
});

// Admin login form handler
document.getElementById("admin-login-form").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will automatically handle the UI changes after successful login.
    } catch (err) {
        alert("Credenciales de administrador incorrectas: " + err.message);
    }
};

// --- INITIALIZATION ---
// This function runs once the admin is authenticated
function initializeAdminPanel() {
    loadCategories();
    cargarProductos();
    setupTabs();
    setupProductModal();

    // Setup filter listeners
    document.getElementById("search-products").addEventListener("input", renderizarProductos);
    document.getElementById("filter-category").addEventListener("change", renderizarProductos);
}

// --- TAB MANAGEMENT ---
function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            showTab(tabName);
        });
    });
}

function showTab(tabName) {
    // Hide all tab contents and deactivate all tab buttons
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show the selected tab content and activate its button
    document.getElementById(tabName + '-tab').classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load data for the 'ventas' tab when it's selected
    if (tabName === 'ventas') {
        cargarVentas();
    }
}

// --- SALES (VENTAS) TAB ---
async function cargarVentas() {
    const lista = document.getElementById("ventas-list");
    if (!lista) {
        console.error("El contenedor de ventas #ventas-list no existe.");
        return;
    }
    lista.innerHTML = "<p>Cargando ventas...</p>";

    const q = query(
        collection(db, "pedidos"),
        orderBy("fecha", "desc") // Order by most recent sales
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            lista.innerHTML = "<p>Aún no se ha realizado ninguna venta.</p>";
            return;
        }

        const ventasHtml = snapshot.docs.map(doc => {
            const pedido = doc.data();
            const fecha = pedido.fecha ? pedido.fecha.toDate().toLocaleString('es-AR') : 'Fecha no disponible';

            const itemsHtml = (pedido.items || []).map(item => `
                <div class="prod-item">
                    <img src="${item.image || './imagenes/placeholder.jpg'}" alt="${item.name}">
                    <div>
                        <div class="prod-name">${item.name}</div>
                        <div class="prod-qty">Cantidad: ${item.quantity} | Precio: $${(item.price || 0).toLocaleString()}</div>
                    </div>
                </div>
            `).join('');

            return `
                <div class="pedido-card">
                    <p><strong>ID Pedido:</strong> ${doc.id}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Cliente:</strong> ${pedido.usuario || 'No especificado'}</p>
                    <p><strong>Total:</strong> $${(pedido.totalFinal || 0).toLocaleString()}</p>
                    <p><strong>Entrega:</strong> ${pedido.tipoEntrega === 'retiro' ? 'Retiro en local' : 'Envío a domicilio'}</p>
                    <p><strong>Estado:</strong> <span class="estado finalizado"><i class="fas fa-check-circle"></i></span></p>
                    ${itemsHtml ? `<h4>Productos:</h4>${itemsHtml}` : ''}
                </div>
            `;
        }).join('');

        lista.innerHTML = ventasHtml;

    }, (error) => {
        console.error("Error al cargar las ventas: ", error);
        lista.innerHTML = "<p>Ocurrió un error al cargar las ventas. Revisa la consola para más detalles.</p>";
    });
}

// --- PRODUCTS TAB ---
async function loadCategories() {
    try {
        const snapshot = await getDocs(collection(db, "categorias"));
        const productCategorySelect = document.getElementById("product-category");
        const filterCategorySelect = document.getElementById("filter-category");

        productCategorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
        filterCategorySelect.innerHTML = '<option value="">Todas las categorías</option>';

        snapshot.forEach(doc => {
            const categoria = doc.data();
            const opt = document.createElement("option");
            opt.value = categoria.slug;
            opt.textContent = categoria.nombre;
            productCategorySelect.appendChild(opt.cloneNode(true));
            filterCategorySelect.appendChild(opt);
        });
    } catch (error) {
         console.error("Error cargando categorías en el panel:", error);
    }
}

const cargarProductos = async () => {
    try {
        const snapshot = await getDocs(collection(db, "productos"));
        productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarProductos();
    } catch (error) {
        console.error("Error cargando productos: ", error);
    }
};

const renderizarProductos = () => {
    const contenedor = document.getElementById("products-grid");
    const textoFiltro = document.getElementById("search-products").value.trim().toLowerCase();
    const catFiltro = document.getElementById("filter-category").value;

    const productosFiltrados = productos.filter(p =>
        (p.name || '').toLowerCase().includes(textoFiltro) &&
        (catFiltro === "" || p.category === catFiltro)
    );

    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron productos que coincidan con los filtros.</p>";
        return;
    }

    contenedor.innerHTML = productosFiltrados.map(p => `
    <div class="product-card-admin">
      <img src="${p.image || './imagenes/placeholder.jpg'}" alt="${p.name}" class="product-image-admin">
      <div class="product-info-admin">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name-admin">${p.name}</h3>
        <p class="product-details-admin">${p.details || ''}</p>
        <p class="product-price-admin">$${(p.price || 0).toLocaleString()}</p>
        <div class="product-actions">
          <button class="edit-btn" data-id="${p.id}">Editar</button>
          <button class="delete-btn" data-id="${p.id}">Eliminar</button>
        </div>
      </div>
    </div>
  `).join("");

    document.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = () => editarProducto(btn.dataset.id));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.onclick = () => eliminarProducto(btn.dataset.id));
};

window.editarProducto = (id) => {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    editandoId = id;
    document.getElementById("modal-title").innerText = "Editar Producto";
    document.getElementById("product-form").reset(); // Reset first
    document.getElementById("product-name").value = producto.name;
    document.getElementById("product-category").value = producto.category;
    document.getElementById("product-price").value = producto.price;
    document.getElementById("product-details").value = producto.details || '';
    document.getElementById("product-image").value = producto.image || '';
    document.getElementById("product-modal").classList.add("show");
};

window.eliminarProducto = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
    try {
        await deleteDoc(doc(db, "productos", id));
        alert("Producto eliminado correctamente.");
        await cargarProductos(); // Recargar productos después de eliminar
    } catch (error) {
        console.error("Error eliminando producto: ", error);
        alert("No se pudo eliminar el producto.");
    }
};

function setupProductModal() {
    const modal = document.getElementById("product-modal");
    const form = document.getElementById("product-form");

    document.getElementById("add-product-btn").onclick = () => {
        editandoId = null;
        form.reset();
        document.getElementById("modal-title").innerText = "Agregar Producto";
        modal.classList.add("show");
    };

    const cerrarModal = () => modal.classList.remove("show");
    document.getElementById("close-modal").onclick = cerrarModal;
    document.getElementById("cancel-btn").onclick = cerrarModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById("product-name").value,
            category: document.getElementById("product-category").value,
            price: parseFloat(document.getElementById("product-price").value),
            details: document.getElementById("product-details").value,
            image: document.getElementById("product-image").value
        };

        if (!data.name || !data.category || isNaN(data.price)) {
            alert("Por favor, completa los campos obligatorios: Nombre, Categoría y Precio.");
            return;
        }

        try {
            if (editandoId) {
                await updateDoc(doc(db, "productos", editandoId), data);
                alert("Producto actualizado correctamente.");
            } else {
                await addDoc(collection(db, "productos"), data);
                alert("Producto agregado correctamente.");
            }
            cerrarModal();
            await cargarProductos(); // Recargar productos después de guardar
        } catch (error) {
            console.error("Error guardando producto: ", error);
            alert("No se pudo guardar el producto.");
        }
    };
}

