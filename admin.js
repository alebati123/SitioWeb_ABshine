// Importaciones principales de Firebase
import { db, auth } from "./firebase-config.js";
import { 
    getDoc, doc, collection, getDocs, addDoc, 
    updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- VERIFICACIÓN DE ACCESO ---
// Esta es la función principal que actúa como guardia de seguridad.
async function verificarAccesoAdmin() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Nos desuscribimos para que solo se ejecute una vez al cargar la página.

            if (!user) {
                // Si no hay nadie logueado, no es admin.
                resolve(false);
                return;
            }

            try {
                // Buscamos el documento del usuario en Firestore para verificar su rol.
                const userDocRef = doc(db, "usuarios", user.email);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
                    // El usuario existe y tiene el rol 'admin'.
                    resolve(true);
                } else {
                    // El usuario está logueado pero no es admin.
                    resolve(false);
                }
            } catch (error) {
                console.error("Error crítico al verificar el rol:", error);
                resolve(false);
            }
        });
    });
}


// --- LÓGICA PRINCIPAL DE LA PÁGINA ---
// Esta función se ejecutará al cargar la página.
async function inicializarPaginaAdmin() {
    const esAdmin = await verificarAccesoAdmin();

    const adminContent = document.getElementById("admin-content");
    const adminLoginModal = document.getElementById("admin-login-modal");
    const accessDeniedMessage = document.getElementById("access-denied");

    if (esAdmin) {
        // --- MODO ADMINISTRADOR ---
        // Ocultamos el login y los mensajes de error, y mostramos el panel.
        if (adminLoginModal) adminLoginModal.classList.remove("show");
        if (accessDeniedMessage) accessDeniedMessage.style.display = 'none';
        if (adminContent) adminContent.style.display = "block";
        
        // ¡Importante! Ahora que sabemos que es admin, cargamos todo lo demás.
        initializeAdminPanel();

    } else {
        // --- MODO ACCESO DENEGADO ---
        // Ocultamos el contenido principal.
        if (adminContent) adminContent.style.display = "none";
        
        // Verificamos si hay un usuario logueado (pero no es admin)
        if (auth.currentUser) {
            // Si está logueado pero no es admin, lo redirigimos.
            alert("No tienes permisos para acceder a esta página.");
            window.location.href = 'index.html';
        } else {
            // Si no está logueado, mostramos el formulario de login.
            if (accessDeniedMessage) accessDeniedMessage.style.display = 'block';
            if (adminLoginModal) adminLoginModal.classList.add("show");
        }
    }
}

// --- INICIALIZACIÓN DEL PANEL (SOLO PARA ADMINS) ---

// Variables globales para la gestión del panel
let productos = [];
let categorias = [];
let editandoId = null;
let primeraCargaVentas = true;

// El resto de tu código se encapsula en esta función para que solo se ejecute si eres admin.
function initializeAdminPanel() {
    // Handler para el formulario de login de admin
    const adminLoginForm = document.getElementById("admin-login-form");
    if (adminLoginForm) {
        adminLoginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById("admin-email").value;
            const password = document.getElementById("admin-password").value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // La página se recargará y la verificación de acceso se hará de nuevo.
                window.location.reload(); 
            } catch (err) {
                alert("Credenciales de administrador incorrectas: " + err.message);
            }
        };
    }

    // Carga de datos y configuración de listeners
    loadCategories();
    cargarProductos();
    setupTabs();
    setupProductModal();
    setupCategoryModal();
    escucharNuevasVentas();

    document.getElementById("search-products").addEventListener("input", renderizarProductos);
    document.getElementById("filter-category").addEventListener("change", renderizarProductos);
}


// --- FUNCIONES DEL PANEL (sin cambios) ---

function escucharNuevasVentas() {
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        if (primeraCargaVentas) {
            primeraCargaVentas = false;
            return;
        }
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                mostrarNotificacionVenta(change.doc.data());
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
    const goToSalesBtn = document.createElement('button');
    goToSalesBtn.textContent = 'Ver Ventas';
    goToSalesBtn.onclick = () => {
        showTab('ventas');
        notification.remove();
    };
    notification.appendChild(goToSalesBtn);
    setTimeout(() => notification.remove(), 15000);
}

function setupTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => showTab(tab.getAttribute('data-tab')));
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    if (tabName === 'ventas') cargarVentas();
    if (tabName === 'categories') renderizarCategorias();
}

