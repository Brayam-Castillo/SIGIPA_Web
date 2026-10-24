package sigipa.config;

/**
 * Prueba local de la protección de contraseñas.
 */
public class PruebaContrasena {

    public static void main(String[] args) {
        String clave = "ClaveDePrueba2026!";
        String hash = ContrasenaUtil.generarHash(clave);

        System.out.println("Clave correcta: "
                + ContrasenaUtil.verificar(clave, hash));

        System.out.println("Clave incorrecta: "
                + ContrasenaUtil.verificar("OtraClave", hash));

        System.out.println("Hashes diferentes: "
                + !hash.equals(ContrasenaUtil.generarHash(clave)));

        System.out.println("Valor demo aceptado: "
                + ContrasenaUtil.verificar(
                        clave, "NO_VALIDO_SOLO_DATOS_DEMO"));
    }
}
