package sigipa.controlador;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import sigipa.config.HibernateUtil;
import sigipa.modelo.Inventario;

/**
 * Comprueba la consulta del inventario mediante Hibernate.
 */
@WebServlet("/prueba-hibernate")
public class PruebaHibernateServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        try {
            // Abre una sesión y ejecuta la consulta en una transacción.
            List<Inventario> insumos = HibernateUtil.getSessionFactory()
                    .fromTransaction(session ->
                            session.createSelectionQuery(
                                    "from Inventario order by idInventario",
                                    Inventario.class
                            ).getResultList()
                    );

            response.setContentType("text/plain;charset=UTF-8");
            PrintWriter salida = response.getWriter();

            salida.println("INVENTARIO DE SIGIPA - HIBERNATE");
            salida.println("Registros encontrados: " + insumos.size());
            salida.println();

            for (Inventario insumo : insumos) {
                salida.println("ID: " + insumo.getIdInventario());
                salida.println("Insumo: " + insumo.getNombreInsumo());
                salida.println("Cantidad: " + insumo.getCantidadDisponible());
                salida.println("Unidad: " + insumo.getUnidad());
                salida.println("Nivel mínimo: " + insumo.getNivelMinimo());
                salida.println("------------------------------");
            }

        } catch (RuntimeException e) {
            throw new ServletException(
                    "No se pudo consultar el inventario con Hibernate.", e);
        }
    }
}