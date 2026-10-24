package sigipa.dao;

import java.util.List;
import sigipa.config.HibernateUtil;
import sigipa.modelo.Inventario;

/**
 * Gestiona los datos del inventario mediante Hibernate.
 */
public class InventarioDAO {

    /**
     * Consulta todos los insumos ordenados por identificador.
     */
    public List<Inventario> listar() {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session
                        -> session.createSelectionQuery(
                                "from Inventario order by idInventario",
                                Inventario.class
                        ).getResultList()
                );
    }

    /**
     * Busca un insumo por su identificador. Devuelve null si no existe.
     */
    public Inventario buscarPorId(int idInventario) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session
                        -> session.get(Inventario.class, idInventario)
                );
    }

    /**
     * Registra un nuevo insumo. MariaDB genera automáticamente su
     * identificador.
     */
    public boolean crear(Inventario insumo) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session -> {
                    session.persist(insumo);
                    return true;
                });
    }

    /**
     * Actualiza un insumo existente. Devuelve false si no encuentra el
     * identificador.
     */
    public boolean actualizar(Inventario insumo) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session -> {
                    Inventario existente = session.get(
                            Inventario.class, insumo.getIdInventario());

                    if (existente == null) {
                        return false;
                    }

                    existente.setNombreInsumo(insumo.getNombreInsumo());
                    existente.setCantidadDisponible(
                            insumo.getCantidadDisponible());
                    existente.setUnidad(insumo.getUnidad());
                    existente.setNivelMinimo(insumo.getNivelMinimo());

                    // Hibernate guarda los cambios al confirmar la transacción.
                    return true;
                });
    }

    /**
     * Elimina un insumo existente. Devuelve false si no encuentra el
     * identificador.
     */
    public boolean eliminar(int idInventario) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session -> {
                    Inventario existente = session.get(
                            Inventario.class, idInventario);

                    if (existente == null) {
                        return false;
                    }

                    session.remove(existente);
                    return true;
                });
    }
}
