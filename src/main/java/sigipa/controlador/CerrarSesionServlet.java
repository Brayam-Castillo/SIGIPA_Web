package sigipa.controlador;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@WebServlet("/api/cerrar-sesion")
public class CerrarSesionServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        HttpSession sesion = request.getSession(false);
        if (sesion != null) {
            String token = request.getHeader("X-CSRF-Token");
            if (token == null || !token.equals(sesion.getAttribute("tokenCsrf"))) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
            sesion.invalidate();
        }
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
