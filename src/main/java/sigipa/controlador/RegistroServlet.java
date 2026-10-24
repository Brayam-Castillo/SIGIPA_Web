package sigipa.controlador;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Map;
import sigipa.servicio.UsuarioServicio;

/**
 * Permite registrar cuentas únicamente al administrador autenticado.
 */
@WebServlet("/api/registro")
public class RegistroServlet extends HttpServlet {

    private final UsuarioServicio servicio = new UsuarioServicio();
    private final Gson gson = new Gson();

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        request.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setHeader("Cache-Control", "no-store");

        try {
            HttpSession sesion = request.getSession(false);

            // Exige una sesión autenticada.
            if (sesion == null
                    || sesion.getAttribute("idUsuario") == null) {
                responder(response, 401,
                        "Debe iniciar sesión para registrar usuarios.");
                return;
            }

            // El rol del solicitante procede de la sesión del servidor.
            Object rolSesion = sesion.getAttribute("idRol");

            if (!Integer.valueOf(1).equals(rolSesion)) {
                responder(response, 403,
                        "Solo el administrador puede registrar usuarios.");
                return;
            }

            // Comprueba el token generado durante el inicio de sesión.
            Object tokenSesion = sesion.getAttribute("tokenCsrf");
            String tokenEnviado = request.getHeader("X-CSRF-Token");

            if (!(tokenSesion instanceof String)
                    || tokenEnviado == null
                    || !tokenSesion.equals(tokenEnviado)) {
                responder(response, 403,
                        "La solicitud no es válida. Inicie sesión nuevamente.");
                return;
            }

            // Este es el rol que se asignará a la cuenta nueva.
            Integer idRol = Integer.valueOf(
                    request.getParameter("idRol"));

            Integer idNuevo = servicio.registrar(
                    request.getParameter("nombre"),
                    request.getParameter("nombreUsuario"),
                    request.getParameter("correo"),
                    request.getParameter("contrasena"),
                    idRol,
                    (Integer) rolSesion
            );

            response.setStatus(HttpServletResponse.SC_CREATED);
            response.getWriter().write(gson.toJson(Map.of(
                    "mensaje", "Usuario registrado correctamente.",
                    "idUsuario", idNuevo
            )));

        } catch (NumberFormatException e) {
            responder(response, 400, "Seleccione un rol válido.");

        } catch (IllegalArgumentException e) {
            responder(response, 400, e.getMessage());

        } catch (SecurityException e) {
            responder(response, 403, e.getMessage());

        } catch (Exception e) {
            log("Error al registrar un usuario.", e);
            responder(response, 500,
                    "No se pudo completar el registro.");
        }
    }

    /**
     * Devuelve un mensaje JSON con el estado HTTP correspondiente.
     */
    private void responder(
            HttpServletResponse response,
            int estado,
            String mensaje) throws IOException {

        response.setStatus(estado);
        response.getWriter().write(
                gson.toJson(Map.of("mensaje", mensaje)));
    }
}
