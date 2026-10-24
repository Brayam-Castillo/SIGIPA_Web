package sigipa.servicio;

import java.math.BigDecimal;
import java.util.List;
import sigipa.dao.InventarioDAO;
import sigipa.modelo.Inventario;

/**
 * Valida los datos del inventario antes de ejecutar operaciones mediante el
 * DAO.
 */
public class InventarioServicio {

    private final InventarioDAO dao = new InventarioDAO();

    // Límite de las columnas DECIMAL(8,2) de la base de datos.
    private static final BigDecimal CANTIDAD_MAXIMA
            = new BigDecimal("999999.99");

    /**
     * Consulta los insumos registrados.
     */
    public List<Inventario> listar() {
        return dao.listar();
    }

    /**
     * Valida el identificador y consulta el insumo. Devuelve null si no existe.
     */
    public Inventario buscarPorId(int idInventario) {
        validarId(idInventario);
        return dao.buscarPorId(idInventario);
    }

    /**
     * Valida y registra un nuevo insumo.
     */
    public boolean crear(Inventario insumo) {
        validarDatos(insumo);
        return dao.crear(insumo);
    }

    /**
     * Valida y actualiza un insumo existente.
     */
    public boolean actualizar(Inventario insumo) {
        validarDatos(insumo);
        validarId(insumo.getIdInventario());
        return dao.actualizar(insumo);
    }

    /**
     * Valida el identificador antes de solicitar la eliminación.
     */
    public boolean eliminar(int idInventario) {
        validarId(idInventario);
        return dao.eliminar(idInventario);
    }

    /**
     * Comprueba los campos obligatorios del insumo.
     */
    private void validarDatos(Inventario insumo) {
        if (insumo == null) {
            throw new IllegalArgumentException(
                    "Debe proporcionar los datos del insumo.");
        }

        validarTexto(insumo.getNombreInsumo(), 50, "El nombre");
        validarTexto(insumo.getUnidad(), 15, "La unidad");

        validarCantidad(
                insumo.getCantidadDisponible(), "La cantidad disponible");

        validarCantidad(
                insumo.getNivelMinimo(), "El nivel minimo");
    }

    /**
     * Rechaza textos vacíos y longitudes superiores a la columna.
     */
    private void validarTexto(String texto, int limite, String campo) {
        if (texto == null || texto.isBlank()) {
            throw new IllegalArgumentException(
                    campo + " es obligatorio.");
        }

        if (texto.codePointCount(0, texto.length()) > limite) {
            throw new IllegalArgumentException(
                    campo + " no puede superar "
                    + limite + " caracteres.");
        }
    }

    /**
     * Comprueba que la cantidad sea compatible con DECIMAL(8,2).
     */
    private void validarCantidad(BigDecimal cantidad, String campo) {
        if (cantidad == null) {
            throw new IllegalArgumentException(
                    campo + " es obligatorio.");
        }

        if (cantidad.signum() < 0) {
            throw new IllegalArgumentException(
                    campo + " no puede ser negativo.");
        }

        if (cantidad.compareTo(CANTIDAD_MAXIMA) > 0) {
            throw new IllegalArgumentException(
                    campo + " no puede superar 999999.99.");
        }

        if (cantidad.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException(
                    campo + " admite hasta dos decimales.");
        }
    }

    /**
     * Comprueba que el identificador sea positivo.
     */
    private void validarId(int idInventario) {
        if (idInventario <= 0) {
            throw new IllegalArgumentException(
                    "El identificador debe ser mayor que cero.");
        }
    }
}