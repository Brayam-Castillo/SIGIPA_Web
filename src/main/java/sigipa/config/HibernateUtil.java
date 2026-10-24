package sigipa.config;

import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import sigipa.modelo.Inventario;
import sigipa.modelo.Usuario;

/**
 * Inicializa Hibernate y proporciona acceso a sus sesiones.
 */
public final class HibernateUtil {

    // Lee hibernate.properties y registra las entidades.
    private static final SessionFactory SESSION_FACTORY
            = new Configuration()
                    .addAnnotatedClass(Inventario.class)
                    .addAnnotatedClass(Usuario.class)
                    .buildSessionFactory();

    private HibernateUtil() {
    }

    public static SessionFactory getSessionFactory() {
        return SESSION_FACTORY;
    }

    /**
     * Libera los recursos de Hibernate al finalizar la aplicación.
     */
    public static void cerrar() {
        if (!SESSION_FACTORY.isClosed()) {
            SESSION_FACTORY.close();
        }
    }
}
