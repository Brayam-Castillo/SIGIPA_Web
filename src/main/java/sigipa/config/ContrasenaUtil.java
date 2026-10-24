package sigipa.config;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Genera y verifica hashes de contraseñas.
 */
public final class ContrasenaUtil {

    private static final int ITERACIONES = 600_000;
    private static final int LONGITUD_BITS = 256;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private ContrasenaUtil() {
    }

    /**
     * Genera una sal aleatoria y devuelve el hash junto con sus parámetros.
     */
    public static String generarHash(String contrasena) {
        if (contrasena == null || contrasena.isEmpty()
                || contrasena.length() > 128) {
            throw new IllegalArgumentException(
                    "La contraseña debe tener entre 1 y 128 caracteres.");
        }

        byte[] sal = new byte[16];
        ALEATORIO.nextBytes(sal);

        byte[] hash = derivar(contrasena, sal);

        return "pbkdf2_sha256$" + ITERACIONES + "$"
                + Base64.getEncoder().encodeToString(sal) + "$"
                + Base64.getEncoder().encodeToString(hash);
    }

    /**
     * Comprueba una contraseña contra el hash almacenado. Rechaza valores de
     * demostración o formatos inválidos.
     */
    public static boolean verificar(String contrasena, String almacenado) {
        if (contrasena == null || contrasena.isEmpty()
                || contrasena.length() > 128
                || almacenado == null || almacenado.length() > 255) {
            return false;
        }

        String[] partes = almacenado.split("\\$", -1);

        if (partes.length != 4
                || !"pbkdf2_sha256".equals(partes[0])
                || !Integer.toString(ITERACIONES).equals(partes[1])) {
            return false;
        }

        try {
            byte[] sal = Base64.getDecoder().decode(partes[2]);
            byte[] hashEsperado = Base64.getDecoder().decode(partes[3]);

            if (sal.length != 16 || hashEsperado.length != 32) {
                return false;
            }

            byte[] hashCalculado = derivar(contrasena, sal);
            return MessageDigest.isEqual(hashEsperado, hashCalculado);

        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Aplica PBKDF2 y limpia las copias temporales de la contraseña.
     */
    private static byte[] derivar(String contrasena, byte[] sal) {
        char[] caracteres = contrasena.toCharArray();
        PBEKeySpec especificacion = new PBEKeySpec(
                caracteres, sal, ITERACIONES, LONGITUD_BITS);

        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                    .generateSecret(especificacion)
                    .getEncoded();

        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(
                    "No se pudo procesar la contraseña.", e);

        } finally {
            especificacion.clearPassword();
            Arrays.fill(caracteres, '\0');
        }
    }
}
