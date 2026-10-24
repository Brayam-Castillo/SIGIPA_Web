// Acceso mediante el servicio web de SIGIPA.
const formularioAcceso = document.querySelector("#form-acceso");

if (formularioAcceso) {
    const campoUsuario = formularioAcceso.querySelector("#usuario");
    const campoContrasena = formularioAcceso.querySelector("#contrasena");
    const boton = formularioAcceso.querySelector('button[type="submit"]');
    const textoBoton = boton.textContent;

    let mensaje = document.querySelector("#mensaje-acceso");

    if (!mensaje) {
        mensaje = document.createElement("p");
        mensaje.id = "mensaje-acceso";
        mensaje.setAttribute("role", "status");
        formularioAcceso.insertBefore(mensaje, boton);
    }

    const destinos = new Map([
        [1, "pages/administrador/panel-administrador.html"],
        [2, "pages/supervisor/panel-supervisor.html"],
        [3, "pages/operario/panel-operario.html"]
    ]);

    formularioAcceso.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (boton.disabled || !formularioAcceso.reportValidity())
            return;

        mensaje.hidden = true;
        mensaje.textContent = "";
        mensaje.className = "small text-danger mt-3";
        boton.disabled = true;
        boton.textContent = "Comprobando...";

        try {
            sessionStorage.removeItem("tokenCsrf");

            const respuesta = await fetch(
                    formularioAcceso.getAttribute("action") || "api/acceso",
                    {
                        method: "POST",
                        credentials: "same-origin",
                        body: new URLSearchParams({
                            nombreUsuario: campoUsuario.value.trim(),
                            contrasena: campoContrasena.value
                        })
                    }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                mensaje.textContent = datos.mensaje
                        || "No se pudo iniciar sesión. HTTP " + respuesta.status;
                mensaje.hidden = false;
                return;
            }

            const destino = destinos.get(Number(datos.idRol));

            if (!destino || typeof datos.tokenCsrf !== "string"
                    || datos.tokenCsrf.length === 0) {
                mensaje.textContent = "La respuesta de acceso está incompleta.";
                mensaje.hidden = false;
                return;
            }

            // Conserva el token para las solicitudes de registro posteriores.
            sessionStorage.setItem("tokenCsrf", datos.tokenCsrf);
            window.location.assign(destino);

        } catch (error) {
            mensaje.textContent =
                    "No se pudo completar el acceso. Revise la conexión con el servidor.";
            mensaje.hidden = false;

        } finally {
            campoContrasena.value = "";
            boton.disabled = false;
            boton.textContent = textoBoton;
        }
    });
}

//Validación de formulario de registro de consumo//
const formularioConsumo = document.querySelector("#form-consumo");

if (formularioConsumo) {
    const campoLote = formularioConsumo.querySelector("#lote");
    const campoFecha = formularioConsumo.querySelector("#fecha-hora");
    const campoCantidad = formularioConsumo.querySelector("#cantidad");
    const campoUnidad = formularioConsumo.querySelector("#unidad");
    const mensajeConsumo = document.querySelector("#mensaje-consumo");
    const botonCancelar = document.querySelector("#cancelar-consumo");
    const claveAlmacenamiento = "sigipa_consumos_demo";

    function actualizarUnidad() {
        const tipo = formularioConsumo.querySelector(
                'input[name="tipo-consumo"]:checked'
                ).value;

        campoUnidad.value = tipo === "alimento"
                ? "Kilogramos (kg)"
                : "Litros (L)";
    }

    formularioConsumo
            .querySelectorAll('input[name="tipo-consumo"]')
            .forEach(function (opcion) {
                opcion.addEventListener("change", actualizarUnidad);
            });

    botonCancelar.addEventListener("click", function () {
        window.location.assign("panel-operario.html");
    });

    formularioConsumo.addEventListener("submit", function (evento) {
        evento.preventDefault();
        mensajeConsumo.textContent = "";

        if (!formularioConsumo.reportValidity()) {
            return;
        }

        const cantidad = Number(campoCantidad.value);

        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            mensajeConsumo.className = "mt-3 mb-0 text-danger";
            mensajeConsumo.textContent = "Ingrese una cantidad válida mayor que cero.";
            campoCantidad.focus();
            return;
        }

        const tipo = formularioConsumo.querySelector(
                'input[name="tipo-consumo"]:checked'
                ).value;

        const registro = {
            lote: campoLote.value,
            fechaHora: campoFecha.value,
            tipo: tipo,
            cantidad: cantidad,
            unidad: tipo === "alimento" ? "kg" : "L"
        };

        try {
            const datosGuardados = localStorage.getItem(claveAlmacenamiento);
            const registros = datosGuardados === null
                    ? []
                    : JSON.parse(datosGuardados);

            if (!Array.isArray(registros)) {
                throw new Error("El historial no tiene el formato esperado.");
            }

            registros.push(registro);

            localStorage.setItem(
                    claveAlmacenamiento,
                    JSON.stringify(registros)
                    );
        } catch (error) {
            mensajeConsumo.className = "mt-3 mb-0 text-danger";
            mensajeConsumo.textContent =
                    "No se pudo guardar en este navegador. Los campos se conservaron para reintentar.";
            return;
        }

        formularioConsumo.reset();
        actualizarUnidad();

        mensajeConsumo.className = "mt-3 mb-0 text-success";
        mensajeConsumo.textContent =
                "Registro de demostración guardado en este navegador: " +
                registro.cantidad + " " + registro.unidad +
                " de " + registro.tipo + " para " + registro.lote + ".";
    });

    actualizarUnidad();
}

//Validación de formulario supervisor de inventario//
const formularioInventario = document.querySelector("#form-inventario");

