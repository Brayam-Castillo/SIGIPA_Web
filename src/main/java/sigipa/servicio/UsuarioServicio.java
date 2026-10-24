package sigipa.servicio;

import sigipa.config.ContrasenaUtil;
import sigipa.dao.UsuarioDAO;
import sigipa.modelo.Usuario;

/**
 * Aplica las validaciones del registro y la autenticación.
 */
public class UsuarioServicio {

    private final UsuarioDAO usuarioDAO = new UsuarioDAO();

    /**
     * Registra una cuenta. idRolSesion debe proceder de la sesión del servidor.
     */
    public Integer registrar(
            String nombre,
            String nombreUsuario,
            String correo,
            String contrasena,
            Integer idRol,
            Integer idRolSesion) {

        // Solo el administrador puede registrar cuentas.
        if (idRolSesion == null || idRolSesion != 1) {
            throw new SecurityException(
                    "Solo el administrador puede registrar usuarios.");
        }

        nombre = validarTexto(nombre, "El nombre", 50);
        nombreUsuario = validarTexto(
                nombreUsuario, "El nombre de usuario", 50);
        correo = validarTexto(correo, "El correo", 80);

        // Regla propuesta: entre 3 y 50 caracteres sencillos.
        if (!nombreUsuario.matches("[A-Za-z0-9._-]{3,50}")) {
            throw new IllegalArgumentException(
                    "El usuario debe tener entre 3 y 50 caracteres: "
                    + "letras sin tilde, números, punto, guion o guion bajo.");
        }

        if (!correo.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new IllegalArgumentException(
                    "El correo no tiene un formato válido.");
        }

        // La contraseña se conserva tal como fue escrita, sin trim().
        if (contrasena == null || contrasena.isBlank()
                || contrasena.length() < 8
                || contrasena.length() > 128) {
            throw new IllegalArgumentException(
                    "La contraseña debe tener entre 8 y 128 caracteres "
                    + "y no puede contener únicamente espacios.");
        }

        if (idRol == null || !usuarioDAO.existeRol(idRol)) {
            throw new IllegalArgumentException(
                    "El rol seleccionado no existe.");
        }

        if (usuarioDAO.buscarPorNombreUsuario(nombreUsuario) != null) {
            throw new IllegalArgumentException(
                    "El nombre de usuario ya está registrado.");
        }

        if (usuarioDAO.buscarPorCorreo(correo) != null) {
            throw new IllegalArgumentException(
                    "El correo ya está registrado.");
        }

        Usuario nuevo = new Usuario();
        nuevo.setNombre(nombre);
        nuevo.setNombreUsuario(nombreUsuario);
        nuevo.setCorreo(correo);
        nuevo.setContrasena(
                ContrasenaUtil.generarHash(contrasena));
        nuevo.setIdRol(idRol);

        return usuarioDAO.crear(nuevo);
    }

    /**
     * Comprueba el usuario y la contraseña. Devuelve la cuenta si las
     * credenciales son correctas.
     */
    public Usuario autenticar(String nombreUsuario, String contrasena) {
        if (nombreUsuario == null
                || nombreUsuario.trim().isEmpty()
                || nombreUsuario.trim().length() > 50
                || contrasena == null
                || contrasena.isEmpty()
                || contrasena.length() > 128) {
            throw new SecurityException(
                    "Usuario o contraseña incorrectos.");
        }

        Usuario usuario = usuarioDAO.buscarPorNombreUsuario(
                nombreUsuario.trim());

        if (usuario == null
                || !ContrasenaUtil.verificar(
                        contrasena, usuario.getContrasena())) {
            throw new SecurityException(
                    "Usuario o contraseña incorrectos.");
        }

        return usuario;
    }

    /**
     * Comprueba campos obligatorios y longitudes.
     */
    private String validarTexto(String valor, String campo, int maximo) {
        if (valor == null || valor.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    campo + " es obligatorio.");
        }

        String limpio = valor.trim();

        if (limpio.length() > maximo) {
            throw new IllegalArgumentException(
                    campo + " no puede superar "
                    + maximo + " caracteres.");
        }

        return limpio;
    }
}
