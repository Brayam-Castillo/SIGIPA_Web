package sigipa.controlador;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import sigipa.modelo.Inventario;
import sigipa.servicio.InventarioServicio;
import java.math.BigDecimal;
import java.sql.SQLException;

/**
 * Permite consultar el inventario desde la interfaz web.
 */
@WebServlet("/inventario")
public class InventarioServlet extends HttpServlet {

    private final InventarioServicio servicio
            = new InventarioServicio();

    private final Gson gson = new Gson();

    /**
     * Devuelve los insumos registrados en formato JSON.
     */
    @Override
    protected void doGet(HttpServletRequest request,
            HttpServletResponse response)
            throws IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        String respuesta;

        try {
            List<Inventario> insumos = servicio.listar();
            respuesta = gson.toJson(insumos);

        } catch (RuntimeException error) {
            // Registrar el detalle técnico en el servidor.
            getServletContext().log(
                    "Error al consultar el inventario.", error);

            response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

            respuesta = gson.toJson(Map.of(
                    "mensaje",
                    "No fue posible consultar el inventario."
            ));
        }

        response.getWriter().write(respuesta);
    }

    /**
     * Recibe y registra un nuevo insumo enviado desde la web.
     */
    @Override
    protected void doPost(HttpServletRequest request,
            HttpServletResponse response)
            throws IOException {

        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        String mensaje;

        try {
            String accion = leerCampo(request, "accion-inventario");

            if ("eliminar".equals(accion)) {
                int idInventario = Integer.parseInt(
                        leerCampo(request, "id-inventario"));

                if (servicio.eliminar(idInventario)) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    mensaje = "Insumo eliminado correctamente.";
                } else {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    mensaje = "El insumo que intenta eliminar ya no existe.";
                }

                response.getWriter().write(
                        gson.toJson(Map.of("mensaje", mensaje)));

                return;
            }

            if (!"registrar".equals(accion) && !"actualizar".equals(accion)) {
                throw new IllegalArgumentException(
                        "La acción solicitada no está disponible.");
            }

            String nombre = leerCampo(request, "nombre-insumo");
            String unidad = leerCampo(request, "unidad-medida");

            // El formulario utiliza "l" y la base de datos utiliza "L".
            if ("l".equalsIgnoreCase(unidad)) {
                unidad = "L";
            }

            if (!List.of("kg", "L", "unidad").contains(unidad)) {
                throw new IllegalArgumentException(
                        "Seleccione una unidad de medida válida.");
            }

            BigDecimal cantidad = new BigDecimal(
                    leerCampo(request, "cantidad-disponible"));

            BigDecimal minimo = new BigDecimal(
                    leerCampo(request, "umbral-minimo"));

            Inventario insumo = new Inventario(
                    0, nombre, cantidad, unidad, minimo);

            if ("registrar".equals(accion)) {
                // Para crear, la base de datos genera el identificador.
                if (!servicio.crear(insumo)) {
                    throw new IllegalStateException(
                            "El registro no pudo completarse.");
                }

                response.setStatus(HttpServletResponse.SC_CREATED);
                mensaje = "Insumo registrado correctamente.";

            } else {
                // Para actualizar, utilizar el identificador del insumo elegido.
                int idInventario = Integer.parseInt(
                        leerCampo(request, "id-inventario"));

                insumo.setIdInventario(idInventario);

                if (servicio.actualizar(insumo)) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    mensaje = "Insumo actualizado correctamente.";
                } else {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    mensaje = "El insumo que intenta actualizar ya no existe.";
                }
            }

        } catch (NumberFormatException error) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            mensaje = "El identificador debe ser un entero válido y las cantidades deben ser números válidos.";

        } catch (IllegalArgumentException error) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            mensaje = error.getMessage();

        } catch (RuntimeException error) {
            getServletContext().log(
                    "Error al modificar el inventario.", error);

            if ("eliminar".equals(request.getParameter("accion-inventario"))
                    && tieneRegistrosRelacionados(error)) {

                response.setStatus(HttpServletResponse.SC_CONFLICT);
                mensaje = "No se puede eliminar este insumo porque tiene "
                        + "registros relacionados.";

            } else {
                response.setStatus(
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);

                mensaje = "No fue posible completar la operación.";
            }
        }

        response.getWriter().write(
                gson.toJson(Map.of("mensaje", mensaje)));
    }

    /**
     * Obtiene un campo obligatorio y elimina espacios en sus extremos.
     */
    private String leerCampo(HttpServletRequest request, String nombre) {
        String valor = request.getParameter(nombre);

        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(
                    "Debe completar el campo: " + nombre + ".");
        }

        return valor.trim();
    }

    /**
     * Detecta una eliminación bloqueada por registros relacionados.
     */
    private boolean tieneRegistrosRelacionados(Throwable error) {
        Throwable causa = error;

        while (causa != null) {
            if (causa instanceof SQLException
                    && ((SQLException) causa).getErrorCode() == 1451) {
                return true;
            }

            causa = causa.getCause();
        }

        return false;
    }
}
