package sigipa.dao;

import sigipa.config.HibernateUtil;
import sigipa.modelo.Usuario;

/**
 * Gestiona las consultas y el registro de usuarios en MariaDB.
 */
public class UsuarioDAO {

    /**
     * Busca una cuenta por su nombre de usuario. Devuelve null si no existe.
     */
    public Usuario buscarPorNombreUsuario(String nombreUsuario) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session
                        -> session.createSelectionQuery(
                                "FROM Usuario WHERE nombreUsuario = :usuario",
                                Usuario.class)
                                .setParameter("usuario", nombreUsuario)
                                .uniqueResult()
                );
    }

    /**
     * Busca una cuenta por correo para detectar duplicados.
     */
    public Usuario buscarPorCorreo(String correo) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session
                        -> session.createSelectionQuery(
                                "FROM Usuario WHERE correo = :correo",
                                Usuario.class)
                                .setParameter("correo", correo)
                                .uniqueResult()
                );
    }

    /**
     * Comprueba que el rol exista antes de registrar una cuenta.
     */
    public boolean existeRol(Integer idRol) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session
                        -> session.createNativeQuery(
                                "SELECT id_rol FROM rol WHERE id_rol = :idRol",
                                Integer.class)
                                .setParameter("idRol", idRol)
                                .uniqueResult() != null
                );
    }

    /**
     * Guarda una cuenta y devuelve su identificador. La contraseña debe llegar
     * convertida en hash.
     */
    public Integer crear(Usuario usuario) {
        return HibernateUtil.getSessionFactory()
                .fromTransaction(session -> {
                    session.persist(usuario);
                    return usuario.getIdUsuario();
                });
    }
}
