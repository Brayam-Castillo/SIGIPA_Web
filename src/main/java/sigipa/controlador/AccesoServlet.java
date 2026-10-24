package sigipa.controlador;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import sigipa.modelo.Usuario;
import sigipa.servicio.UsuarioServicio;

/**
 * Recibe las credenciales y crea la sesión del usuario.
 */
@WebServlet("/api/acceso")
public class AccesoServlet extends HttpServlet {

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

        // Elimina una sesión anterior antes de intentar otro acceso.
        HttpSession anterior = request.getSession(false);

        if (anterior != null) {
            anterior.invalidate();
        }

        try {
            String nombreUsuario
                    = request.getParameter("nombreUsuario");
            String contrasena
                    = request.getParameter("contrasena");

            Usuario usuario
                    = servicio.autenticar(nombreUsuario, contrasena);

            // Los datos de autorización se obtienen de la base de datos.
            HttpSession sesion = request.getSession(true);
            sesion.setAttribute("idUsuario", usuario.getIdUsuario());
            sesion.setAttribute("nombreUsuario",
                    usuario.getNombreUsuario());
            sesion.setAttribute("idRol", usuario.getIdRol());
            sesion.setMaxInactiveInterval(30 * 60);

            // Se utilizará para proteger las solicitudes de registro.
            String tokenCsrf = UUID.randomUUID().toString();
            sesion.setAttribute("tokenCsrf", tokenCsrf);

            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().write(gson.toJson(Map.of(
                    "mensaje", "Autenticación satisfactoria.",
                    "nombreUsuario", usuario.getNombreUsuario(),
                    "idRol", usuario.getIdRol(),
                    "tokenCsrf", tokenCsrf
            )));

        } catch (SecurityException e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(gson.toJson(Map.of(
                    "mensaje", "Usuario o contraseña incorrectos."
            )));

        } catch (Exception e) {
            log("Error al procesar el inicio de sesión.", e);

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write(gson.toJson(Map.of(
                    "mensaje", "No se pudo procesar el acceso."
            )));
        }
    }
}
