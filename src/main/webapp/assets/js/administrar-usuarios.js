"use strict";
const api = "../../api/administracion/usuarios";
const filas = document.querySelector("#filas");
const estado = document.querySelector("#estado");
const dialogo = document.querySelector("#dialogo");
const formulario = document.querySelector("#formulario");
const guardar = document.querySelector("#guardar");
const roles = {1: "Administrador", 2: "Supervisor", 3: "Operario"};
const titulos = {editar: "Editar", clave: "Cambiar contraseña", borrar: "Borrar"};
let seleccion;

async function solicitar(opciones) {
    const respuesta = await fetch(api, opciones);
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo completar la solicitud.");
    return datos;
}

function abrir(accion, usuario) {
    seleccion = {accion, id: usuario.id};
    formulario.reset();
    formulario.querySelector("#error").textContent = "";
    document.querySelector("#titulo").textContent = titulos[accion];
    document.querySelector("#cuenta").textContent = accion === "borrar"
        ? "¿Desea borrar la cuenta " + usuario.usuario + "?" : usuario.usuario;
    for (const [selector, activa] of [["#perfil", accion === "editar"], ["#seguridad", accion === "clave"]]) {
        const grupo = formulario.querySelector(selector);
        grupo.disabled = !activa;
        grupo.hidden = !activa;
    }
    for (const nombre of ["nombre", "usuario", "correo"]) formulario.elements[nombre].value = usuario[nombre];
    guardar.textContent = accion === "borrar" ? "Confirmar borrado" : "Guardar";
    dialogo.showModal();
}

async function cargar(mensaje = "") {
    try {
        const datos = await solicitar();
        filas.replaceChildren();
        for (const usuario of datos.usuarios) {
            const fila = filas.insertRow();
            for (const valor of [usuario.nombre, usuario.usuario, usuario.correo, roles[usuario.rol] || usuario.rol]) {
                fila.insertCell().textContent = valor;
            }
            const acciones = fila.insertCell();
            for (const [accion, texto] of Object.entries(titulos)) {
                const boton = document.createElement("button");
                boton.type = "button";
                boton.textContent = texto;
                boton.className = "btn btn-sm " + (accion === "borrar" ? "btn-outline-danger" : "btn-outline-secondary");
                boton.disabled = accion === "borrar" && usuario.id === datos.actual;
                boton.addEventListener("click", () => abrir(accion, usuario));
                acciones.append(boton);
            }
        }
        estado.textContent = mensaje || (datos.usuarios.length ? "" : "No hay usuarios registrados.");
    } catch (error) {
        filas.replaceChildren();
        estado.textContent = (mensaje ? mensaje + " " : "") + error.message;
    }
}

document.querySelector("#cancelar").onclick = () => dialogo.close();
dialogo.oncancel = evento => { if (guardar.disabled) evento.preventDefault(); };
dialogo.onclose = () => formulario.reset();
formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardar.disabled) return;
    const parametros = new URLSearchParams(new FormData(formulario));
    parametros.set("accion", seleccion.accion);
    parametros.set("id", seleccion.id);
    guardar.disabled = true;
    const cancelar = document.querySelector("#cancelar");
    cancelar.disabled = true;
    try {
        await solicitar({method: "POST", headers: {"X-CSRF-Token": sessionStorage.getItem("tokenCsrf") || ""}, body: parametros});
        dialogo.close();
        await cargar("Cambio guardado.");
    } catch (error) {
        document.querySelector("#error").textContent = error.message;
    } finally {
        guardar.disabled = false;
        cancelar.disabled = false;
    }
});
cargar();

