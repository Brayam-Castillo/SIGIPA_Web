package sigipa.controlador;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.hibernate.exception.ConstraintViolationException;
import sigipa.servicio.AdministracionUsuariosServicio;

@WebServlet("/api/administracion/usuarios")
public class AdministracionUsuariosServlet extends HttpServlet {
    private final Gson gson = new Gson();
    private final AdministracionUsuariosServicio servicio = new AdministracionUsuariosServicio();

    private void responder(HttpServletResponse res, int estado, Object contenido) throws IOException {
        res.setStatus(estado);
        res.setContentType("application/json;charset=UTF-8");
        res.setHeader("Cache-Control", "no-store");
        res.getWriter().write(gson.toJson(contenido));
    }

    private HttpSession administrador(HttpServletRequest req, HttpServletResponse res) throws IOException {
        HttpSession sesion = req.getSession(false);
        if (sesion == null || !(sesion.getAttribute("idUsuario") instanceof Integer)) {
            responder(res, 401, Map.of("mensaje", "Inicie sesión para continuar."));
            return null;
        }
        if (!Integer.valueOf(1).equals(sesion.getAttribute("idRol"))) {
            responder(res, 403, Map.of("mensaje", "Solo el administrador puede gestionar usuarios."));
            return null;
        }
        return sesion;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        HttpSession sesion = administrador(req, res);
        if (sesion == null) return;
        try {
            responder(res, 200, Map.of("usuarios", servicio.listar(), "actual", sesion.getAttribute("idUsuario")));
        } catch (RuntimeException e) {
            log("Error al listar usuarios", e);
            responder(res, 500, Map.of("mensaje", "No se pudo cargar la lista."));
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        req.setCharacterEncoding("UTF-8");
        HttpSession sesion = administrador(req, res);
        if (sesion == null) return;
        Object token = sesion.getAttribute("tokenCsrf");
        if (!(token instanceof String) || !token.equals(req.getHeader("X-CSRF-Token"))) {
            responder(res, 403, Map.of("mensaje", "Sesión no válida. Vuelva a iniciar sesión."));
            return;
        }
        try {
            int id = Integer.parseInt(req.getParameter("id"));
            String accion = req.getParameter("accion");
            switch (accion == null ? "" : accion) {
                case "editar": servicio.editar(id, req.getParameter("nombre"),
                        req.getParameter("usuario"), req.getParameter("correo"));
                break;
                case "clave": servicio.cambiarClave(id, req.getParameter("clave"));
                break;
                case "borrar": servicio.borrar(id, (Integer) sesion.getAttribute("idUsuario"));
                break;
                default: throw new IllegalArgumentException("Acción desconocida.");
            }
            responder(res, 200, Map.of("mensaje", "Cambio guardado."));
        } catch (NoSuchElementException e) {
            responder(res, 404, Map.of("mensaje", "La cuenta ya no existe."));
        } catch (IllegalArgumentException e) {
            responder(res, 400, Map.of("mensaje", e.getMessage()));
        } catch (RuntimeException e) {
            for (Throwable causa = e; causa != null; causa = causa.getCause()) {
                if (causa instanceof ConstraintViolationException) {
                    responder(res, 409, Map.of("mensaje", "Conflicto de datos: usuario o correo duplicado, o registros vinculados."));
                    return;
                }
            }
            log("Error al administrar usuarios", e);
            responder(res, 500, Map.of("mensaje", "No se pudo completar la operación."));
        }
    }
}

