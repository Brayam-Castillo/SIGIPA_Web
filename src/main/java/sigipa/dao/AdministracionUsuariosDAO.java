package sigipa.dao;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.function.Consumer;
import sigipa.config.HibernateUtil;
import sigipa.modelo.Usuario;

public class AdministracionUsuariosDAO {
    public static final class Fila {
        private final Integer id, rol;
        private final String nombre, usuario, correo;

        public Fila(Integer id, String nombre, String usuario, String correo, Integer rol) {
            this.id = id;
            this.nombre = nombre;
            this.usuario = usuario;
            this.correo = correo;
            this.rol = rol;
        }
    }

    public List<Fila> listar() {
        return HibernateUtil.getSessionFactory().fromTransaction(s ->
            s.createSelectionQuery("select u.idUsuario, u.nombre, u.nombreUsuario, u.correo, u.idRol "
                + "from Usuario u order by u.nombreUsuario", Fila.class).getResultList());
    }

    private void modificar(int id, Consumer<Usuario> cambio) {
        HibernateUtil.getSessionFactory().inTransaction(s -> {
            Usuario cuenta = s.find(Usuario.class, id, LockModeType.PESSIMISTIC_WRITE);
            if (cuenta == null) throw new NoSuchElementException();
            cambio.accept(cuenta);
        });
    }

    public void editar(int id, String nombre, String usuario, String correo) {
        modificar(id, cuenta -> {
            cuenta.setNombre(nombre);
            cuenta.setNombreUsuario(usuario);
            cuenta.setCorreo(correo);
        });
    }

    public void cambiarClave(int id, String hash) {
        modificar(id, cuenta -> cuenta.setContrasena(hash));
    }

    public void borrar(int id) {
        HibernateUtil.getSessionFactory().inTransaction(s -> {
            Usuario cuenta = s.find(Usuario.class, id, LockModeType.PESSIMISTIC_WRITE);
            if (cuenta == null) throw new NoSuchElementException();
            s.remove(cuenta);
        });
    }
}
