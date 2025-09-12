function muestra_oculta(id) {
    let div = document.getElementById(id)
    let boton = document.getElementById('toggleBoton');

    if (div.style.display == "none") {
        div.style.display = "flex";
        boton.innerText = "-";  
    }
    else {
        div.style.display = "none";
        boton.innerText = "+";
    }
}