async function cargarVentas() {
    const lista = document.getElementById("ventas-list");
    if (!lista) return;
    lista.innerHTML = "<p>Cargando ventas...</p>";
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            lista.innerHTML = "<p>Aún no se ha realizado ninguna venta.</p>";
            return;
        }
        lista.innerHTML = snapshot.docs.map(doc => {
            const pedido = doc.data();
            const fecha = pedido.fecha ? pedido.fecha.toDate().toLocaleString('es-AR') : 'N/A';
            const satisfaccion = pedido.satisfaccion || 0;
            const starsHtml = satisfaccion ? `<span class="satisfaccion-badge" title="Satisfacción">${'★'.repeat(satisfaccion)}${'☆'.repeat(5 - satisfaccion)}</span>` : '<span class="satisfaccion-badge" style="opacity:.4">Sin calificar</span>';
            const itemsHtml = (pedido.items || []).map(item => `
            <div class="prod-item">
                <img src="${item.image || './imagenes/placeholder.jpg'}" alt="${item.name}">
                <div><div class="prod-name">${item.name}</div><div class="prod-qty">Cant: ${item.quantity} | $${(item.price || 0).toLocaleString()}</div></div>
            </div>`).join('');
            let entregaHtml = pedido.tipoEntrega === 'retiro' ? `<p><strong>Entrega:</strong> Retiro en local</p>` : `<p><strong>Entrega:</strong> Envío a domicilio</p><div class="datos-envio-container"><button class="btn-ver-envio" data-target="envio-details-${doc.id}">Ver datos <i class="fas fa-chevron-down"></i></button><div class="datos-envio-detalles" id="envio-details-${doc.id}">${(pedido.direccion && typeof pedido.direccion === 'object') ? `<p><strong>Recibe:</strong> ${pedido.direccion.nombre || ''} ${pedido.direccion.apellido || ''}</p><p><strong>Dir:</strong> ${pedido.direccion.direccion || ''}</p><p><strong>Ciudad:</strong> ${pedido.direccion.localidad || ''}</p><p><strong>Prov:</strong> ${pedido.direccion.provincia || ''}</p><p><strong>CP:</strong> ${pedido.direccion.cp || ''}</p><p><strong>Tel:</strong> ${pedido.direccion.telefono || ''}</p>` : '<p>Datos no disp.</p>'}</div></div>`;
            return `
            <div class="pedido-card">
                <p><strong>ID:</strong> ${pedido.orderId ? `#${pedido.orderId}` : doc.id}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Cliente:</strong> ${pedido.usuario || 'N/A'}</p>
                <p><strong>Total:</strong> $${(pedido.totalFinal || 0).toLocaleString()}</p>
                ${entregaHtml}
                <p style="display:flex;justify-content:space-between;align-items:center"><strong>Estado:</strong><span class="estado finalizado"><i class="fas fa-check-circle"></i> Finalizado</span>${starsHtml}</p>
                ${itemsHtml ? `<h4>Productos:</h4>${itemsHtml}` : ''}
            </div>`;
        }).join('');
        document.querySelectorAll('.btn-ver-envio').forEach(b => b.addEventListener('click', () => {
            const target = document.getElementById(b.dataset.target);
            if (target) {
                target.classList.toggle('show');
                b.querySelector('i')?.classList.toggle('rotated');
            }
        }));
    }, (error) => {
        console.error("Error al cargar ventas: ", error);
        lista.innerHTML = "<p>Error al cargar ventas.</p>";
    });
}

async function loadCategories() {
    try {
        const snapshot = await getDocs(collection(db, "categorias"));
        categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const productCategorySelect = document.getElementById("product-category");
        const filterCategorySelect = document.getElementById("filter-category");
        productCategorySelect.innerHTML = '<option value="">Seleccionar</option>';
        filterCategorySelect.innerHTML = '<option value="">Todas</option>';
        categorias.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.slug;
            opt.textContent = cat.nombre;
            productCategorySelect.appendChild(opt.cloneNode(true));
            filterCategorySelect.appendChild(opt);
        });
        renderizarCategorias();
    } catch (error) { console.error("Error cargando categorías:", error); }
}

function renderizarCategorias() {
    const container = document.getElementById("categories-list");
    if(!container) return;
    container.innerHTML = categorias.map(cat => `
        <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div><h4>${cat.nombre}</h4><p>Slug: ${cat.slug} | Activa: ${cat.activa ? 'Sí' : 'No'}</p></div>
            <div><button class="edit-btn" onclick="editarCategoria('${cat.id}')">Editar</button><button class="delete-btn" onclick="eliminarCategoria('${cat.id}')">Eliminar</button></div>
        </div>`).join('');
}

window.editarCategoria = (id) => {
    const cat = categorias.find(c => c.id === id);
    if (!cat) return;
    editandoId = id;
    document.getElementById("category-modal-title").innerText = "Editar Categoría";
    const form = document.getElementById("category-form");
    if(form) form.reset();
    document.getElementById("category-name").value = cat.nombre;
    document.getElementById("category-slug").value = cat.slug;
    document.getElementById("category-active").checked = cat.activa;
    document.getElementById("category-modal").classList.add("show");
};

window.eliminarCategoria = async (id) => {
    if (!confirm("¿Seguro que quieres eliminar esta categoría?")) return;
    try {
        await deleteDoc(doc(db, "categorias", id));
        alert("Categoría eliminada.");
        await loadCategories();
    } catch (error) { alert("No se pudo eliminar."); }
};

function setupCategoryModal() {
    const modal = document.getElementById("category-modal");
    if(!modal) return;
    const form = document.getElementById("category-form");
    document.getElementById("add-category-btn").onclick = () => {
        editandoId = null;
        if(form) form.reset();
        document.getElementById("category-modal-title").innerText = "Agregar Categoría";
        modal.classList.add("show");
    };
    const cerrar = () => modal.classList.remove("show");
    document.getElementById("close-modal-category").onclick = cerrar;
    document.getElementById("cancel-category-btn").onclick = cerrar;
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById("category-name").value,
            slug: document.getElementById("category-slug").value.toLowerCase().replace(/\s+/g, '-'),
            activa: document.getElementById("category-active").checked
        };
        if (!data.nombre || !data.slug) return alert("Completa Nombre e Identificador.");
        try {
            if (editandoId) await updateDoc(doc(db, "categorias", editandoId), data);
            else await addDoc(collection(db, "categorias"), data);
            alert("Categoría guardada.");
            cerrar();
            await loadCategories();
        } catch (error) { alert("No se pudo guardar."); }
    };
}

const cargarProductos = async () => {
    try {
        const snapshot = await getDocs(collection(db, "productos"));
        productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarProductos();
    } catch (error) { console.error("Error cargando productos:", error); }
};

const renderizarProductos = () => {
    const cont = document.getElementById("products-grid");
    if(!cont) return;
    const filtro = document.getElementById("search-products").value.toLowerCase();
    const catFiltro = document.getElementById("filter-category").value;
    const filtrados = productos.filter(p => (p.name || '').toLowerCase().includes(filtro) && (catFiltro === "" || p.category === catFiltro));
    if (filtrados.length === 0) {
        cont.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }
    cont.innerHTML = filtrados.map(p => `
    <div class="product-card-admin">
      <img src="${p.image || './imagenes/placeholder.jpg'}" alt="${p.name}" class="product-image-admin">
      <div class="product-info-admin">
        <span class="product-category">${p.category}</span><h3 class="product-name-admin">${p.name}</h3>
        <p class="product-details-admin">${p.details || ''}</p><p class="product-price-admin">$${(p.price || 0).toLocaleString()}</p>
        <div class="product-actions"><button class="edit-btn" data-id="${p.id}">Editar</button><button class="delete-btn" data-id="${p.id}">Eliminar</button></div>
      </div>
    </div>`).join("");
    cont.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => editarProducto(b.dataset.id));
    cont.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => eliminarProducto(b.dataset.id));
};

window.editarProducto = (id) => {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;
    editandoId = id;
    document.getElementById("modal-title").innerText = "Editar Producto";
    const form = document.getElementById("product-form");
    if(form) form.reset();
    document.getElementById("product-name").value = prod.name;
    document.getElementById("product-category").value = prod.category;
    document.getElementById("product-price").value = prod.price;
    document.getElementById("product-details").value = prod.details || '';
    document.getElementById("product-image").value = prod.image || '';
    document.getElementById("product-modal").classList.add("show");
};

window.eliminarProducto = async (id) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
        await deleteDoc(doc(db, "productos", id));
        alert("Producto eliminado.");
        await cargarProductos();
    } catch (error) { alert("No se pudo eliminar."); }
};

function setupProductModal() {
    const modal = document.getElementById("product-modal");
    if(!modal) return;
    const form = document.getElementById("product-form");
    document.getElementById("add-product-btn").onclick = () => {
        editandoId = null;
        if(form) form.reset();
        document.getElementById("modal-title").innerText = "Agregar Producto";
        modal.classList.add("show");
    };
    const cerrar = () => modal.classList.remove("show");
    document.getElementById("close-modal-product").onclick = cerrar;
    document.getElementById("cancel-product-btn").onclick = cerrar;
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById("product-name").value,
            category: document.getElementById("product-category").value,
            price: parseFloat(document.getElementById("product-price").value),
            details: document.getElementById("product-details").value,
            image: document.getElementById("product-image").value
        };
        if (!data.name || !data.category || isNaN(data.price)) return alert("Completa Nombre, Categoría y Precio.");
        try {
            if (editandoId) await updateDoc(doc(db, "productos", editandoId), data);
            else await addDoc(collection(db, "productos"), data);
            alert("Producto guardado.");
            cerrar();
            await cargarProductos();
        } catch (error) { alert("No se pudo guardar."); }
    };
}


// --- ¡PUNTO DE ENTRADA! ---
// Al cargar el script, se inicia la verificación de la página.
document.addEventListener('DOMContentLoaded', inicializarPaginaAdmin);

