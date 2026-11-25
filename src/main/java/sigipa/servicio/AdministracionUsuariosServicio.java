package sigipa.servicio;

import java.util.List;
import sigipa.config.ContrasenaUtil;
import sigipa.dao.AdministracionUsuariosDAO;
import sigipa.dao.AdministracionUsuariosDAO.Fila;

public class AdministracionUsuariosServicio {
    private final AdministracionUsuariosDAO dao = new AdministracionUsuariosDAO();

    public List<Fila> listar() {
        return dao.listar();
    }

    public void editar(int id, String nombre, String usuario, String correo) {
        nombre = nombre == null ? "" : nombre.trim();
        usuario = usuario == null ? "" : usuario.trim();
        correo = correo == null ? "" : correo.trim();
        if (nombre.isBlank() || nombre.length() > 50)
            throw new IllegalArgumentException("Escriba un nombre de hasta 50 caracteres.");
        if (!usuario.matches("[A-Za-z0-9._-]{3,50}"))
            throw new IllegalArgumentException("Revise el nombre de usuario (3 a 50 caracteres).");
        if (correo.length() > 80 || !correo.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw new IllegalArgumentException("Escriba un correo válido de hasta 80 caracteres.");
        dao.editar(id, nombre, usuario, correo);
    }

    public void cambiarClave(int id, String clave) {
        if (clave == null || clave.isBlank() || clave.length() < 8 || clave.length() > 128)
            throw new IllegalArgumentException("La contraseña debe tener entre 8 y 128 caracteres.");
        dao.cambiarClave(id, ContrasenaUtil.generarHash(clave));
    }

    public void borrar(int id, int solicitante) {
        if (id == solicitante)
            throw new IllegalArgumentException("No puede borrar su propia cuenta durante la sesión.");
        dao.borrar(id);
    }
}

