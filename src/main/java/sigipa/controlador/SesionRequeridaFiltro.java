package sigipa.controlador;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

@WebFilter(urlPatterns = {"/pages/*", "/inventario"})
public class SesionRequeridaFiltro implements Filter {
    @Override
    public void doFilter(ServletRequest entrada, ServletResponse salida, FilterChain cadena)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) entrada;
        HttpServletResponse response = (HttpServletResponse) salida;
        response.setHeader("Cache-Control", "no-store");
        HttpSession sesion = request.getSession(false);
        if (sesion != null && sesion.getAttribute("idUsuario") != null) {
            cadena.doFilter(entrada, salida);
            return;
        }
        if ("/inventario".equals(request.getServletPath())) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensaje\":\"Inicie sesión para continuar.\"}");
            return;
        }
        response.sendRedirect(request.getContextPath() + "/index.html");
    }
}

