import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebase-firestore.js";
import { db } from "./firebase-config.js";

const form  = document.getElementById('perfil-form');
const email = document.getElementById('email');
const msg   = document.getElementById('msg');
const sel   = form.provincia;

// 1. Cargar provincias
import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(
  ({ collection, getDocs }) => {
    getDocs(collection(db, 'provincias')).then(snap => {
      sel.innerHTML = '<option value="">Seleccioná</option>';
      snap.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id; opt.textContent = d.data().nombre;
        sel.appendChild(opt);
      });
    });
  }
);

// 2. Auth y precarga
onAuthStateChanged(getAuth(), async user => {
  if (!user) return window.location = 'index.html';
  email.value = user.email;
  const snap = await getDoc(doc(db, 'clientes', user.email));
  if (snap.exists()) {
    Object.keys(snap.data()).forEach(k => form[k] && (form[k].value = snap.data()[k] || ''));
  }
});

// 3. Guardar
form.addEventListener('submit', async e => {
  e.preventDefault();
  const user = getAuth().currentUser;
  const data = Object.fromEntries(new FormData(form));
  data.updatedAt = serverTimestamp();
  try {
    await setDoc(doc(db, 'clientes', user.email), data, { merge: true });
    msg.textContent = '✅ Datos guardados'; msg.className = 'msg ok';
  } catch (err) {
    msg.textContent = '❌ ' + err.message; msg.className = 'msg err';
  }
});