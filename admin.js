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
    onSnapshot,
    serverTimestamp // Import serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// Global variables
let productos = [];
let categorias = [];
let editandoId = null;
let primeraCargaVentas = true; // Variable para controlar la primera carga de ventas

// --- AUTHENTICATION ---
onAuthStateChanged(auth, user => {
    const accessDenied = document.getElementById("access-denied");
    const adminContent = document.getElementById("admin-content");
    const adminLoginModal = document.getElementById("admin-login-modal");

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
    } catch (err) {
        alert("Credenciales de administrador incorrectas: " + err.message);
    }
};

// --- INITIALIZATION ---
function initializeAdminPanel() {
    loadCategories();
    cargarProductos();
    setupTabs();
    setupProductModal();
    setupCategoryModal();
    escucharNuevasVentas(); // Inicia el listener de nuevas ventas

    document.getElementById("search-products").addEventListener("input", renderizarProductos);
    document.getElementById("filter-category").addEventListener("change", renderizarProductos);
}

// --- NEW SALE NOTIFICATION ---
function escucharNuevasVentas() {
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        if (primeraCargaVentas) {
            primeraCargaVentas = false;
            return; // No hacer nada en la carga inicial de datos
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const nuevaVenta = change.doc.data();
                mostrarNotificacionVenta(nuevaVenta);
            }
        });
    });
}

