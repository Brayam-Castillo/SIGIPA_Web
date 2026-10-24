const formularioRegistro =
        document.querySelector("#form-registro-usuario");

if (formularioRegistro) {
    const mensaje = document.querySelector("#mensaje-registro");
    const boton =
            formularioRegistro.querySelector('button[type="submit"]');
    const clave = document.querySelector("#clave-nueva");
    const confirmacion = document.querySelector("#confirmar-clave");
    const textoBoton = boton.textContent;

    function informarRegistro(texto, esError) {
        mensaje.className = esError
                ? "alert alert-danger mt-3"
                : "alert alert-success mt-3";

        mensaje.textContent = texto;
        mensaje.hidden = false;
    }

    formularioRegistro.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        if (boton.disabled || !formularioRegistro.reportValidity())
            return;

        mensaje.hidden = true;

        if (clave.value !== confirmacion.value) {
            informarRegistro("Las contraseñas no coinciden.", true);
            confirmacion.focus();
            return;
        }

        boton.disabled = true;
        boton.textContent = "Guardando...";

        try {
            const token = sessionStorage.getItem("tokenCsrf");

            if (!token) {
                informarRegistro(
                        "Inicie sesión como administrador antes de registrar usuarios.",
                        true
                        );
                return;
            }

            const respuesta = await fetch("../../api/registro", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-Token": token
                },
                body: new URLSearchParams(new FormData(formularioRegistro))
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                if (respuesta.status === 401) {
                    sessionStorage.removeItem("tokenCsrf");
                }

                informarRegistro(
                        datos.mensaje || "No se pudo registrar el usuario.",
                        true
                        );
                return;
            }

            formularioRegistro.reset();

            informarRegistro(
                    datos.mensaje || "Usuario registrado correctamente.",
                    false
                    );

        } catch (error) {
            informarRegistro(
                    "No se pudo completar el registro. Revise la conexión con el servidor.",
                    true
                    );

        } finally {
            clave.value = "";
            confirmacion.value = "";
            boton.disabled = false;
            boton.textContent = textoBoton;
        }
    });
}