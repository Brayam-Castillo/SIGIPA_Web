"use strict";

(async function () {
    const formulario = document.querySelector("#form-inventario");
    if (!formulario || !formulario.hasAttribute("data-api"))
        return;

    const tabla = document.querySelector("#tabla-inventario");
    const filas = document.querySelector("#filas-inventario");
    const estado = document.querySelector("#inventario-vacio");
    const mensaje = document.querySelector("#mensaje-inventario");
    const guardar = document.querySelector("#guardar-inventario");
    const cancelar = document.querySelector("#cancelar-inventario");

    const grupoSelector = document.querySelector("#grupo-insumo-existente");
    const selector = document.querySelector("#insumo-existente");
    const nombre = document.querySelector("#nombre-insumo");
    const unidad = document.querySelector("#unidad-medida");
    const cantidad = document.querySelector("#cantidad-disponible");
    const minimo = document.querySelector("#umbral-minimo");

    const opciones = formulario.querySelectorAll(
            'input[name="accion-inventario"]'
            );

    const campos = [nombre, unidad, cantidad, minimo];
    const url = new URL("../../inventario", window.location.href);

    let inventario = [];
    let cargado = false;
    let enviando = false;

    formulario.reset();
    nombre.readOnly = false;

    function accionActual() {
        return formulario.querySelector(
                'input[name="accion-inventario"]:checked'
                ).value;
    }

    /**
     * Ajustar los controles según la acción y el estado de la petición.
     */
    function ajustarControles() {
        const actualizar = accionActual() === "actualizar";
        const bloquear = !cargado || enviando;

        grupoSelector.hidden = !actualizar;
        selector.disabled = bloquear || !actualizar;

        campos.forEach(function (campo) {
            campo.disabled = bloquear;
        });

        opciones.forEach(function (opcion) {
            opcion.disabled = bloquear ||
                    (opcion.value === "actualizar" && inventario.length === 0);
        });

        guardar.disabled = bloquear;
        guardar.textContent = enviando
                ? "Guardando…"
                : actualizar ? "Actualizar insumo" : "Guardar insumo";

        cancelar.disabled = enviando;

        filas.querySelectorAll("button").forEach(function (boton) {
            boton.disabled = bloquear;
        });
    }

    opciones.forEach(function (opcion) {
        opcion.addEventListener("change", function () {
            selector.value = "";

            campos.forEach(function (campo) {
                campo.value = "";
            });

            mensaje.textContent = "";
            ajustarControles();
        });
    });

    /**
     * Completar el formulario con los datos del insumo seleccionado.
     */
    selector.addEventListener("change", function () {
        const insumo = inventario.find(function (elemento) {
            return String(elemento.idInventario) === selector.value;
        });

        nombre.value = insumo ? insumo.nombreInsumo : "";
        cantidad.value = insumo ? insumo.cantidadDisponible : "";
        minimo.value = insumo ? insumo.nivelMinimo : "";

        // La opción del formulario usa "l" y MariaDB devuelve "L".
        unidad.value = insumo
                ? (insumo.unidad === "L" ? "l" : insumo.unidad)
                : "";
    });

    cancelar.addEventListener("click", function () {
        if (!enviando) {
            window.location.assign("panel-supervisor.html");
        }
    });

    /**
     * Consultar el inventario y actualizar la tabla y el selector.
     */
    async function cargarInventario() {
        const respuesta = await fetch(url, {
            headers: {Accept: "application/json"},
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar el inventario.");
        }

        const insumos = await respuesta.json();

        if (!Array.isArray(insumos)) {
            throw new Error("La respuesta del servidor no es válida.");
        }

        inventario = insumos;
        filas.replaceChildren();
        selector.replaceChildren(new Option("Seleccionar insumo", ""));

        inventario.forEach(function (insumo) {
            const fila = document.createElement("tr");

            [
                insumo.nombreInsumo,
                insumo.cantidadDisponible,
                insumo.nivelMinimo,
                insumo.unidad
            ].forEach(function (valor) {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            const acciones = document.createElement("td");
            const botonEliminar = document.createElement("button");

            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-outline-danger btn-sm";
            botonEliminar.textContent = "Eliminar";
            botonEliminar.setAttribute(
                    "aria-label",
                    "Eliminar " + insumo.nombreInsumo
                    );

            botonEliminar.addEventListener("click", function () {
                eliminarInsumo(insumo);
            });

            acciones.appendChild(botonEliminar);
            fila.appendChild(acciones);

            filas.appendChild(fila);

            selector.add(new Option(
                    insumo.nombreInsumo,
                    String(insumo.idInventario)
                    ));
        });

        tabla.hidden = inventario.length === 0;
        estado.hidden = inventario.length > 0;
        estado.textContent = "No hay insumos registrados en la base de datos.";
    }

    /**
     * Registrar o actualizar según la opción seleccionada.
     */
    formulario.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (enviando || !cargado || !formulario.reportValidity())
            return;

        const accion = accionActual();
        const datos = new URLSearchParams(new FormData(formulario));
        datos.set("accion-inventario", accion);

        if (accion === "actualizar") {
            datos.set("id-inventario", selector.value);
        }

        enviando = true;
        ajustarControles();
        mensaje.textContent = "Guardando los datos…";

        try {
            const respuesta = await fetch(url, {
                method: "POST",
                headers: {Accept: "application/json"},
                body: datos
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                        resultado.mensaje || "No se pudo guardar el insumo."
                        );
            }

            formulario.reset();
            mensaje.textContent = resultado.mensaje;

            try {
                await cargarInventario();
            } catch (error) {
                mensaje.textContent =
                        "Los datos se guardaron, pero no se pudo actualizar " +
                        "la tabla. Recarga la página; no repitas la operación.";
                console.error(error);
            }

        } catch (error) {
            mensaje.textContent = error.message + " Los campos se conservaron.";
            console.error(error);

        } finally {
            enviando = false;
            ajustarControles();
        }
    });

    /**
     * Eliminar el insumo después de confirmar la acción.
     */
    async function eliminarInsumo(insumo) {
        if (enviando || !cargado)
            return;

        const confirmar = window.confirm(
                '¿Desea eliminar el insumo "' + insumo.nombreInsumo + '"?'
                );

        if (!confirmar)
            return;

        const datos = new URLSearchParams({
            "accion-inventario": "eliminar",
            "id-inventario": String(insumo.idInventario)
        });

        enviando = true;
        ajustarControles();
        mensaje.textContent = "Eliminando el insumo…";

        try {
            const respuesta = await fetch(url, {
                method: "POST",
                headers: {Accept: "application/json"},
                body: datos
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                        resultado.mensaje || "No se pudo eliminar el insumo."
                        );
            }

            formulario.reset();
            mensaje.textContent = resultado.mensaje;

            try {
                await cargarInventario();
            } catch (error) {
                mensaje.textContent =
                        "El insumo se eliminó, pero no se pudo actualizar " +
                        "la tabla. Recarga la página.";
                console.error(error);
            }

        } catch (error) {
            mensaje.textContent = error.message;
            console.error(error);

        } finally {
            enviando = false;
            ajustarControles();
        }
    }

    // Consultar los datos al abrir la página.
    ajustarControles();
    tabla.hidden = true;
    estado.hidden = false;
    estado.textContent = "Consultando el inventario…";

    try {
        await cargarInventario();
        cargado = true;
        ajustarControles();
        mensaje.textContent = "Inventario cargado desde MariaDB.";
    } catch (error) {
        estado.textContent = "No se pudo cargar el inventario.";
        mensaje.textContent = "Recarga la página para reintentar.";
        console.error(error);
    }
})();