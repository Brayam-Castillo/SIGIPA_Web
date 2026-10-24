package sigipa.config;

import java.util.Arrays;
import javax.swing.JOptionPane;
import javax.swing.JPasswordField;
import org.hibernate.SessionFactory;
import sigipa.modelo.Usuario;

/**
 * Preparación local de la contraseña del administrador inicial. Se ejecuta como
 * archivo Java desde NetBeans.
 */
public class PrepararAdministrador {

    public static void main(String[] args) {
        JPasswordField campo = new JPasswordField(20);

        int opcion = JOptionPane.showConfirmDialog(
                null,
                campo,
                "Escribe la nueva contraseña de admin",
                JOptionPane.OK_CANCEL_OPTION,
                JOptionPane.PLAIN_MESSAGE);

        if (opcion != JOptionPane.OK_OPTION) {
            System.out.println("Operación cancelada.");
            return;
        }

        char[] caracteres = campo.getPassword();
        campo.setText("");

        try {
            String contrasena = new String(caracteres);

            if (contrasena.isBlank()
                    || contrasena.length() < 8
                    || contrasena.length() > 128) {
                System.out.println(
                        "La contraseña debe tener entre 8 y 128 caracteres "
                        + "y no puede contener únicamente espacios.");
                return;
            }

            // Convierte la contraseña antes de guardarla.
            String hash = ContrasenaUtil.generarHash(contrasena);

            SessionFactory fabrica
                    = HibernateUtil.getSessionFactory();

            try {
                String nombreUsuario
                        = fabrica.fromTransaction(session -> {
                            Usuario admin
                                    = session.get(Usuario.class, 1);

                            if (admin == null
                                    || !Integer.valueOf(1)
                                            .equals(admin.getIdRol())) {
                                throw new IllegalStateException(
                                        "No existe el administrador "
                                        + "esperado con ID 1.");
                            }

                            admin.setContrasena(hash);

                            // Hibernate guarda el cambio al confirmar
                            // la transacción.
                            return admin.getNombreUsuario();
                        });

                System.out.println(
                        "Contraseña actualizada para: " + nombreUsuario);

            } finally {
                HibernateUtil.cerrar();
            }

        } finally {
            Arrays.fill(caracteres, '\0');
        }
    }
}