if (formularioInventario && !formularioInventario.hasAttribute("data-api")) {
    const nombreInsumo = document.querySelector("#nombre-insumo");
    const unidadInsumo = document.querySelector("#unidad-medida");
    const cantidadInsumo = document.querySelector("#cantidad-disponible");
    const minimoInsumo = document.querySelector("#umbral-minimo");
    const grupoExistente = document.querySelector("#grupo-insumo-existente");
    const selectorInsumo = document.querySelector("#insumo-existente");
    const guardarInventario = document.querySelector("#guardar-inventario");
    const mensajeInventario = document.querySelector("#mensaje-inventario");
    const tablaInventario = document.querySelector("#tabla-inventario");
    const filasInventario = document.querySelector("#filas-inventario");
    const inventarioVacio = document.querySelector("#inventario-vacio");

    const claveInventario = "sigipa_inventario_demo";
    const unidades = {kg: "kg", l: "L", unidad: "Unidades"};
    let inventario = [];

    function mostrarMensajeInventario(texto, esError = false) {
        mensajeInventario.className = esError
                ? "mt-3 mb-0 text-danger"
                : "mt-3 mb-0 text-success";

        mensajeInventario.textContent = texto;
    }

    function leerInventario() {
        const datos = localStorage.getItem(claveInventario);
        const lista = datos === null ? [] : JSON.parse(datos);

        if (!Array.isArray(lista)) {
            throw new Error("El inventario guardado no tiene el formato esperado.");
        }

        return lista;
    }

    function dibujarInventario() {
        filasInventario.replaceChildren();
        selectorInsumo.replaceChildren();

        const opcionInicial = document.createElement("option");
        opcionInicial.value = "";
        opcionInicial.textContent = "Seleccionar insumo";
        selectorInsumo.appendChild(opcionInicial);

        inventario.forEach(function (insumo) {
            const fila = document.createElement("tr");

            [
                insumo.nombre,
                insumo.cantidad,
                Number.isFinite(insumo.minimo) ? insumo.minimo : "Sin configurar",
                unidades[insumo.unidad]
            ].forEach(function (valor) {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            filasInventario.appendChild(fila);

            const opcion = document.createElement("option");
            opcion.value = insumo.id;
            opcion.textContent = insumo.nombre;
            selectorInsumo.appendChild(opcion);
        });

        tablaInventario.hidden = inventario.length === 0;
        inventarioVacio.hidden = inventario.length > 0;
    }

    function cambiarModoInventario() {
        const actualizar = formularioInventario.querySelector(
                'input[name="accion-inventario"]:checked'
                ).value === "actualizar";

        grupoExistente.hidden = !actualizar;
        selectorInsumo.disabled = !actualizar;
        selectorInsumo.value = "";

        nombreInsumo.readOnly = actualizar;
        unidadInsumo.disabled = actualizar;

        nombreInsumo.value = "";
        unidadInsumo.value = "";
        cantidadInsumo.value = "";
        minimoInsumo.value = "";

        guardarInventario.textContent = actualizar
                ? "Actualizar existencias"
                : "Guardar insumo";

        guardarInventario.disabled = actualizar && inventario.length === 0;
        mensajeInventario.textContent = "";

        if (actualizar && inventario.length === 0) {
            mostrarMensajeInventario(
                    "Primero registre un insumo para poder actualizarlo.",
                    true
                    );
        }
    }

    document.querySelector("#cancelar-inventario")
            .addEventListener("click", function () {
                window.location.assign("panel-supervisor.html");
            });

    try {
        inventario = leerInventario();
        dibujarInventario();
        cambiarModoInventario();

        formularioInventario
                .querySelectorAll('input[name="accion-inventario"]')
                .forEach(function (opcion) {
                    opcion.addEventListener("change", cambiarModoInventario);
                });

        selectorInsumo.addEventListener("change", function () {
            const insumo = inventario.find(function (elemento) {
                return elemento.id === selectorInsumo.value;
            });

            nombreInsumo.value = insumo ? insumo.nombre : "";
            unidadInsumo.value = insumo ? insumo.unidad : "";
            cantidadInsumo.value = insumo ? insumo.cantidad : "";
            minimoInsumo.value = insumo && Number.isFinite(insumo.minimo)
                    ? insumo.minimo : "";
        });

        formularioInventario.addEventListener("submit", function (evento) {
            evento.preventDefault();
            mensajeInventario.textContent = "";

            if (!formularioInventario.reportValidity())
                return;

            const accion = formularioInventario.querySelector(
                    'input[name="accion-inventario"]:checked'
                    ).value;

            const nombre = nombreInsumo.value.trim().replace(/\s+/g, " ");
            const cantidad = Number(cantidadInsumo.value);
            const minimo = minimoInsumo.valueAsNumber;

            if (!Number.isFinite(minimo) || minimo < 0) {
                mostrarMensajeInventario("Ingrese una existencia mínima válida, igual o mayor que cero.", true);
                minimoInsumo.focus();
                return;
            }

            if (!nombre || !Number.isFinite(cantidad) || cantidad < 0) {
                mostrarMensajeInventario(
                        "Ingrese un nombre válido y una cantidad igual o mayor que cero.",
                        true
                        );
                return;
            }

            try {
                const lista = leerInventario();

                if (accion === "registrar") {
                    const repetido = lista.some(function (insumo) {
                        return insumo.nombre.toLowerCase() === nombre.toLowerCase();
                    });

                    if (repetido) {
                        mostrarMensajeInventario(
                                "Ese insumo ya existe. Seleccione Actualizar existencias.",
                                true
                                );
                        return;
                    }

                    lista.push({
                        id: crypto.randomUUID(),
                        nombre: nombre,
                        unidad: unidadInsumo.value,
                        cantidad: cantidad,
                        minimo: minimo
                    });

                } else {
                    const insumo = lista.find(function (elemento) {
                        return elemento.id === selectorInsumo.value;
                    });

                    if (!insumo) {
                        mostrarMensajeInventario(
                                "No se encontró el insumo seleccionado. Recargue la página.",
                                true
                                );
                        return;
                    }

                    insumo.cantidad = cantidad;
                    insumo.minimo = minimo;
                }

                localStorage.setItem(claveInventario, JSON.stringify(lista));

                inventario = lista;
                formularioInventario.reset();
                dibujarInventario();
                cambiarModoInventario();

                mostrarMensajeInventario(
                        accion === "registrar"
                        ? "Insumo de demostración registrado en este navegador."
                        : "Existencias de demostración actualizadas en este navegador."
                        );
            } catch (error) {
                mostrarMensajeInventario(
                        "No se pudo guardar el inventario. Los campos se conservaron.",
                        true
                        );
            }
        });
    } catch (error) {
        guardarInventario.disabled = true;
        formularioInventario.addEventListener("submit", function (evento) {
            evento.preventDefault();
        });

        mostrarMensajeInventario(
                "No se pudo cargar el inventario. Revise la consola del navegador.",
                true
                );
        console.error(error);
    }
}

//Validación de panel de alertas inventario bajo//
const panelAlertas = document.querySelector("#panel-alertas");

if (panelAlertas) {
    const estadoAlertas = document.querySelector("#estado-alertas");
    const listaAlertas = document.querySelector("#lista-alertas");
    const notaInventario = document.querySelector("#nota-inventario");

    const claveAlertas = "sigipa_inventario_demo";
    const unidadesAlertas = {
        kg: "kg",
        l: "L",
        unidad: "unidades"
    };

    function formatearCantidad(valor) {
        return valor.toLocaleString("es-CO", {
            maximumFractionDigits: 2
        });
    }

    function actualizarAlertas() {
        listaAlertas.replaceChildren();
        estadoAlertas.className = "";
        estadoAlertas.textContent = "";
        notaInventario.textContent = "";

        try {
            const datos = localStorage.getItem(claveAlertas);
            const insumos = datos === null ? [] : JSON.parse(datos);

            if (!Array.isArray(insumos)) {
                throw new Error("El inventario no tiene el formato esperado.");
            }

            let cantidadAlertas = 0;
            let sinMinimo = 0;

            insumos.forEach(function (insumo) {
                if (
                        typeof insumo.nombre !== "string" ||
                        !Number.isFinite(insumo.cantidad) ||
                        insumo.cantidad < 0 ||
                        !Object.hasOwn(unidadesAlertas, insumo.unidad)
                        ) {
                    throw new Error("Hay un insumo con datos inválidos.");
                }

                const unidad = unidadesAlertas[insumo.unidad];
                const tieneMinimo =
                        Number.isFinite(insumo.minimo) && insumo.minimo >= 0;

                const tarjeta = document.createElement("article");
                const titulo = document.createElement("h3");
                const detalle = document.createElement("p");

                titulo.className = "h5";
                titulo.textContent = insumo.nombre;
                detalle.className = "mb-0";

                const disponible =
                        formatearCantidad(insumo.cantidad) + " " + unidad;

                if (!tieneMinimo) {
                    sinMinimo++;
                    tarjeta.className = "alert alert-secondary";

                    detalle.textContent =
                            "Disponible: " + disponible +
                            ". Existencia mínima sin configurar; no se puede evaluar la alerta.";
                } else if (insumo.cantidad < insumo.minimo) {
                    cantidadAlertas++;
                    tarjeta.className = "alert alert-warning";

                    const faltante = insumo.minimo - insumo.cantidad;

                    detalle.textContent =
                            "Inventario bajo. Disponible: " + disponible +
                            ". Mínimo: " + formatearCantidad(insumo.minimo) +
                            " " + unidad +
                            ". Faltan " + formatearCantidad(faltante) +
                            " " + unidad + " para alcanzar el mínimo.";
                } else {
                    tarjeta.className = "alert alert-success";

                    detalle.textContent =
                            "Sin alerta. Disponible: " + disponible +
                            ". Mínimo: " + formatearCantidad(insumo.minimo) +
                            " " + unidad + ".";
                }

                tarjeta.append(titulo, detalle);
                listaAlertas.appendChild(tarjeta);
            });

            if (insumos.length === 0) {
                estadoAlertas.textContent =
                        "Todavía no hay insumos registrados. Abra Inventario para comenzar.";
            } else {
                estadoAlertas.textContent =
                        "Insumos por debajo del mínimo: " + cantidadAlertas +
                        ". Insumos sin mínimo configurado: " + sinMinimo + ".";
            }

            notaInventario.textContent =
                    "Datos de demostración · Última consulta: " +
                    new Date().toLocaleString("es-CO");
        } catch (error) {
            listaAlertas.replaceChildren();
            estadoAlertas.className = "text-danger";
            estadoAlertas.textContent =
                    "No se pudo consultar el inventario. No es posible evaluar las alertas.";

            console.error(error);
        }
    }

    actualizarAlertas();

    window.addEventListener("pageshow", function (evento) {
        if (evento.persisted) {
            actualizarAlertas();
        }
    });

    window.addEventListener("storage", function (evento) {
        if (evento.key === claveAlertas || evento.key === null) {
            actualizarAlertas();
        }
    });
}

//Validación de formulario de generación de reportes//
const formularioReporte = document.querySelector("#form-reporte");

if (formularioReporte) {
    const tipoReporte = document.querySelector("#tipo-reporte");
    const loteReporte = document.querySelector("#lote-reporte");
    const fechaInicial = document.querySelector("#fecha-inicial");
    const fechaFinal = document.querySelector("#fecha-final");
    const mensajeReporte = document.querySelector("#mensaje-reporte");
    const vistaReporte = document.querySelector("#vista-reporte");
    const tituloVista = document.querySelector("#titulo-vista-reporte");
    const resumenReporte = document.querySelector("#resumen-reporte");
    const filasReporte = document.querySelector("#filas-reporte");

    const tiposReportes = new Map([
        ["consumo-alimento", {
                titulo: "Consumo de alimento",
                tipo: "alimento",
                unidad: "kg"
            }],
        ["consumo-agua", {
                titulo: "Consumo de agua",
                tipo: "agua",
                unidad: "L"
            }]
    ]);

    function informarReporte(texto, esError = false) {
        mensajeReporte.className = esError
                ? "mt-3 mb-0 text-danger"
                : "mt-3 mb-0 text-success";

        mensajeReporte.textContent = texto;
    }

    function guardarReporteEnHistorial(reporte, formato) {
        const clave = "sigipa_reportes_demo";
        const datos = localStorage.getItem(clave);
        const historial = datos === null ? [] : JSON.parse(datos);

        if (!Array.isArray(historial)) {
            throw new Error("El historial de reportes no tiene el formato esperado.");
        }

        const reporteGuardado = {
            id: crypto.randomUUID(),
            titulo: reporte.titulo,
            tipo: reporte.tipo,
            unidad: reporte.unidad,
            lote: loteReporte.value,
            fechaInicial: fechaInicial.value,
            fechaFinal: fechaFinal.value,
            creadoEn: new Date().toISOString(),
            formato: formato,
            descripcion: reporte.descripcion,
            total: reporte.total,
            registros: reporte.registros
        };

        historial.push(reporteGuardado);
        localStorage.setItem(clave, JSON.stringify(historial));
    }

    function exportarExcel(reporte) {
        if (!window.XLSX) {
            throw new Error(
                    "No se cargó la herramienta de Excel. Revise xlsx.full.min.js."
                    );
        }

        const datos = [
            ["SIGIPA - " + reporte.titulo],
            ["Datos de demostración"],
            [reporte.descripcion],
            [],
            ["Fecha y hora", "Lote", "Cantidad", "Unidad"],
            ...reporte.registros.map(function (registro) {
                return [
                    registro.fechaHora.replace("T", " "),
                    registro.lote,
                    registro.cantidad,
                    reporte.unidad
                ];
            }),
            [],
            ["TOTAL", "", reporte.total, reporte.unidad]
        ];

        const hoja = XLSX.utils.aoa_to_sheet(datos);
        hoja["!cols"] = [
            {wch: 24},
            {wch: 18},
            {wch: 16},
            {wch: 12}
        ];

        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Consumo");

        XLSX.writeFile(
                libro,
                "SIGIPA_consumo_" + reporte.tipo + "_" +
                fechaInicial.value + "_" + fechaFinal.value + ".xlsx"
                );
    }

    function abrirPDF(reporte) {
        const ventana = window.open("", "_blank");

        if (!ventana) {
            throw new Error(
                    "Permita ventanas emergentes para abrir el reporte."
                    );
        }

        const documento = ventana.document;
        documento.documentElement.lang = "es";
        documento.title = "SIGIPA - " + reporte.titulo;

        const estilos = documento.createElement("style");
        estilos.textContent = `
      body { font-family: Arial, sans-serif; margin: 24px; color: #18364b; }
      h1 { font-size: 22px; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #999; padding: 8px; text-align: left; }
      th { background: #eee; }
      caption { margin-bottom: 10px; text-align: left; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      @page { size: A4; margin: 15mm; }
    `;

        const titulo = documento.createElement("h1");
        titulo.textContent = "SIGIPA - " + reporte.titulo;

        const resumen = documento.createElement("p");
        resumen.textContent = resumenReporte.textContent;

        const tabla = vistaReporte.querySelector("table").cloneNode(true);

        documento.head.appendChild(estilos);
        documento.body.replaceChildren(titulo, resumen, tabla);

        documento.close();
        ventana.focus();
        ventana.print();
    }

    document.querySelector("#cancelar-reporte")
            .addEventListener("click", function () {
                const esAdministrador = document.body.classList.contains(
                        "generar-reporte-administrador"
                        );

                const destino = esAdministrador
                        ? "reportes-administrador.html"
                        : "panel-supervisor.html";

                window.location.assign(destino);
            });

    formularioReporte.addEventListener("input", function () {
        vistaReporte.hidden = true;
        mensajeReporte.textContent = "";
    });

    formularioReporte.addEventListener("submit", function (evento) {
        evento.preventDefault();

        mensajeReporte.textContent = "";
        vistaReporte.hidden = true;
        filasReporte.replaceChildren();

        if (!formularioReporte.reportValidity())
            return;

        if (fechaInicial.value > fechaFinal.value) {
            informarReporte(
                    "La fecha inicial no puede ser posterior a la fecha final.",
                    true
                    );
            fechaFinal.focus();
            return;
        }

        const configuracion = tiposReportes.get(tipoReporte.value);

        if (!configuracion) {
            informarReporte(
                    "Todavía no hay datos registrados para ese tipo de reporte.",
                    true
                    );
            return;
        }

        try {
            const datos = localStorage.getItem("sigipa_consumos_demo");
            const consumos = datos === null ? [] : JSON.parse(datos);

            if (!Array.isArray(consumos)) {
                throw new Error("Los consumos no tienen el formato esperado.");
            }

            const hayDatosInvalidos = consumos.some(function (registro) {
                return (
                        !registro ||
                        typeof registro.fechaHora !== "string" ||
                        Number.isNaN(new Date(registro.fechaHora).getTime()) ||
                        typeof registro.lote !== "string" ||
                        !["alimento", "agua"].includes(registro.tipo) ||
                        !Number.isFinite(registro.cantidad) ||
                        registro.cantidad <= 0 ||
                        registro.unidad !== (registro.tipo === "alimento" ? "kg" : "L")
                        );
            });

            if (hayDatosInvalidos) {
                throw new Error("Hay registros de consumo con datos inválidos.");
            }

            const registros = consumos.filter(function (registro) {
                const fecha = registro.fechaHora.slice(0, 10);

                return (
                        registro.tipo === configuracion.tipo &&
                        (loteReporte.value === "todos" ||
                                registro.lote === loteReporte.value) &&
                        fecha >= fechaInicial.value &&
                        fecha <= fechaFinal.value
                        );
            });

            registros.sort(function (a, b) {
                return a.fechaHora.localeCompare(b.fechaHora);
            });

            if (registros.length === 0) {
                informarReporte(
                        "No hay registros de " + configuracion.tipo +
                        " para el lote y periodo seleccionados.",
                        true
                        );
                return;
            }

            const total = registros.reduce(function (suma, registro) {
                return suma + Math.round(registro.cantidad * 100);
            }, 0) / 100;

            const nombreLote =
                    loteReporte.options[loteReporte.selectedIndex].text;

            const reporte = {
                titulo: configuracion.titulo,
                tipo: configuracion.tipo,
                unidad: configuracion.unidad,
                registros: registros,
                total: total,
                descripcion:
                        "Lote: " + nombreLote +
                        ". Periodo: " + fechaInicial.value +
                        " a " + fechaFinal.value + "."
            };

            tituloVista.textContent = "Reporte de " +
                    configuracion.titulo.toLowerCase();

            registros.forEach(function (registro) {
                const fila = document.createElement("tr");

                [
                    registro.fechaHora.replace("T", " "),
                    registro.lote,
                    registro.cantidad.toLocaleString("es-CO"),
                    reporte.unidad
                ].forEach(function (valor) {
                    const celda = document.createElement("td");
                    celda.textContent = valor;
                    fila.appendChild(celda);
                });

                filasReporte.appendChild(fila);
            });

            resumenReporte.textContent =
                    reporte.descripcion +
                    " Registros: " + registros.length +
                    ". Total: " + total.toLocaleString("es-CO") +
                    " " + reporte.unidad + ". Datos de demostración.";

            vistaReporte.hidden = false;

            const formato = formularioReporte.querySelector(
                    'input[name="formato-salida"]:checked'
                    ).value;

            guardarReporteEnHistorial(reporte, formato);

            if (formato === "excel") {
                exportarExcel(reporte);
                informarReporte(
                        "Vista previa generada. Revise la descarga del archivo Excel."
                        );
            } else {
                informarReporte(
                        "Seleccione Guardar como PDF en el diálogo de impresión."
                        );
                abrirPDF(reporte);
            }
        } catch (error) {
            informarReporte(error.message, true);
            console.error(error);
        }
    });
}

//Validación de historial de reportes administrasdor//
const filasHistorial = document.querySelector("#filas-historial");

if (filasHistorial) {
    const historialMovil = document.querySelector("#historial-movil");
    const contador = document.querySelector("#contador-historial");
    const contadorMovil = document.querySelector("#contador-historial-movil");
    const mensajeHistorial = document.querySelector("#mensaje-historial");

    const detalleReporte = document.querySelector("#detalle-reporte");
    const tituloDetalle = document.querySelector("#titulo-detalle-reporte");
    const resumenDetalle = document.querySelector("#resumen-detalle-reporte");
    const filasDetalle = document.querySelector("#filas-detalle-reporte");

    const filtroTipo = document.querySelector("#reporte-tipo");
    const filtroLote = document.querySelector("#reporte-lote");
    const filtroPeriodo = document.querySelector("#reporte-periodo");

    const claveHistorial = "sigipa_reportes_demo";

    function mensajeDelHistorial(texto, esError = false) {
        mensajeHistorial.className = esError
                ? "mt-3 text-danger"
                : "mt-3";

        mensajeHistorial.textContent = texto;
    }

    function crearElementoHistorial(etiqueta, texto, clase = "") {
        const elemento = document.createElement(etiqueta);
        elemento.textContent = texto;
        elemento.className = clase;
        return elemento;
    }

    function nombreLoteHistorial(lote) {
        return lote === "todos"
                ? "Todos los lotes"
                : lote.replace("lote-", "Lote ");
    }

    function periodoDelReporte(reporte) {
        return reporte.fechaInicial + " a " + reporte.fechaFinal;
    }

    function fechaGeneracionHistorial(reporte) {
        return new Date(reporte.creadoEn).toLocaleString("es-CO");
    }

    function leerHistorialReportes() {
        const datos = localStorage.getItem(claveHistorial);
        const historial = datos === null ? [] : JSON.parse(datos);

        if (!Array.isArray(historial)) {
            throw new Error("El historial no tiene el formato esperado.");
        }

        const hayInvalidos = historial.some(function (reporte) {
            return (
                    !reporte ||
                    typeof reporte.id !== "string" ||
                    typeof reporte.titulo !== "string" ||
                    typeof reporte.descripcion !== "string" ||
                    typeof reporte.fechaInicial !== "string" ||
                    typeof reporte.fechaFinal !== "string" ||
                    !["todos", "lote-01", "lote-02", "lote-03"].includes(reporte.lote) ||
                    !["alimento", "agua"].includes(reporte.tipo) ||
                    reporte.unidad !== (reporte.tipo === "alimento" ? "kg" : "L") ||
                    !["pdf", "excel"].includes(reporte.formato) ||
                    Number.isNaN(new Date(reporte.creadoEn).getTime()) ||
                    !Number.isFinite(reporte.total) ||
                    reporte.total <= 0 ||
                    !Array.isArray(reporte.registros) ||
                    reporte.registros.length === 0 ||
                    reporte.registros.some(function (registro) {
                        return (
                                !registro ||
                                typeof registro.fechaHora !== "string" ||
                                typeof registro.lote !== "string" ||
                                !Number.isFinite(registro.cantidad) ||
                                registro.cantidad <= 0
                                );
                    })
                    );
        });

        if (hayInvalidos) {
            throw new Error("Hay reportes guardados con datos inválidos.");
        }

        return historial;
    }

    function mostrarDetalleReporte(reporte) {
        filasDetalle.replaceChildren();
        tituloDetalle.textContent = reporte.titulo;

        resumenDetalle.textContent =
                reporte.descripcion +
                " Generado: " + fechaGeneracionHistorial(reporte) +
                ". Registros: " + reporte.registros.length +
                ". Total: " + reporte.total.toLocaleString("es-CO") +
                " " + reporte.unidad + ". Datos de demostración.";

        reporte.registros.forEach(function (registro) {
            const fila = document.createElement("tr");

            [
                registro.fechaHora.replace("T", " "),
                nombreLoteHistorial(registro.lote),
                registro.cantidad.toLocaleString("es-CO"),
                reporte.unidad
            ].forEach(function (valor) {
                fila.appendChild(crearElementoHistorial("td", valor));
            });

            filasDetalle.appendChild(fila);
        });

        detalleReporte.hidden = false;
    }

    function descargarExcelHistorial(reporte) {
        if (!window.XLSX) {
            throw new Error(
                    "No se cargó la herramienta de Excel. Revise el enlace a xlsx.full.min.js."
                    );
        }

        const datos = [
            ["SIGIPA - " + reporte.titulo],
            ["Datos de demostración"],
            [reporte.descripcion],
            ["Generado", fechaGeneracionHistorial(reporte)],
            [],
            ["Fecha y hora", "Lote", "Cantidad", "Unidad"],
            ...reporte.registros.map(function (registro) {
                return [
                    registro.fechaHora.replace("T", " "),
                    nombreLoteHistorial(registro.lote),
                    registro.cantidad,
                    reporte.unidad
                ];
            }),
            [],
            ["TOTAL", "", reporte.total, reporte.unidad]
        ];

        const hoja = XLSX.utils.aoa_to_sheet(datos);
        hoja["!cols"] = [
            {wch: 26},
            {wch: 22},
            {wch: 16},
            {wch: 12}
        ];

        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Consumo");

        XLSX.writeFile(
                libro,
                "SIGIPA_" + reporte.tipo + "_" +
                reporte.fechaInicial + "_" +
                reporte.id.slice(0, 8) + ".xlsx"
                );
    }

    function imprimirReporteHistorial(reporte) {
        const ventana = window.open("", "_blank");

        if (!ventana) {
            throw new Error(
                    "Permita ventanas emergentes para abrir el reporte."
                    );
        }

        mostrarDetalleReporte(reporte);

        const documento = ventana.document;
        documento.documentElement.lang = "es";
        documento.title = "SIGIPA - " + reporte.titulo;

        const estilos = documento.createElement("style");
        estilos.textContent = `
      body { font-family: Arial, sans-serif; margin: 24px; color: #18364b; }
      h1 { font-size: 22px; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #999; padding: 8px; text-align: left; }
      th { background: #eee; }
      caption { margin-bottom: 10px; text-align: left; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      @page { size: A4; margin: 15mm; }
    `;

        const titulo = documento.createElement("h1");
        titulo.textContent = "SIGIPA - " + reporte.titulo;

        const resumen = documento.createElement("p");
        resumen.textContent = resumenDetalle.textContent;

        const tabla = detalleReporte.querySelector("table").cloneNode(true);

        documento.head.appendChild(estilos);
        documento.body.replaceChildren(titulo, resumen, tabla);

        documento.close();
        ventana.focus();
        ventana.print();
    }

    function crearAccionesHistorial(reporte) {
        const acciones = document.createElement("div");
        acciones.className = "ra-acciones";

        const ver = crearElementoHistorial(
                "button", "Ver", "ra-accion ra-accion-ver"
                );
        ver.type = "button";

        ver.addEventListener("click", function () {
            mostrarDetalleReporte(reporte);
            mensajeDelHistorial("");

            tituloDetalle.tabIndex = -1;
            tituloDetalle.focus();
            detalleReporte.scrollIntoView({block: "start"});
        });

        const descargar = crearElementoHistorial(
                "button",
                reporte.formato === "excel" ? "Descargar Excel" : "Guardar PDF",
                "ra-accion ra-accion-descargar"
                );
        descargar.type = "button";

        descargar.addEventListener("click", function () {
            try {
                if (reporte.formato === "excel") {
                    descargarExcelHistorial(reporte);
                    mensajeDelHistorial(
                            "Se solicitó la descarga del Excel. Revise las descargas."
                            );
                } else {
                    mensajeDelHistorial(
                            "Seleccione Guardar como PDF en el diálogo de impresión."
                            );
                    imprimirReporteHistorial(reporte);
                }
            } catch (error) {
                mensajeDelHistorial(error.message, true);
                console.error(error);
            }
        });

        acciones.append(ver, descargar);
        return acciones;
    }

    function mostrarHistorialReportes() {
        filasHistorial.replaceChildren();
        historialMovil.replaceChildren();
        detalleReporte.hidden = true;
        contador.textContent = "0 resultados";
        contadorMovil.textContent = "0";

        try {
            const historial = leerHistorialReportes();
            const ahora = new Date();
            const desde = new Date();

            if (filtroPeriodo.value !== "todos") {
                desde.setHours(0, 0, 0, 0);
                desde.setDate(
                        desde.getDate() - (Number(filtroPeriodo.value) - 1)
                        );
            }

            const resultados = historial.filter(function (reporte) {
                const coincideTipo =
                        filtroTipo.value === "todos" ||
                        filtroTipo.value === reporte.tipo ||
                        (
                                filtroTipo.value === "consumo" &&
                                ["alimento", "agua"].includes(reporte.tipo)
                                );

                const coincideLote =
                        filtroLote.value === "todos" ||
                        filtroLote.value === reporte.lote;

                const fecha = new Date(reporte.creadoEn);
                const coincidePeriodo =
                        filtroPeriodo.value === "todos" ||
                        (fecha >= desde && fecha <= ahora);

                return coincideTipo && coincideLote && coincidePeriodo;
            });

            resultados.sort(function (a, b) {
                return new Date(b.creadoEn) - new Date(a.creadoEn);
            });

            resultados.forEach(function (reporte) {
                const fila = document.createElement("tr");
                const nombre = crearElementoHistorial("th", reporte.titulo);
                nombre.scope = "row";
                fila.appendChild(nombre);

                [
                    "Consumo de " + reporte.tipo,
                    nombreLoteHistorial(reporte.lote),
                    periodoDelReporte(reporte),
                    fechaGeneracionHistorial(reporte)
                ].forEach(function (valor) {
                    fila.appendChild(crearElementoHistorial("td", valor));
                });

                const celdaAcciones = document.createElement("td");
                celdaAcciones.appendChild(crearAccionesHistorial(reporte));
                fila.appendChild(celdaAcciones);
                filasHistorial.appendChild(fila);

                const tarjeta = document.createElement("article");
                tarjeta.className = "ra-reporte-movil";

                tarjeta.append(
                        crearElementoHistorial("h3", reporte.titulo),
                        crearElementoHistorial(
                                "p",
                                "Consumo de " + reporte.tipo + " · " +
                                nombreLoteHistorial(reporte.lote),
                                "ra-reporte-tipo"
                                ),
                        crearElementoHistorial(
                                "p", "Periodo: " + periodoDelReporte(reporte)
                                ),
                        crearElementoHistorial(
                                "p", "Generado: " + fechaGeneracionHistorial(reporte)
                                ),
                        crearAccionesHistorial(reporte)
                        );

                historialMovil.appendChild(tarjeta);
            });

            contador.textContent = resultados.length + " resultados";
            contadorMovil.textContent = String(resultados.length);

            mensajeDelHistorial(
                    historial.length === 0
                    ? "Todavía no hay reportes guardados. Genere uno para comenzar."
                    : resultados.length === 0
                    ? "No hay reportes que coincidan con los filtros."
                    : ""
                    );
        } catch (error) {
            filasHistorial.replaceChildren();
            historialMovil.replaceChildren();
            contador.textContent = "No disponible";
            contadorMovil.textContent = "—";

            mensajeDelHistorial(error.message, true);
            console.error(error);
        }
    }

    [
        ["reporte-tipo", "reporte-tipo-movil"],
        ["reporte-lote", "reporte-lote-movil"],
        ["reporte-periodo", "reporte-periodo-movil"]
    ].forEach(function (identificadores) {
        const escritorio = document.getElementById(identificadores[0]);
        const movil = document.getElementById(identificadores[1]);

        escritorio.addEventListener("change", function () {
            movil.value = escritorio.value;
            mostrarHistorialReportes();
        });

        movil.addEventListener("change", function () {
            escritorio.value = movil.value;
            mostrarHistorialReportes();
        });
    });

    mostrarHistorialReportes();

    window.addEventListener("storage", function (evento) {
        if (evento.key === claveHistorial || evento.key === null) {
            mostrarHistorialReportes();
        }
    });

    window.addEventListener("pageshow", function (evento) {
        if (evento.persisted) {
            mostrarHistorialReportes();
        }
    });
}

//Validación de panel de control administrador conectando Dashboard//
const dashboardAdmin = document.querySelector("#dashboard-admin");

if (dashboardAdmin) {
    const totalAlimento = document.querySelector("#dashboard-total-alimento");
    const totalAgua = document.querySelector("#dashboard-total-agua");
    const promedioAlimento = document.querySelector("#dashboard-promedio-alimento");

    const mensajeDashboard = document.querySelector("#mensaje-dashboard");
    const graficoDashboard = document.querySelector("#grafico-dashboard");
    const descripcionGrafico = document.querySelector("#descripcion-grafico-consumo");
    const filasDashboard = document.querySelector("#filas-dashboard");

    const resumenLotes = document.querySelector("#dashboard-lotes");
    const resumenPeriodo = document.querySelector("#dashboard-periodo");
    const ultimaConsulta = document.querySelector("#dashboard-actualizacion");

    const loteDashboard = document.querySelector("#filtro-lote-escritorio");
    const periodoDashboard = document.querySelector("#filtro-periodo-escritorio");

    const formatoNumeroDashboard = new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: 2
    });

    function fechaLocalDashboard(fecha) {
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, "0"),
            String(fecha.getDate()).padStart(2, "0")
        ].join("-");
    }

    function fechaVisibleDashboard(fecha) {
        return fecha.split("-").reverse().join("/");
    }

    function crearSVGDashboard(etiqueta, atributos, texto) {
        const elemento = document.createElementNS(
                "http://www.w3.org/2000/svg",
                etiqueta
                );

        Object.entries(atributos).forEach(function ([nombre, valor]) {
            elemento.setAttribute(nombre, String(valor));
        });

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        return elemento;
    }

    function dibujarGraficoDashboard(dias) {
        graficoDashboard.replaceChildren();

        const valores = dias
                .filter(function (dia) {
                    return dia.alimento !== null;
                })
                .map(function (dia) {
                    return dia.alimento / 100;
                });

        if (valores.length === 0) {
            const aviso = document.createElement("p");
            aviso.textContent =
                    "No hay registros de alimento para dibujar el gráfico.";
            graficoDashboard.appendChild(aviso);
            return;
        }

        const ancho = Math.max(620, dias.length * 42 + 100);
        const alto = 280;
        const izquierda = 65;
        const derecha = 20;
        const arriba = 25;
        const base = 220;

        const anchoUtil = ancho - izquierda - derecha;
        const altoUtil = base - arriba;
        const espacio = anchoUtil / dias.length;
        const limite = Math.max(1, Math.ceil(Math.max(...valores)));

        const svg = crearSVGDashboard("svg", {
            viewBox: "0 0 " + ancho + " " + alto,
            width: ancho,
            height: alto,
            "font-family": "Arial, sans-serif",
            "font-size": 12
        });

        svg.style.display = "block";
        svg.style.width = "100%";
        svg.style.minWidth = ancho + "px";
        svg.style.height = "auto";

        svg.appendChild(
                crearSVGDashboard(
                        "text",
                        {x: 8, y: 14, fill: "#18364b"},
                        "kg"
                        )
                );

        for (let division = 0; division <= 4; division++) {
            const valor = limite * division / 4;
            const y = base - (division / 4) * altoUtil;

            svg.appendChild(
                    crearSVGDashboard("line", {
                        x1: izquierda,
                        x2: ancho - derecha,
                        y1: y,
                        y2: y,
                        stroke: "#c5d0d5"
                    })
                    );

            svg.appendChild(
                    crearSVGDashboard(
                            "text",
                            {
                                x: izquierda - 10,
                                y: y + 4,
                                "text-anchor": "end",
                                fill: "#18364b"
                            },
                            formatoNumeroDashboard.format(valor)
                            )
                    );
        }

        dias.forEach(function (dia, indice) {
            const centro = izquierda + espacio * (indice + 0.5);

            if (dia.alimento !== null) {
                const cantidad = dia.alimento / 100;
                const altura = cantidad / limite * altoUtil;
                const anchoBarra = Math.min(30, espacio * 0.6);

                const barra = crearSVGDashboard("rect", {
                    x: centro - anchoBarra / 2,
                    y: base - altura,
                    width: anchoBarra,
                    height: altura,
                    fill: "#087f74"
                });

                barra.appendChild(
                        crearSVGDashboard(
                                "title",
                                {},
                                fechaVisibleDashboard(dia.fecha) + ": " +
                                formatoNumeroDashboard.format(cantidad) + " kg"
                                )
                        );

                svg.appendChild(barra);
            } else {
                svg.appendChild(
                        crearSVGDashboard(
                                "text",
                                {
                                    x: centro,
                                    y: base - 8,
                                    "text-anchor": "middle",
                                    fill: "#617782"
                                },
                                "s/r"
                                )
                        );
            }

            svg.appendChild(
                    crearSVGDashboard(
                            "text",
                            {
                                x: centro,
                                y: base + 24,
                                "text-anchor": "middle",
                                fill: "#18364b"
                            },
                            dia.fecha.slice(8, 10) + "/" + dia.fecha.slice(5, 7)
                            )
                    );
        });

        graficoDashboard.appendChild(svg);
    }

    function actualizarDashboard() {
        try {
            const cantidadDias = Number(periodoDashboard.value);

            if (![7, 15, 30].includes(cantidadDias)) {
                throw new Error("El periodo seleccionado no es válido.");
            }

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const inicio = new Date(hoy);
            inicio.setDate(inicio.getDate() - cantidadDias + 1);

            const fechaDesde = fechaLocalDashboard(inicio);
            const fechaHasta = fechaLocalDashboard(hoy);

            const datos = localStorage.getItem("sigipa_consumos_demo");
            const consumos = datos === null ? [] : JSON.parse(datos);

            if (!Array.isArray(consumos)) {
                throw new Error("Los consumos no tienen el formato esperado.");
            }

            const hayInvalidos = consumos.some(function (registro) {
                return (
                        !registro ||
                        typeof registro.fechaHora !== "string" ||
                        Number.isNaN(new Date(registro.fechaHora).getTime()) ||
                        !["lote-01", "lote-02", "lote-03"].includes(registro.lote) ||
                        !["alimento", "agua"].includes(registro.tipo) ||
                        !Number.isFinite(registro.cantidad) ||
                        registro.cantidad <= 0 ||
                        registro.unidad !== (registro.tipo === "alimento" ? "kg" : "L")
                        );
            });

            if (hayInvalidos) {
                throw new Error("Hay consumos guardados con datos inválidos.");
            }

            const registros = consumos.filter(function (registro) {
                const fecha = registro.fechaHora.slice(0, 10);

                return (
                        fecha >= fechaDesde &&
                        fecha <= fechaHasta &&
                        (
                                loteDashboard.value === "todos" ||
                                registro.lote === loteDashboard.value
                                )
                        );
            });

            const dias = [];

            for (let indice = 0; indice < cantidadDias; indice++) {
                const fecha = new Date(inicio);
                fecha.setDate(fecha.getDate() + indice);

                dias.push({
                    fecha: fechaLocalDashboard(fecha),
                    alimento: null,
                    agua: null
                });
            }

            const diasPorFecha = new Map(
                    dias.map(function (dia) {
                        return [dia.fecha, dia];
                    })
                    );

            registros.forEach(function (registro) {
                const dia = diasPorFecha.get(registro.fechaHora.slice(0, 10));
                const cantidad = Math.round(registro.cantidad * 100);

                dia[registro.tipo] = (dia[registro.tipo] ?? 0) + cantidad;
            });

            const diasConAlimento = dias.filter(function (dia) {
                return dia.alimento !== null;
            });

            const diasConAgua = dias.filter(function (dia) {
                return dia.agua !== null;
            });

            const sumaAlimento = diasConAlimento.reduce(function (suma, dia) {
                return suma + dia.alimento;
            }, 0) / 100;

            const sumaAgua = diasConAgua.reduce(function (suma, dia) {
                return suma + dia.agua;
            }, 0) / 100;

            totalAlimento.textContent = diasConAlimento.length > 0
                    ? formatoNumeroDashboard.format(sumaAlimento) + " kg"
                    : "—";

            totalAgua.textContent = diasConAgua.length > 0
                    ? formatoNumeroDashboard.format(sumaAgua) + " L"
                    : "—";

            promedioAlimento.textContent = diasConAlimento.length > 0
                    ? formatoNumeroDashboard.format(
                            sumaAlimento / diasConAlimento.length
                            ) + " kg/día"
                    : "—";

            filasDashboard.replaceChildren();

            dias.forEach(function (dia) {
                const fila = document.createElement("tr");

                [
                    fechaVisibleDashboard(dia.fecha),
                    dia.alimento === null
                            ? "Sin registro"
                            : formatoNumeroDashboard.format(dia.alimento / 100),
                    dia.agua === null
                            ? "Sin registro"
                            : formatoNumeroDashboard.format(dia.agua / 100)
                ].forEach(function (valor) {
                    const celda = document.createElement("td");
                    celda.textContent = valor;
                    fila.appendChild(celda);
                });

                filasDashboard.appendChild(fila);
            });

            dibujarGraficoDashboard(dias);

            resumenLotes.textContent =
                    loteDashboard.value === "todos"
                    ? "Todos"
                    : loteDashboard.value.replace("lote-", "Lote ");

            resumenPeriodo.textContent =
                    fechaVisibleDashboard(fechaDesde) + " a " +
                    fechaVisibleDashboard(fechaHasta);

            ultimaConsulta.textContent =
                    new Date().toLocaleTimeString("es-CO");

            descripcionGrafico.textContent =
                    resumenLotes.textContent + " · " +
                    resumenPeriodo.textContent +
                    " · s/r: sin registro.";

            mensajeDashboard.className = "mt-3";
            mensajeDashboard.textContent = registros.length > 0
                    ? "Registros incluidos: " + registros.length +
                    ". Días con registros de alimento: " + diasConAlimento.length + "."
                    : "No hay consumos registrados para el lote y periodo seleccionados.";
        } catch (error) {
            totalAlimento.textContent = "—";
            totalAgua.textContent = "—";
            promedioAlimento.textContent = "—";

            filasDashboard.replaceChildren();
            graficoDashboard.replaceChildren();

            resumenLotes.textContent = "—";
            resumenPeriodo.textContent = "—";
            ultimaConsulta.textContent = "No disponible";
            descripcionGrafico.textContent = "No se pudieron consultar los datos.";

            mensajeDashboard.className = "mt-3 text-danger";
            mensajeDashboard.textContent = error.message;
            console.error(error);
        }
    }

    [
        ["filtro-lote-escritorio", "filtro-lote-movil"],
        ["filtro-periodo-escritorio", "filtro-periodo-movil"]
    ].forEach(function (identificadores) {
        const escritorio = document.getElementById(identificadores[0]);
        const movil = document.getElementById(identificadores[1]);

        escritorio.addEventListener("change", function () {
            movil.value = escritorio.value;
            actualizarDashboard();
        });

        movil.addEventListener("change", function () {
            escritorio.value = movil.value;
            actualizarDashboard();
        });
    });

    actualizarDashboard();

    window.addEventListener("storage", function (evento) {
        if (evento.key === "sigipa_consumos_demo" || evento.key === null) {
            actualizarDashboard();
        }
    });

    window.addEventListener("pageshow", function (evento) {
        if (evento.persisted) {
            actualizarDashboard();
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            actualizarDashboard();
        }
    });

    setInterval(function () {
        if (!document.hidden) {
            actualizarDashboard();
        }
    }, 300000);
}