function mostrarNotificacionVenta(venta) {
    const container = document.body;
    const notification = document.createElement("div");
    notification.className = 'toast-notification venta';
    notification.innerHTML = `
        <i class="fas fa-dollar-sign"></i>
        <div>
            <strong>¡Nueva Venta!</strong><br>
            Pedido #${venta.orderId} de ${venta.usuario} por $${venta.totalFinal.toLocaleString()}
        </div>
    `;
    
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_92080a471c.mp3?filename=notification-for-game-app-112128.mp3');
    audio.play();

    container.appendChild(notification);
    
    // Añadir botón para ir a ventas
    const goToSalesBtn = document.createElement('button');
    goToSalesBtn.textContent = 'Ver Ventas';
    goToSalesBtn.onclick = () => {
        showTab('ventas');
        notification.remove();
    };
    notification.appendChild(goToSalesBtn);


    setTimeout(() => {
        notification.remove();
    }, 15000);
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
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(tabName + '-tab').classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'ventas') {
        cargarVentas();
    }
    if (tabName === 'categories') {
        renderizarCategorias();
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
        orderBy("fecha", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            lista.innerHTML = "<p>Aún no se ha realizado ninguna venta.</p>";
            return;
        }

        const ventasHtml = snapshot.docs.map(doc => {
            const pedido = doc.data();
            const fecha = pedido.fecha ? pedido.fecha.toDate().toLocaleString('es-AR') : 'Fecha no disponible';
            const satisfaccion = pedido.satisfaccion || 0;
            const starsHtml = satisfaccion ?
                `<span class="satisfaccion-badge" title="Satisfacción del cliente">
               ${'★'.repeat(satisfaccion)}${'☆'.repeat(5 - satisfaccion)}
             </span>` :
                '<span class="satisfaccion-badge" style="opacity:.4">Sin calificar</span>';

            const itemsHtml = (pedido.items || []).map(item => `
            <div class="prod-item">
                <img src="${item.image || './imagenes/placeholder.jpg'}" alt="${item.name}">
                <div>
                    <div class="prod-name">${item.name}</div>
                    <div class="prod-qty">Cantidad: ${item.quantity} | Precio: $${(item.price || 0).toLocaleString()}</div>
                </div>
            </div>
        `).join('');

            let entregaHtml = '';
            if (pedido.tipoEntrega === 'retiro') {
                entregaHtml = `<p><strong>Entrega:</strong> Retiro en local</p>`;
            } else {
                let datosEnvioContent = '<p>Datos de envío no disponibles.</p>';
                const datosFuente = pedido.direccion;

                if (datosFuente && typeof datosFuente === 'object') {
                     datosEnvioContent = `
                        <p><strong>Recibe:</strong> ${datosFuente.nombre || ''} ${datosFuente.apellido || ''}</p>
                        <p><strong>Dirección:</strong> ${datosFuente.direccion || 'No especificada'}</p>
                        <p><strong>Ciudad:</strong> ${datosFuente.localidad || 'No especificada'}</p>
                        <p><strong>Provincia:</strong> ${datosFuente.provincia || 'No especificada'}</p>
                        <p><strong>CP:</strong> ${datosFuente.cp || 'No especificado'}</p>
                        <p><strong>Teléfono:</strong> ${datosFuente.telefono || 'No especificado'}</p>
                    `;
                }

                entregaHtml = `
                    <p><strong>Entrega:</strong> Envío a domicilio</p>
                    <div class="datos-envio-container">
                        <button class="btn-ver-envio" data-target="envio-details-${doc.id}">
                            Ver datos de envío <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="datos-envio-detalles" id="envio-details-${doc.id}">
                            ${datosEnvioContent}
                        </div>
                    </div>
                `;
            }

            return `
            <div class="pedido-card">
                <p><strong>ID Pedido:</strong> ${pedido.orderId ? `#${pedido.orderId}` : doc.id}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Cliente:</strong> ${pedido.usuario || 'No especificado'}</p>
                <p><strong>Total:</strong> $${(pedido.totalFinal || 0).toLocaleString()}</p>
                ${entregaHtml} 
                <p style="display:flex;justify-content:space-between;align-items:center">
                  <strong>Estado:</strong>
                  <span class="estado finalizado"><i class="fas fa-check-circle"></i> Finalizado</span>
                  ${starsHtml}
                </p>
                ${itemsHtml ? `<h4>Productos:</h4>${itemsHtml}` : ''}
            </div>
        `;
        }).join('');

        lista.innerHTML = ventasHtml;

        document.querySelectorAll('.btn-ver-envio').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const details = document.getElementById(targetId);
                const icon = button.querySelector('i');
                if (details) {
                    details.classList.toggle('show');
                    if (icon) {
                        icon.classList.toggle('rotated');
                    }
                }
            });
        });

    }, (error) => {
        console.error("Error al cargar las ventas: ", error);
        lista.innerHTML = "<p>Ocurrió un error al cargar las ventas. Revisa la consola para más detalles.</p>";
    });
}

// --- CATEGORIES TAB ---
async function loadCategories() {
    try {
        const snapshot = await getDocs(collection(db, "categorias"));
        categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const productCategorySelect = document.getElementById("product-category");
        const filterCategorySelect = document.getElementById("filter-category");

        productCategorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
        filterCategorySelect.innerHTML = '<option value="">Todas las categorías</option>';

        categorias.forEach(categoria => {
            const opt = document.createElement("option");
            opt.value = categoria.slug;
            opt.textContent = categoria.nombre;
            productCategorySelect.appendChild(opt.cloneNode(true));
            filterCategorySelect.appendChild(opt);
        });
        
        renderizarCategorias();

    } catch (error) {
        console.error("Error cargando categorías en el panel:", error);
    }
}

function renderizarCategorias() {
    const container = document.getElementById("categories-list");
    container.innerHTML = categorias.map(cat => `
        <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div>
                <h4>${cat.nombre}</h4>
                <p>Slug: ${cat.slug} | Activa: ${cat.activa ? 'Sí' : 'No'}</p>
            </div>
            <div>
                <button class="edit-btn" onclick="editarCategoria('${cat.id}')">Editar</button>
                <button class="delete-btn" onclick="eliminarCategoria('${cat.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

window.editarCategoria = (id) => {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) return;

    editandoId = id;
    document.getElementById("category-modal-title").innerText = "Editar Categoría";
    document.getElementById("category-form").reset();
    document.getElementById("category-name").value = categoria.nombre;
    document.getElementById("category-slug").value = categoria.slug;
    document.getElementById("category-active").checked = categoria.activa;
    document.getElementById("category-modal").classList.add("show");
};

window.eliminarCategoria = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta categoría? Esto no se puede deshacer.")) return;
    try {
        await deleteDoc(doc(db, "categorias", id));
        alert("Categoría eliminada correctamente.");
        await loadCategories(); // Recargar
    } catch (error) {
        console.error("Error eliminando categoría: ", error);
        alert("No se pudo eliminar la categoría.");
    }
};


function setupCategoryModal() {
    const modal = document.getElementById("category-modal");
    const form = document.getElementById("category-form");

    document.getElementById("add-category-btn").onclick = () => {
        editandoId = null;
        form.reset();
        document.getElementById("category-modal-title").innerText = "Agregar Categoría";
        modal.classList.add("show");
    };

    const cerrarModal = () => modal.classList.remove("show");
    document.getElementById("close-modal-category").onclick = cerrarModal;
    document.getElementById("cancel-category-btn").onclick = cerrarModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById("category-name").value,
            slug: document.getElementById("category-slug").value.toLowerCase().replace(/\s+/g, '-'),
            activa: document.getElementById("category-active").checked
        };

        if (!data.nombre || !data.slug) {
            alert("Por favor, completa Nombre e Identificador.");
            return;
        }

        try {
            if (editandoId) {
                await updateDoc(doc(db, "categorias", editandoId), data);
                alert("Categoría actualizada.");
            } else {
                await addDoc(collection(db, "categorias"), data);
                alert("Categoría agregada.");
            }
            cerrarModal();
            await loadCategories();
        } catch (error) {
            console.error("Error guardando categoría: ", error);
            alert("No se pudo guardar la categoría.");
        }
    };
}


// --- PRODUCTS TAB ---
const cargarProductos = async () => {
    try {
        const snapshot = await getDocs(collection(db, "productos"));
        productos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
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
    document.getElementById("close-modal-product").onclick = cerrarModal;
    document.getElementById("cancel-product-btn").onclick = cerrarModal;

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
